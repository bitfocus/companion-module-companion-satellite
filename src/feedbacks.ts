import type { ModuleInstance } from './main.js'
import { CompanionFeedbackDefinitions } from '@companion-module/base'

export function UpdateFeedbacks(instance: ModuleInstance): void {
	const feedbacks: CompanionFeedbackDefinitions = {
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
			],
			callback: (feedback) => {
				const row = Number(feedback.options.row)
				const column = Number(feedback.options.column)

				// Validate row and column are within allowed range using the instance properties
				if (row < 0 || row >= instance.config.rows || column < 0 || column >= instance.config.columns) {
					instance.log('warn', `Invalid button coordinates: ${row}/${column}`)
					return {}
				}

				// Calculate the keyIndex from row and column
				const keyIndex = row * (instance.config.columns || 8) + column

				if (instance.buttonImages[keyIndex]) {
					return {
						imageBuffer: instance.buttonImages[keyIndex],
						imageBufferEncoding: {
							pixelFormat: 'RGB',
						},
						// imageBufferPosition: {
						// 	x: 0,
						// 	y: 0,
						// 	width: 1,
						// 	height: 1,
						// }
					}
				}

				return {}
			},
		},
	}

	instance.setFeedbackDefinitions(feedbacks)
}
