import type { ModuleInstance } from './main.js'
import { ComposeActionDefinitions } from '@companion-module/base'

export function UpdateActions(instance: ModuleInstance): void {
	// Determine max rows and columns based on config
	const maxRow = typeof instance.config.rows === 'number' ? instance.config.rows - 1 : 7
	const maxCol = typeof instance.config.columns === 'number' ? instance.config.columns - 1 : 7

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
					max: maxRow,
				},
				{
					id: 'column',
					type: 'number',
					label: 'Column',
					default: 0,
					min: 0,
					max: maxCol,
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

				// Validate row and column are within allowed range
				const maxRow = typeof instance.config.rows === 'number' ? instance.config.rows - 1 : 7
				const maxCol = typeof instance.config.columns === 'number' ? instance.config.columns - 1 : 7

				if (row < 0 || row > maxRow || column < 0 || column > maxCol) {
					instance.log(
						'warn',
						`Invalid button coordinates: row=${row}, column=${column}. Valid range is: row=0-${maxRow}, column=0-${maxCol}`,
					)
					return
				}

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
