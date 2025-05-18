// Types for the Companion Satellite API client
export interface DeviceTransferVariable {
	id: string
	type: 'input' | 'output'
	name: string
	description: string
}

export interface DeviceRegisterProps {
	columnCount: number
	rowCount: number
	bitmapSize?: number
	colours?: boolean | string
	text?: boolean
	brightness?: boolean
	transferVariables?: DeviceTransferVariable[]
	pincodeMap?: boolean
}

export interface ClientCapabilities {
	// For future use
}

export interface CompanionClient {
	capabilities: ClientCapabilities
}

export interface SurfaceProxyDrawProps {
	deviceId: string
	keyIndex: number
	image?: Buffer
	text?: string
	color?: string
}

// Utility function to ensure a value is never
export function assertNever(value: never): never {
	throw new Error(`Unexpected value: ${value}`)
}

// Default TCP port for Companion Satellite
export const DEFAULT_TCP_PORT = 16622
