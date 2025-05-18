import { DEFAULT_BASE_RESOLUTION } from './client-types.js'
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

				if (!feedback.image) {
					instance.log('warn', `Image not supported for button coordinates: ${row}/${column}`)
					return {}
				}

				// Get button image using row/column key format
				const key = `${row}/${column}`
				const image = instance.buttonImages.get(key)

				// Crude attempt to avoid double topbar
				const yOffset =
					feedback.image.height < feedback.image.width ? DEFAULT_BASE_RESOLUTION - feedback.image.height : 0

				if (image) {
					const resolution = instance.config.bitmapResolution || 1
					return {
						imageBuffer: image,
						imageBufferEncoding: {
							pixelFormat: 'RGB',
						},
						imageBufferPosition: {
							x: 0,
							y: -yOffset,
							width: DEFAULT_BASE_RESOLUTION * resolution,
							height: DEFAULT_BASE_RESOLUTION * resolution,
							drawScale: 1 / resolution,
						},
					}
				}

				return {}
			},
		},
	}

	instance.setFeedbackDefinitions(feedbacks)
}
