import type { ModuleInstance } from './main.js'
import { ComposeActionDefinitions } from '@companion-module/base'

export function UpdateActions(instance: ModuleInstance): void {
	const actions: ComposeActionDefinitions = {
		keyEvent: {
			name: 'Button Event',
			options: [
				{
					id: 'row',
					type: 'number',
					label: 'Row',
					default: 0,
					min: 0,
					max: instance.config.rows - 1 || 7,
				},
				{
					id: 'column',
					type: 'number',
					label: 'Column',
					default: 0,
					min: 0,
					max: instance.config.columns - 1 || 7,
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

				switch (eventType) {
					case 'press':
						instance.client.keyDownXY(instance.deviceId, column, row)
						break
					case 'release':
						instance.client.keyUpXY(instance.deviceId, column, row)
						break
					case 'rotate-left':
						instance.client.rotateLeftXY(instance.deviceId, column, row)
						break
					case 'rotate-right':
						instance.client.rotateRightXY(instance.deviceId, column, row)
						break
				}
			},
		},
	}

	instance.setActionDefinitions(actions)
}
