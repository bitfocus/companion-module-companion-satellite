import { Regex, type SomeCompanionConfigField } from '@companion-module/base'

export interface ModuleConfig {
	host: string
	port: number
	columns: number
	rows: number
}

export function GetConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'textinput',
			id: 'host',
			label: 'Target IP',
			width: 8,
			regex: Regex.IP,
		},
		{
			type: 'number',
			id: 'port',
			label: 'Target Port',
			width: 4,
			min: 1,
			max: 65535,
			default: 16622,
		},
		{
			type: 'number',
			id: 'columns',
			label: 'Number of Columns',
			width: 6,
			min: 1,
			max: 32,
			default: 8,
		},
		{
			type: 'number',
			id: 'rows',
			label: 'Number of Rows',
			width: 6,
			min: 1,
			max: 8,
			default: 4,
		},
	]
}
