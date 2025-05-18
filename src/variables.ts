import type { ModuleInstance } from './main.js'

export function UpdateVariableDefinitions(instance: ModuleInstance): void {
	instance.setVariableDefinitions([
		{ variableId: 'connection_state', name: 'Connection State' },
		{ variableId: 'companion_version', name: 'Remote Companion Version' },
		{ variableId: 'companion_api_version', name: 'Remote Companion API Version' },
		{ variableId: 'target_address', name: 'Target Address' },
	])
}
