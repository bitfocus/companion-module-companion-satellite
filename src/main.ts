import { InstanceBase, runEntrypoint, InstanceStatus, SomeCompanionConfigField } from '@companion-module/base'
import { GetConfigFields, type ModuleConfig } from './config.js'
import { UpdateVariableDefinitions } from './variables.js'
import { UpgradeScripts } from './upgrades.js'
import { UpdateActions } from './actions.js'
import { UpdateFeedbacks } from './feedbacks.js'
import { CompanionSatelliteClient } from './client.js'
import { GetPresets } from './presets.js'

export class ModuleInstance extends InstanceBase<ModuleConfig> {
	config!: ModuleConfig // Setup in init()
	client?: CompanionSatelliteClient
	deviceId = 'companion-satellite'
	buttonImages: { [key: number]: Buffer } = {}

	constructor(internal: unknown) {
		super(internal)
	}

	async init(config: ModuleConfig): Promise<void> {
		this.config = config
		this.updateStatus(InstanceStatus.Disconnected, 'Connecting...')

		this.initClient()

		this.updateActions() // export actions
		this.updateFeedbacks() // export feedbacks
		this.updateVariableDefinitions() // export variable definitions
		this.updatePresets() // export presets
	}

	async destroy(): Promise<void> {
		if (this.client) {
			this.client.disconnect()
			this.client.removeAllListeners()
			this.client = undefined
		}
	}

	async configUpdated(config: ModuleConfig): Promise<void> {
		const hadConfig = this.config !== undefined
		this.config = config

		if (hadConfig) {
			await this.destroy()
			await this.init(config)
		}
	}

	// Return config fields for web config
	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields()
	}

	updateActions(): void {
		UpdateActions(this)
	}

	updateFeedbacks(): void {
		UpdateFeedbacks(this)
	}

	updateVariableDefinitions(): void {
		UpdateVariableDefinitions(this)
	}

	updatePresets(): void {
		const presets = GetPresets(this)
		this.setPresetDefinitions(presets)
	}

	initClient(): void {
		if (this.client) {
			this.client.disconnect()
			this.client.removeAllListeners()
			this.client = undefined
		}

		if (!this.config.host) {
			this.updateStatus(InstanceStatus.BadConfig, 'Missing host address')
			return
		}

		// Create a new client
		this.client = new CompanionSatelliteClient({ debug: true })

		// Set up the event handlers
		this.client.on('error', (err) => {
			this.log('error', `Connection error: ${err}`)
		})

		this.client.on('log', (msg) => {
			this.log('debug', `Client: ${msg}`)
		})

		this.client.on('connected', () => {
			this.updateStatus(InstanceStatus.Ok, 'Connected')
			this.updateVariables()

			// Register our device when connected
			this.registerSatelliteDevice()
		})

		this.client.on('connecting', () => {
			this.updateStatus(InstanceStatus.Connecting, 'Connecting...')
		})

		this.client.on('disconnected', () => {
			this.updateStatus(InstanceStatus.Disconnected, 'Disconnected')
			this.updateVariables()
		})

		// Handle button events
		this.client.on('draw', (props) => {
			if (props.deviceId === this.deviceId && props.image) {
				const keyIndex = props.keyIndex
				this.buttonImages[keyIndex] = props.image
				this.checkFeedbacks('buttonImage')
			}
		})

		this.client.on('clearDeck', () => {
			this.buttonImages = {}
			this.checkFeedbacks('buttonImage')
		})

		// Connect to the remote Companion instance
		this.client
			.connect({
				mode: 'tcp',
				host: this.config.host,
				port: this.config.port,
			})
			.catch((error) => {
				this.log('error', `Failed to connect: ${error.message}`)
			})
	}

	// Register this satellite device with the remote Companion
	registerSatelliteDevice(): void {
		if (!this.client) return

		// Use the configured row and column count, or default to 8x4
		const columnCount = typeof this.config.columns === 'number' ? this.config.columns : 8
		const rowCount = typeof this.config.rows === 'number' ? this.config.rows : 4

		this.client.addDevice(this.deviceId, 'Companion Satellite', {
			columnCount: columnCount,
			rowCount: rowCount,
			bitmapSize: 72,
			colours: true,
			text: true,
			brightness: true,
		})
	}
	// Update module variables based on connection state
	updateVariables(): void {
		const variables = {
			connection_state: this.client?.connected ? 'Connected' : 'Disconnected',
			companion_version: this.client?.companionVersion || 'Unknown',
			companion_api_version: this.client?.companionApiVersion || 'Unknown',
			target_address: this.client?.displayHost || this.config.host || 'Not configured',
		}

		this.setVariableValues(variables)
	}
}

runEntrypoint(ModuleInstance, UpgradeScripts)
