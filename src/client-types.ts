export interface DeviceRegisterInputVariable {
	id: string
	type: 'input'
	name: string
	description?: string
}
export interface DeviceRegisterOutputVariable {
	id: string
	type: 'output'
	name: string
	description?: string
}

export interface DeviceRegisterProps {
	brightness: boolean
	rowCount: number
	columnCount: number
	bitmapSize: number | null
	colours: boolean
	text: boolean
	transferVariables?: Array<DeviceRegisterInputVariable | DeviceRegisterOutputVariable>
	pincodeMap: SurfacePincodeMap | null
}

export type SurfacePincodeMap =
	/*SurfacePincodeMapPageSingle | SurfacePincodeMapPageMultiple |*/ SurfacePincodeMapCustom
export interface SurfacePincodeMapCustom {
	type: 'custom'
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ClientCapabilities {
	// For future use to support new functionality
}
export interface CompanionClient {
	capabilities: ClientCapabilities
}

export interface SurfaceProxyDrawProps {
	deviceId: string
	keyIndex: number
	image?: Buffer
	color?: string // hex
	text?: string
}

// Utility function to ensure a value is never
export function assertNever(value: never): never {
	throw new Error(`Unexpected value: ${value}`)
}

// Default TCP port for Companion Satellite
export const DEFAULT_TCP_PORT = 16622

export const DEFAULT_BASE_RESOLUTION = 72
