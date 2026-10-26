import type { CompanionPresetDefinitions, CompanionPresetGroup, CompanionPresetSection } from '@companion-module/base'
import type { ModuleInstance, ModuleTypes } from './main.js'

const LOCATION_VARIABLE = 'location'

export function GetPresets(instance: ModuleInstance): {
	structure: CompanionPresetSection<ModuleTypes>[]
	presets: CompanionPresetDefinitions<ModuleTypes>
} {
	// Every button uses the same preset, with the location held in a local variable
	const location = `$(local:${LOCATION_VARIABLE})`
	const presets: CompanionPresetDefinitions<ModuleTypes> = {
		button: {
			type: 'simple',
			name: 'Button',
			style: {
				text: ``,
				size: 'auto',
				color: 0xffffff,
				bgcolor: 0x000000,
				show_topbar: false,
			},
			previewStyle: {
				// Show the coordinates in the preset for the ui
				text: location,
				size: 'auto',
				color: 0xffffff,
				bgcolor: 0x000000,
			},
			localVariables: [
				{
					variableType: 'simple',
					variableName: LOCATION_VARIABLE,
					startupValue: '0/0',
				},
			],
			feedbacks: [
				{
					feedbackId: 'buttonImage',
					options: { location },
				},
			],
			steps: [
				{
					down: [{ actionId: 'keyEvent', options: { location, eventType: 'press' } }],
					up: [{ actionId: 'keyEvent', options: { location, eventType: 'release' } }],
					rotate_left: [{ actionId: 'keyEvent', options: { location, eventType: 'rotate-left' } }],
					rotate_right: [{ actionId: 'keyEvent', options: { location, eventType: 'rotate-right' } }],
				},
			],
		},
	}

	// Use the configured row and column count, or default to 8x4
	const columnCount = typeof instance.config.columns === 'number' ? instance.config.columns : 8
	const rowCount = typeof instance.config.rows === 'number' ? instance.config.rows : 4

	// Generate a row of buttons from the template, setting the location of each
	const rows: CompanionPresetGroup<ModuleTypes>[] = []
	for (let row = 0; row < rowCount; row++) {
		rows.push({
			id: `row_${row}`,
			type: 'template',
			name: `Row ${row}`,
			presetId: 'button',
			templateVariableName: LOCATION_VARIABLE,
			templateValues: Array.from({ length: columnCount }, (_, column) => ({
				name: `Button ${row}/${column}`,
				value: `${row}/${column}`,
			})),
		})
	}

	return {
		structure: [{ id: 'buttons', name: 'Buttons', definitions: rows }],
		presets,
	}
}
