import { crc32, deflateSync } from 'node:zlib'

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

function createPngChunk(type: string, data: Buffer): Buffer {
	const chunk = Buffer.alloc(12 + data.length)
	chunk.writeUInt32BE(data.length, 0)
	chunk.write(type, 4, 'ascii')
	data.copy(chunk, 8)
	chunk.writeUInt32BE(crc32(chunk.subarray(4, 8 + data.length)), 8 + data.length)
	return chunk
}

/** Encode packed 8-bit RGB pixels as a PNG data url */
export function rgbToPngDataUrl(rgb: Buffer, width: number, height: number): string {
	const stride = width * 3
	if (rgb.length !== stride * height) {
		throw new Error(`RGB buffer is ${rgb.length} bytes, expected ${stride * height} for ${width}x${height}`)
	}

	// Each scanline is prefixed with a filter type byte, 0 for none
	const scanlines = Buffer.alloc((stride + 1) * height)
	for (let y = 0; y < height; y++) {
		rgb.copy(scanlines, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
	}

	const header = Buffer.alloc(13)
	header.writeUInt32BE(width, 0)
	header.writeUInt32BE(height, 4)
	header[8] = 8 // bit depth
	header[9] = 2 // colour type: truecolour RGB

	const png = Buffer.concat([
		PNG_SIGNATURE,
		createPngChunk('IHDR', header),
		createPngChunk('IDAT', deflateSync(scanlines, { level: 1 })),
		createPngChunk('IEND', Buffer.alloc(0)),
	])

	return `data:image/png;base64,${png.toString('base64')}`
}
