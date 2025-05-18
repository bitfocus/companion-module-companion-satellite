import type { ModuleInstance } from './main.js'
import { ComposeAdvancedFeedbackDefinitions } from '@companion-module/base'

export function UpdateFeedbacks(instance: ModuleInstance): void {
	// Determine max rows and columns based on config
	const maxRow = typeof instance.config.rows === 'number' ? instance.config.rows - 1 : 7
	const maxCol = typeof instance.config.columns === 'number' ? instance.config.columns - 1 : 7

	const feedbacks: ComposeAdvancedFeedbackDefinitions = {
		buttonImage: {
			type: 'advanced',
			name: 'Button Image',
			description: 'Shows the image from the connected Companion button',
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
			],
			callback: (feedback: { options: { row: number | string; column: number | string } }) => {
				const row = Number(feedback.options.row)
				const column = Number(feedback.options.column)

				// Validate row and column are within allowed range
				const maxRow = typeof instance.config.rows === 'number' ? instance.config.rows - 1 : 7
				const maxCol = typeof instance.config.columns === 'number' ? instance.config.columns - 1 : 7

				if (row < 0 || row > maxRow || column < 0 || column > maxCol) {
					instance.log(
						'warn',
						`Invalid button coordinates in feedback: row=${row}, column=${column}. Valid range is: row=0-${maxRow}, column=0-${maxCol}`,
					)
					return {}
				}

				// Calculate the keyIndex from row and column
				const keyIndex = row * (instance.config.columns || 8) + column

				if (instance.buttonImages[keyIndex]) {
					return {
						imageBuffer: instance.buttonImages[keyIndex],
					}
				}

				return {}
			},
		},
	}

	instance.setFeedbackDefinitions(feedbacks)
}
