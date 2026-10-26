import type { CompanionPresetDefinitions, CompanionPresetGroup, CompanionPresetSection } from '@companion-module/base'
import type { ModuleInstance, ModuleTypes } from './main.js'

export function GetPresets(instance: ModuleInstance): {
	structure: CompanionPresetSection<ModuleTypes>[]
	presets: CompanionPresetDefinitions<ModuleTypes>
} {
	const presets: CompanionPresetDefinitions<ModuleTypes> = {}
	const rows: CompanionPresetGroup<ModuleTypes>[] = []

	// Use the configured row and column count, or default to 8x4
	const columnCount = typeof instance.config.columns === 'number' ? instance.config.columns : 8
	const rowCount = typeof instance.config.rows === 'number' ? instance.config.rows : 4

	// Create presets for each row and column using nested loops
	for (let row = 0; row < rowCount; row++) {
		const rowPresets: string[] = []
		rows.push({ id: `row_${row}`, type: 'simple', name: `Row ${row}`, presets: rowPresets })

		for (let column = 0; column < columnCount; column++) {
			const presetId = `button_${row}_${column}`
			rowPresets.push(presetId)

			presets[presetId] = {
				type: 'simple',
				name: `Button ${row}/${column}`,
				style: {
					text: ``,
					size: 'auto',
					color: 0xffffff,
					bgcolor: 0x000000,
					show_topbar: false,
				},
				previewStyle: {
					// Show the coordinates in the preset for the ui
					text: `${row}/${column}`,
					size: 'auto',
					color: 0xffffff,
					bgcolor: 0x000000,
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

	return {
		structure: [{ id: 'buttons', name: 'Buttons', definitions: rows }],
		presets,
	}
}
