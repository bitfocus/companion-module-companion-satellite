import type { ModuleInstance } from './main.js'
import { CompanionActionDefinitions } from '@companion-module/base'

export function UpdateActions(instance: ModuleInstance): void {
	const actions: CompanionActionDefinitions = {
		keyEvent: {
			name: 'Button Event',
			options: [
				{
					id: 'location',
					type: 'textinput',
					label: 'Location (row/column)',
					default: '0/0',
					regex: '/^\\d+\\/\\d+$/',
					useVariables: { local: true },
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
			callback: async (event, context) => {
				if (!instance.client || !instance.client.connected) {
					return
				}

				// Parse the location string (format: row/column) with variable parsing
				const locationStr = (await context.parseVariablesInString(String(event.options.location))).trim()

				// Check if the string matches the expected format
				const locationRegex = /^(\d+)\/(\d+)$/
				const match = locationStr.match(locationRegex)

				if (!match) {
					instance.log('warn', `Invalid button coordinates format: ${locationStr}. Expected format: row/column`)
					return
				}

				const row = Number(match[1])
				const column = Number(match[2])
				const eventType = String(event.options.eventType)

				// Validate row and column are within allowed range using the instance properties
				if (row < 0 || row >= instance.config.rows || column < 0 || column >= instance.config.columns) {
					instance.log('warn', `Invalid button coordinates: ${locationStr}`)
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
