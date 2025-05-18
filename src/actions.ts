import type { ModuleInstance } from './main.js'
import { CompanionActionDefinitions } from '@companion-module/base'

export function UpdateActions(instance: ModuleInstance): void {
	const actions: CompanionActionDefinitions = {
		keyEvent: {
			name: 'Button Event',
			options: [
				{
					id: 'row',
					type: 'number',
					label: 'Row',
					default: 0,
					min: 0,
					max: instance.config.rows - 1,
				},
				{
					id: 'column',
					type: 'number',
					label: 'Column',
					default: 0,
					min: 0,
					max: instance.config.columns - 1,
				},
				{
					id: 'eventType',
					type: 'dropdown',
					label: 'Event Type',
					default: 'press',
					choices: [
						{ id: 'press', label: 'Press' },
						{ id: 'release', label: 'Release' },
						{ id: 'rotate-left', label: 'Rotate Left' },
						{ id: 'rotate-right', label: 'Rotate Right' },
					],
				},
			],
			callback: async (event) => {
				if (!instance.client || !instance.client.connected) {
					return
				}

				const row = Number(event.options.row)
				const column = Number(event.options.column)
				const eventType = String(event.options.eventType)

				// Validate row and column are within allowed range using the instance properties
				if (row < 0 || row >= instance.config.rows || column < 0 || column >= instance.config.columns) {
					instance.log('warn', `Invalid button coordinates: ${row}/${column}`)
					return
				}

				const deviceId = instance.satelliteDeviceId
				if (!deviceId) {
					instance.log('warn', 'No device ID found')
					return
				}

				switch (eventType) {
					case 'press':
						instance.client.keyDownXY(deviceId, column, row)
						break
					case 'release':
						instance.client.keyUpXY(deviceId, column, row)
						break
					case 'rotate-left':
						instance.client.rotateLeftXY(deviceId, column, row)
						break
					case 'rotate-right':
						instance.client.rotateRightXY(deviceId, column, row)
						break
					default:
						instance.log('warn', `Unhandled event type: ${eventType}`)
						break
				}
			},
		},
	}

	instance.setActionDefinitions(actions)
}
