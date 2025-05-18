import type { ModuleInstance } from './main.js'
import { ComposeAdvancedFeedbackDefinitions } from '@companion-module/base'

export function UpdateFeedbacks(instance: ModuleInstance): void {
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
			],
			callback: (feedback) => {
				const row = Number(feedback.options.row)
				const column = Number(feedback.options.column)

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
