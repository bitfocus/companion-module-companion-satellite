import { InstanceBase, runEntrypoint, InstanceStatus, SomeCompanionConfigField } from '@companion-module/base'
import { GetConfigFields, type ModuleConfig } from './config.js'
import { UpdateVariableDefinitions } from './variables.js'
import { UpgradeScripts } from './upgrades.js'
import { UpdateActions } from './actions.js'
import { UpdateFeedbacks } from './feedbacks.js'
import { CompanionSatelliteClient } from './client.js'
import { GetPresets } from './presets.js'

// Validate config and update derived values
function validateConfig(config: ModuleConfig): ModuleConfig {
	return {
		...config,
		rows: typeof config.rows === 'number' ? config.rows : 4,
		columns: typeof config.columns === 'number' ? config.columns : 8,
	}
}

export class ModuleInstance extends InstanceBase<ModuleConfig> {
	config!: ModuleConfig // Setup in init()
	client?: CompanionSatelliteClient
	deviceId = 'companion-satellite'
	buttonImages: { [key: number]: Buffer } = {}

	constructor(internal: unknown) {
		super(internal)
	}

	async init(config: ModuleConfig): Promise<void> {
		this.updateStatus(InstanceStatus.Connecting)

		await this.configUpdated(config)
	}

	async destroy(): Promise<void> {
		if (this.client) {
			this.client.disconnect()
			this.client.removeAllListeners()
			this.client = undefined
		}
	}

	async configUpdated(config: ModuleConfig): Promise<void> {
		this.config = validateConfig(config)

		this.initClient()

		this.updateActions() // export actions
		this.updateFeedbacks() // export feedbacks
		this.updateVariableDefinitions() // export variable definitions
		this.updatePresets() // export presets
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
			this.updateStatus(InstanceStatus.Ok)
			this.updateVariables()

			// Register our device when connected
			this.registerSatelliteDevice()
		})

		this.client.on('connecting', () => {
			this.updateStatus(InstanceStatus.Connecting)
		})

		this.client.on('disconnected', () => {
			this.updateStatus(InstanceStatus.Disconnected)
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

		this.client.on('lockedState', () => {
			// TODO - handle this
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

		this.client.addDevice(this.deviceId, 'Companion Satellite', {
			columnCount: this.config.columns,
			rowCount: this.config.rows,
			bitmapSize: 72 * 4, // TODO - customisable?
			colours: false,
			text: false,
			brightness: false,
			pincodeMap: { type: 'custom' },
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
