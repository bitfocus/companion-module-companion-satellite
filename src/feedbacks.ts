import { DEFAULT_BASE_RESOLUTION } from './client-types.js'
import { CONNECTED_NO_BITMAP_IMAGE, NOT_CONNECTED_IMAGE } from './images.js'
import type { ModuleInstance } from './main.js'
import { rgbBufferToPngDataUrl } from './png.js'
import { CompanionFeedbackDefinitions } from '@companion-module/base'

const CONNECTED_NO_BITMAP_PNG = rgbBufferToPngDataUrl(
	CONNECTED_NO_BITMAP_IMAGE,
	DEFAULT_BASE_RESOLUTION,
	DEFAULT_BASE_RESOLUTION,
)
const NOT_CONNECTED_PNG = rgbBufferToPngDataUrl(
	NOT_CONNECTED_IMAGE,
	DEFAULT_BASE_RESOLUTION,
	DEFAULT_BASE_RESOLUTION,
)

export function UpdateFeedbacks(instance: ModuleInstance): void {
	const feedbacks: CompanionFeedbackDefinitions = {
		buttonImage: {
			type: 'advanced',
			name: 'Button Image',
			description: 'Shows the image from the connected Companion button',
			options: [
				{
					id: 'location',
					type: 'textinput',
					label: 'Location (row/column)',
					default: '0/0',
					regex: '/^\\d+\\/\\d+$/',
					useVariables: { local: true },
				},
			],
			callback: async (feedback, context) => {
				// Parse the location string (format: row/column) with variable parsing
				const locationStr = (await context.parseVariablesInString(String(feedback.options.location))).trim()

				// Check if the string matches the expected format
				const locationRegex = /^(\d+)\/(\d+)$/
				const match = locationStr.match(locationRegex)

				if (!match) {
					instance.log('warn', `Invalid button coordinates format: ${locationStr}. Expected format: row/column`)
					return {}
				}

				const row = Number(match[1])
				const column = Number(match[2])

				// Validate row and column are within allowed range using the instance properties
				if (row < 0 || row >= instance.config.rows || column < 0 || column >= instance.config.columns) {
					instance.log('warn', `Invalid button coordinates: ${locationStr}`)
					return {}
				}

				if (!feedback.image) {
					instance.log('warn', `Image not supported for button coordinates: ${row}/${column}`)
					return {}
				}

				// If the client is not connected, return a default image
				if (!instance.client || !instance.client.connected) {
					return {
						show_topbar: false,
						png64: NOT_CONNECTED_PNG,
						pngalignment: 'center:center',
					}
				}

				// Get button image using row/column key format
				const key = `${row}/${column}`
				const image = instance.buttonImages.get(key)

				if (image) {
					if (typeof image === 'string') {
						return {
							show_topbar: false,
							png64: image,
							pngalignment: 'center:center',
						}
					}

					const resolution = instance.config.bitmapResolution || 1
					const sourceSize = DEFAULT_BASE_RESOLUTION * resolution
					return {
						show_topbar: false,
						imageBuffer: image,
						imageBufferEncoding: {
							pixelFormat: 'RGB',
						},
						imageBufferPosition: {
							x: 0,
							y: 0,
							width: sourceSize,
							height: sourceSize,
							drawScale: 1 / resolution,
						},
					}
				}

				// Connected but no bitmap available for this button
				return {
					show_topbar: false,
					png64: CONNECTED_NO_BITMAP_PNG,
					pngalignment: 'center:center',
				}
			},
		},
	}

	instance.setFeedbackDefinitions(feedbacks)
}
