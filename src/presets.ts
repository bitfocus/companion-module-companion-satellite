import { combineRgb, CompanionPresetDefinitions } from '@companion-module/base'
import type { ModuleInstance } from './main.js'

export function GetPresets(instance: ModuleInstance): CompanionPresetDefinitions {
	const presets: CompanionPresetDefinitions = {}

	// Use the configured row and column count, or default to 8x4
	const columnCount = typeof instance.config.columns === 'number' ? instance.config.columns : 8
	const rowCount = typeof instance.config.rows === 'number' ? instance.config.rows : 4

	// Create presets for each row and column using nested loops
	for (let row = 0; row < rowCount; row++) {
		for (let column = 0; column < columnCount; column++) {
			presets[`button_${row}_${column}`] = {
				type: 'button',
				category: 'Buttons',
				name: `Button ${row}/${column}`,
				style: {
					text: ``,
					size: 'auto',
					color: combineRgb(255, 255, 255),
					bgcolor: combineRgb(0, 0, 0),
				},
				previewStyle: {
					// Show the coordinates in the preset for the ui
					text: `${row}/${column}`,
					size: 'auto',
					color: combineRgb(255, 255, 255),
					bgcolor: combineRgb(0, 0, 0),
				},
				feedbacks: [
					{
						feedbackId: 'buttonImage',
						options: {
							location: `${row}/${column}`,
						},
					},
				],
				steps: [
					{
						down: [
							{
								actionId: 'keyEvent',
								options: {
									location: `${row}/${column}`,
									eventType: 'press',
								},
							},
						],
						up: [
							{
								actionId: 'keyEvent',
								options: {
									location: `${row}/${column}`,
									eventType: 'release',
								},
							},
						],
						rotate_left: [
							{
								actionId: 'keyEvent',
								options: {
									location: `${row}/${column}`,
									eventType: 'rotate-left',
								},
							},
						],
						rotate_right: [
							{
								actionId: 'keyEvent',
								options: {
									location: `${row}/${column}`,
									eventType: 'rotate-right',
								},
							},
						],
					},
				],
			}
		}
	}

	return presets
}
