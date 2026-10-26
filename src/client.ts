import { EventEmitter } from 'events'
import {
	ClientCapabilities,
	CompanionClient,
	DeviceRegisterProps,
	SurfaceProxyDrawProps,
	assertNever,
	DEFAULT_TCP_PORT,
} from './client-types.js'
import {
	formatSatelliteMessage,
	parseLineParameters,
	SatelliteLineBuffer,
	splitSatelliteCommand,
	type ParsedParams,
	type SatelliteMessageArgs,
} from '@companion-app/satellite-protocol/codec'
import { MAX_LINE_LENGTH } from '@companion-app/satellite-protocol/constants'
import { isApiVersionAtLeast, SATELLITE_FEATURES } from '@companion-app/satellite-protocol/versions'
import {
	CompanionSatelliteTcpClient,
	CompanionSatelliteWsClient,
	formatConnectionUrl,
	ICompanionSatelliteClient,
	ICompanionSatelliteClientOptions,
	SomeConnectionDetails,
} from './client-implementations.js'

/**
 * This implementation is derived from the companion-satellite project
 */

const PING_UNACKED_LIMIT = 15 // Arbitrary number
const PING_IDLE_TIMEOUT = 1000 // Pings are allowed to be late if another packet has been received recently
const PING_INTERVAL = 100
const RECONNECT_DELAY = 1000
const RECONNECT_DELAY_UNSUPPORTED = 30000

const MINIMUM_PROTOCOL_VERSION = '1.7.0' // Companion 3.4

export interface CompanionSatelliteClientOptions {
	debug?: boolean
}

export type CompanionSatelliteClientEvents = {
	error: [Error]
	log: [string]
	connected: []
	connecting: []
	disconnected: []

	draw: [SurfaceProxyDrawProps]
	brightness: [{ deviceId: string; percent: number }]
	newDevice: [{ deviceId: string }]
	clearDeck: [{ deviceId: string }]
	variableValue: [{ deviceId: string; name: string; value: string }]
	lockedState: [{ deviceId: string; locked: boolean; characterCount: number }]
	deviceErrored: [{ deviceId: string; message: string }]
}

export class CompanionSatelliteClient extends EventEmitter<CompanionSatelliteClientEvents> implements CompanionClient {
	private readonly debug: boolean
	private socket: ICompanionSatelliteClient | undefined

	private readonly receiveBuffer = new SatelliteLineBuffer(MAX_LINE_LENGTH)

	private _pingInterval: NodeJS.Timeout | undefined
	private _pingUnackedCount = 0
	private _lastReceivedAt = 0
	private _connected = false
	private _connectionActive = false // True when connected/connecting/reconnecting
	private _retryConnectTimeout: NodeJS.Timeout | undefined = undefined
	private _connectionDetails: SomeConnectionDetails = { mode: 'tcp', host: '', port: DEFAULT_TCP_PORT }

	private _registeredDevices = new Set<string>()
	private _pendingDevices = new Map<string, number>() // Time submitted

	private _companionVersion: string | null = null
	private _companionApiVersion: string | null = null
	private _companionUnsupported = false

	private _supportsLocalLockState = false

	public get connectionDetails(): SomeConnectionDetails {
		return this._connectionDetails
	}
	public get connected(): boolean {
		return this._connected
	}
	public get companionVersion(): string | null {
		return this._companionVersion
	}
	public get companionApiVersion(): string | null {
		return this._companionApiVersion
	}
	public get companionUnsupported(): boolean {
		return this._companionUnsupported
	}

	public get supportsLocalLockState(): boolean {
		return this._supportsLocalLockState
	}

	public get displayHost(): string {
		switch (this._connectionDetails.mode) {
			case 'tcp':
				return this._connectionDetails.host
			case 'ws':
				try {
					const url = new URL(this._connectionDetails.url)
					return url.hostname
				} catch (_e) {
					return this._connectionDetails.url
				}
			default:
				assertNever(this._connectionDetails)
				return ''
		}
	}

	public get capabilities(): ClientCapabilities {
		return {
			// For future use
		}
	}

	constructor(options: CompanionSatelliteClientOptions = {}) {
		super()

		this.debug = !!options.debug

		this.initSocket()
	}

	private initSocket(): void {
		if (this.socket) {
			this.socket.destroy()
			this.socket = undefined
		}

		if (!this._connectionDetails) {
			this.emit('log', `Missing connection details`)
			return
		}

		// A socket which has since been replaced by another must not affect the current connection
		const isReplaced = () => this.socket !== undefined && this.socket !== socket

		const socketOptions: ICompanionSatelliteClientOptions = {
			onError: (e) => {
				this.emit('error', e)
			},
			onClose: () => {
				if (isReplaced()) return

				if (this.debug) {
					this.emit('log', 'Connection closed')
				}

				this._registeredDevices.clear()
				this._pendingDevices.clear()

				if (this._connected) {
					this.emit('disconnected')
				} else {
					this._companionUnsupported = false
				}
				this._connected = false
				this.receiveBuffer.clear()

				if (this._pingInterval) {
					clearInterval(this._pingInterval)
					this._pingInterval = undefined
				}

				if (!this._retryConnectTimeout && this.socket === socket) {
					this._retryConnectTimeout = setTimeout(
						() => {
							this._retryConnectTimeout = undefined
							this.emit('log', 'Trying reconnect')
							this.initSocket()
						},
						this._companionUnsupported ? RECONNECT_DELAY_UNSUPPORTED : RECONNECT_DELAY,
					)
				}
			},
			onData: (d) => {
				if (!isReplaced()) this._handleReceivedData(d)
			},
			onConnect: () => {
				if (isReplaced()) return

				if (this.debug) {
					this.emit('log', 'Connected')
				}

				this._registeredDevices.clear()
				this._pendingDevices.clear()

				this._connected = true
				this._pingUnackedCount = 0
				this.receiveBuffer.clear()

				if (!this._pingInterval) {
					this._pingInterval = setInterval(() => this.sendPing(), PING_INTERVAL)
				}

				if (!this.socket) {
					// should never hit, but just in case
					this.disconnect()
					return
				}

				// 'connected' gets emitted once we receive 'Begin'
			},
		}

		let socket: ICompanionSatelliteClient
		switch (this._connectionDetails.mode) {
			case 'tcp':
				socket = new CompanionSatelliteTcpClient(socketOptions, this._connectionDetails)
				break
			case 'ws':
				socket = new CompanionSatelliteWsClient(socketOptions, this._connectionDetails)
				break
			default:
				assertNever(this._connectionDetails)
				this.socket = undefined
				throw new Error('Invalid connection mode')
		}
		this.socket = socket

		this.emit('log', `Connecting to ${formatConnectionUrl(this._connectionDetails)}`)
	}

	private sendPing(): void {
		if (this._connected && this.socket) {
			if (this._pingUnackedCount > PING_UNACKED_LIMIT && this._lastReceivedAt <= Date.now() - PING_IDLE_TIMEOUT) {
				// Ping was never acked, so it looks like a timeout
				this.emit('log', 'ping timeout')
				try {
					this.socket.destroy()
				} catch (_e) {
					// ignore
				}
				return
			}

			this._pingUnackedCount++
			this.socket.write('PING\n')
		}
	}

	public async connect(details: SomeConnectionDetails): Promise<void> {
		if (this._connected || this._connectionActive) {
			this.disconnect()
		}
		this._connectionActive = true

		setImmediate(() => {
			this.emit('connecting')
		})

		this._connectionDetails = { ...details }

		this.initSocket()
	}

	public disconnect(): void {
		this._connectionActive = false
		if (this._retryConnectTimeout) {
			clearTimeout(this._retryConnectTimeout)
			delete this._retryConnectTimeout
		}

		if (this._pingInterval) {
			clearInterval(this._pingInterval)
			delete this._pingInterval
		}

		if (!this._connected) {
			return
		}

		try {
			this.socket?.end()
			this.socket = undefined
		} catch (e) {
			this.socket = undefined
			throw e
		}
	}

	private _handleReceivedData(data: string): void {
		this._lastReceivedAt = Date.now()

		const { lines, overflow } = this.receiveBuffer.push(data)
		for (const line of lines) {
			this.handleCommand(line)
		}

		if (overflow) {
			this.emit('log', 'Received line exceeded maximum length, dropping connection')
			this.socket?.destroy()
		}
	}

	private handleCommand(line: string): void {
		const { command: cmd, body } = splitSatelliteCommand(line)
		const params = parseLineParameters(body)

		switch (cmd.toUpperCase()) {
			case 'PING':
				this.socket?.write(`PONG ${body}\n`)
				break
			case 'PONG':
				// console.log('Got pong')
				this._pingUnackedCount = 0
				break
			case 'KEY-STATE':
				this.handleState(params)
				break
			case 'KEYS-CLEAR':
				this.handleClear(params)
				break
			case 'VARIABLE-VALUE':
				this.handleVariableValue(params)
				break
			case 'LOCKED-STATE':
				this.handleLockedState(params)
				break
			case 'BRIGHTNESS':
				this.handleBrightness(params)
				break
			case 'ADD-DEVICE':
				this.handleAddedDevice(params)
				break
			case 'REMOVE-DEVICE':
				console.log(`Removed device: ${body}`)
				break
			case 'BEGIN':
				console.log(`Connected to Companion: ${body}`)
				this.handleBegin(params)
				break
			case 'KEY-PRESS':
			case 'KEY-ROTATE':
			case 'SET-VARIABLE-VALUE':
			case 'PINCODE-KEY':
				// Ignore
				break
			default:
				console.log(`Received unhandled command: ${cmd} ${body}`)
				break
		}
	}

	private handleBegin(params: ParsedParams): void {
		this._companionVersion = typeof params.CompanionVersion === 'string' ? params.CompanionVersion : null
		this._companionApiVersion = typeof params.ApiVersion === 'string' ? params.ApiVersion : null

		// Check if the companion is supported
		this._companionUnsupported =
			!this._companionApiVersion || !isApiVersionAtLeast(this._companionApiVersion, MINIMUM_PROTOCOL_VERSION)
		if (this._companionUnsupported) {
			console.log(
				`Connected to unsupported Companion version. Companion ${this._companionVersion}, API ${this._companionApiVersion}`,
			)
			this.socket?.end()
			return
		}

		// Revive for future checks
		// const protocolVersion = params.ApiVersion
		// if (typeof protocolVersion === 'string') {
		// 	if (isApiVersionAtLeast(protocolVersion, '1.3.0')) {
		// 		this._supportsCombinedEncoders = true
		// 		console.log('Companion supports combined encoders')
		// 	}
		if (
			this._companionApiVersion &&
			isApiVersionAtLeast(this._companionApiVersion, SATELLITE_FEATURES.lockState.since)
		) {
			this._supportsLocalLockState = true
			console.log('Companion supports delegating locking drawing')
		}
		// }

		// report the connection as ready
		setImmediate(() => {
			this.emit('connected')
		})
	}

	private handleState(params: ParsedParams): void {
		if (typeof params.DEVICEID !== 'string') {
			console.log('Missing DEVICEID in KEY-DRAW response')
			return
		}
		if (typeof params.KEY !== 'string') {
			console.log('Missing KEY in KEY-DRAW response')
			return
		}

		const keyIndex = parseInt(params.KEY)
		if (isNaN(keyIndex)) {
			console.log('Bad KEY in KEY-DRAW response')
			return
		}

		const image = typeof params.BITMAP === 'string' ? Buffer.from(params.BITMAP, 'base64') : undefined
		const text = typeof params.TEXT === 'string' ? Buffer.from(params.TEXT, 'base64').toString() : undefined
		const color = typeof params.COLOR === 'string' ? params.COLOR : undefined

		this.emit('draw', { deviceId: params.DEVICEID, keyIndex, image, text, color })
	}
	private handleClear(params: ParsedParams): void {
		if (typeof params.DEVICEID !== 'string') {
			console.log('Mising DEVICEID in KEYS-CLEAR response')
			return
		}

		this.emit('clearDeck', { deviceId: params.DEVICEID })
	}
	private handleVariableValue(params: ParsedParams) {
		if (typeof params.DEVICEID !== 'string') {
			console.log('Mising DEVICEID in VARIABLE-VALUE response')
			return
		}
		if (typeof params.VARIABLE !== 'string') {
			console.log('Missing VARIABLE in VARIABLE-VALUE response')
			return
		}
		if (typeof params.VALUE !== 'string') {
			console.log('Missing VALUE in VARIABLE-VALUE response')
			return
		}

		this.emit('variableValue', {
			deviceId: params.DEVICEID,
			name: params.VARIABLE,
			value: Buffer.from(params.VALUE, 'base64').toString(),
		})
	}

	private handleLockedState(params: ParsedParams) {
		if (typeof params.DEVICEID !== 'string') {
			console.log('Mising DEVICEID in LOCKED-STATE response')
			return
		}
		if (typeof params.LOCKED !== 'string') {
			console.log('Missing LOCKED in LOCKED-STATE response')
			return
		}
		if (typeof params.CHARACTER_COUNT !== 'string') {
			console.log('Missing CHARACTER_COUNT in LOCKED-STATE response')
			return
		}

		this.emit('lockedState', {
			deviceId: params.DEVICEID,
			locked: params.LOCKED === '1',
			characterCount: Number(params.CHARACTER_COUNT),
		})
	}

	private handleBrightness(params: ParsedParams): void {
		if (typeof params.DEVICEID !== 'string') {
			console.log('Missing DEVICEID in BRIGHTNESS response')
			return
		}
		if (typeof params.VALUE !== 'string') {
			console.log('Missing VALUE in BRIGHTNESS response')
			return
		}
		const percent = parseInt(params.VALUE)
		if (isNaN(percent)) {
			console.log('Bad VALUE in BRIGHTNESS response')
			return
		}
		this.emit('brightness', { deviceId: params.DEVICEID, percent })
	}

	private handleAddedDevice(params: ParsedParams): void {
		if (!params.OK || params.ERROR) {
			console.log(`Add device failed: ${JSON.stringify(params)}`)
			if (typeof params.DEVICEID === 'string') {
				this.emit('deviceErrored', {
					deviceId: params.DEVICEID,
					message: `${params.MESSAGE || 'Unknown Error'}`,
				})
			}
			return
		}
		if (typeof params.DEVICEID !== 'string') {
			console.log('Missing DEVICEID in ADD-DEVICE response')
			return
		}

		this._registeredDevices.add(params.DEVICEID)
		this._pendingDevices.delete(params.DEVICEID)

		this.emit('newDevice', { deviceId: params.DEVICEID })
	}

	public keyDownXY(deviceId: string, x: number, y: number): void {
		if (this._connected && this.socket) {
			this.sendMessage('KEY-PRESS', null, deviceId, {
				KEY: `${y}/${x}`,
				PRESSED: true,
			})
		}
	}
	public keyUpXY(deviceId: string, x: number, y: number): void {
		if (this._connected && this.socket) {
			this.sendMessage('KEY-PRESS', null, deviceId, {
				KEY: `${y}/${x}`,
				PRESSED: false,
			})
		}
	}
	public rotateLeftXY(deviceId: string, x: number, y: number): void {
		if (this._connected && this.socket) {
			this.sendMessage('KEY-ROTATE', null, deviceId, {
				KEY: `${y}/${x}`,
				DIRECTION: -1,
			})
		}
	}
	public rotateRightXY(deviceId: string, x: number, y: number): void {
		if (this._connected && this.socket) {
			this.sendMessage('KEY-ROTATE', null, deviceId, {
				KEY: `${y}/${x}`,
				DIRECTION: 1,
			})
		}
	}
	public pincodeKey(deviceId: string, keyCode: number): void {
		if (this._connected && this.socket) {
			this.sendMessage('PINCODE-KEY', null, deviceId, {
				KEY: keyCode,
			})
		}
	}
	public sendVariableValue(deviceId: string, variable: string, value: string): void {
		if (this._connected && this.socket) {
			this.sendMessage('SET-VARIABLE-VALUE', null, deviceId, {
				VARIABLE: variable,
				VALUE: Buffer.from(value).toString('base64'),
			})
		}
	}

	public addDevice(deviceId: string, productName: string, props: DeviceRegisterProps): void {
		if (this._registeredDevices.has(deviceId)) {
			throw new Error('Device is already registered')
		}

		const pendingTime = this._pendingDevices.get(deviceId)
		if (pendingTime && pendingTime < Date.now() - 10000) {
			throw new Error('Device is already being added')
		}

		if (this._connected && this.socket) {
			this._pendingDevices.set(deviceId, Date.now())

			const transferVariables = Buffer.from(JSON.stringify(props.transferVariables ?? [])).toString('base64')

			this.sendMessage('ADD-DEVICE', null, deviceId, {
				PRODUCT_NAME: productName,
				KEYS_TOTAL: props.columnCount * props.rowCount,
				KEYS_PER_ROW: props.columnCount,
				BITMAPS: props.bitmapSize ?? 0,
				COLORS: props.colours,
				TEXT: props.text,
				VARIABLES: transferVariables,
				BRIGHTNESS: props.brightness,
				PINCODE_LOCK: props.pincodeMap ? 'FULL' : '',
			})
		}
	}

	public removeDevice(deviceId: string): void {
		if (this._connected && this.socket) {
			this._registeredDevices.delete(deviceId)
			this._pendingDevices.delete(deviceId)

			this.sendMessage('REMOVE-DEVICE', null, deviceId, {})
		}
	}

	private sendMessage(
		messageName: string,
		status: 'OK' | 'ERROR' | null,
		deviceId: string | null,
		args: SatelliteMessageArgs,
	): void {
		this.socket?.write(formatSatelliteMessage(messageName, status, deviceId, args))
	}
}
