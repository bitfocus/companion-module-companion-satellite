import { deflateSync } from 'node:zlib'

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

function crc32(buffers: readonly Buffer[]): number {
	let crc = 0xffffffff

	for (const buffer of buffers) {
		for (const byte of buffer) {
			crc ^= byte
			for (let bit = 0; bit < 8; bit++) {
				crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
			}
		}
	}

	return (crc ^ 0xffffffff) >>> 0
}

function createPngChunk(type: string, data: Buffer): Buffer {
	const typeBuffer = Buffer.from(type, 'ascii')
	const chunk = Buffer.allocUnsafe(12 + data.length)

	chunk.writeUInt32BE(data.length, 0)
	typeBuffer.copy(chunk, 4)
	data.copy(chunk, 8)
	chunk.writeUInt32BE(crc32([typeBuffer, data]), 8 + data.length)

	return chunk
}

/** Convert packed 8-bit RGB pixels into a lossless PNG data URL. */
export function rgbBufferToPngDataUrl(rgb: Buffer, width: number, height: number): string {
	const bytesPerRow = width * 3
	const expectedLength = bytesPerRow * height
	if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
		throw new RangeError(`Invalid PNG dimensions: ${width}x${height}`)
	}
	if (rgb.length !== expectedLength) {
		throw new RangeError(`RGB buffer has ${rgb.length} bytes; expected ${expectedLength} for ${width}x${height}`)
	}

	// Each PNG scanline starts with filter type 0 (no filtering).
	const scanlines = Buffer.allocUnsafe((bytesPerRow + 1) * height)
	for (let row = 0; row < height; row++) {
		const scanlineOffset = row * (bytesPerRow + 1)
		scanlines[scanlineOffset] = 0
		rgb.copy(scanlines, scanlineOffset + 1, row * bytesPerRow, (row + 1) * bytesPerRow)
	}

	const header = Buffer.alloc(13)
	header.writeUInt32BE(width, 0)
	header.writeUInt32BE(height, 4)
	header[8] = 8 // bit depth
	header[9] = 2 // truecolour RGB
	header[10] = 0 // compression method
	header[11] = 0 // filter method
	header[12] = 0 // no interlacing

	const png = Buffer.concat([
		PNG_SIGNATURE,
		createPngChunk('IHDR', header),
		createPngChunk('IDAT', deflateSync(scanlines, { level: 1 })),
		createPngChunk('IEND', Buffer.alloc(0)),
	])

	return `data:image/png;base64,${png.toString('base64')}`
}
