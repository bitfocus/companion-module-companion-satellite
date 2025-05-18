import { combineRgb, CompanionPresetDefinitions } from '@companion-module/base'
import type { ModuleInstance } from './main.js'

export function GetPresets(instance: ModuleInstance): CompanionPresetDefinitions {
	const presets: CompanionPresetDefinitions = {}

	// Use the configured row and column count, or default to 8x4
	const columnCount = typeof instance.config.columns === 'number' ? instance.config.columns : 8
	const rowCount = typeof instance.config.rows === 'number' ? instance.config.rows : 4

	const totalButtons = columnCount * rowCount

	for (let i = 0; i < totalButtons; i++) {
		const row = Math.floor(i / columnCount)
		const column = i % columnCount

		presets[`button_${row}_${column}`] = {
			type: 'button',
			category: 'Buttons',
			name: `Button ${row}/${column}`,
			style: {
				text: `${row}/${column}`,
				size: 'auto',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			feedbacks: [
				{
					feedbackId: 'buttonImage',
					options: {
						row: row,
						column: column,
					},
				},
			],
			steps: [
				{
					down: [
						{
							actionId: 'keyEvent',
							options: {
								row: row,
								column: column,
								eventType: 'press',
							},
						},
					],
					up: [
						{
							actionId: 'keyEvent',
							options: {
								row: row,
								column: column,
								eventType: 'release',
							},
						},
					],
				},
			],
		}
	}

	return presets
}
