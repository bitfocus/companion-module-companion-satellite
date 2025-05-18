import { Regex, type SomeCompanionConfigField } from '@companion-module/base'
import { DEFAULT_TCP_PORT } from './client-types.js'

export interface ModuleConfig {
	host: string
	port: number
	columns: number
	rows: number
	deviceId: string
	bitmapResolution: number
}

export function GetConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'textinput',
			id: 'host',
			label: 'Target IP/Hostname',
			width: 8,
			regex: Regex.HOSTNAME,
		},
		{
			type: 'number',
			id: 'port',
			label: 'Target Port',
			width: 4,
			min: 1,
			max: 65535,
			default: DEFAULT_TCP_PORT,
		},
		{
			type: 'textinput',
			id: 'deviceId',
			label: 'Device ID',
			width: 12,
			tooltip: 'A unique identifier for this satellite device. This is a substitute for a serial number.',
			required: true,
		},
		{
			type: 'number',
			id: 'columns',
			label: 'Number of Columns',
			width: 6,
			min: 1,
			max: 100,
			default: 8,
		},
		{
			type: 'number',
			id: 'rows',
			label: 'Number of Rows',
			width: 6,
			min: 1,
			max: 100,
			default: 4,
		},
		{
			type: 'dropdown',
			id: 'bitmapResolution',
			label: 'Bitmap Resolution',
			width: 6,
			tooltip: 'Higher quality requires more network bandwidth',
			choices: [
				{ id: 1, label: 'Low (Default)' },
				{ id: 2, label: 'Medium' },
				{ id: 4, label: 'High' },
			],
			default: 1,
		},
	]
}
