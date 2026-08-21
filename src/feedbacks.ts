import { DEFAULT_BASE_RESOLUTION } from './client-types.js'
import { CONNECTED_NO_BITMAP_IMAGE, NOT_CONNECTED_IMAGE } from './images.js'
import type { ModuleInstance } from './main.js'
import { CompanionFeedbackDefinitions } from '@companion-module/base'
import { ImageTransformer } from '@julusian/image-rs'

const pngImageCache = new WeakMap<Buffer, Promise<string>>()

async function rgbImageToPngDataUrl(image: Buffer, size: number): Promise<string> {
	let pngDataUrl = pngImageCache.get(image)
	if (!pngDataUrl) {
		pngDataUrl = ImageTransformer.fromBuffer(image, size, size, 'rgb').toDataUrl('png')
		pngImageCache.set(image, pngDataUrl)
	}

	return pngDataUrl
}

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

				// If the client is not connected, return a default image
				if (!instance.client || !instance.client.connected) {
					return {
						png64: await rgbImageToPngDataUrl(NOT_CONNECTED_IMAGE, DEFAULT_BASE_RESOLUTION),
					}
				}

				// Get button image using row/column key format
				const key = `${row}/${column}`
				const image = instance.buttonImages.get(key)

				if (image) {
					const resolution = instance.config.bitmapResolution || 1
					return {
						png64: await rgbImageToPngDataUrl(image, DEFAULT_BASE_RESOLUTION * resolution),
					}
				}

				// Connected but no bitmap available for this button
				return {
					png64: await rgbImageToPngDataUrl(CONNECTED_NO_BITMAP_IMAGE, DEFAULT_BASE_RESOLUTION),
				}
			},
		},
	}

	instance.setFeedbackDefinitions(feedbacks)
}
