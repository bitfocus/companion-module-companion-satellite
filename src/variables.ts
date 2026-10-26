import type { ModuleInstance } from './main.js'

export function UpdateVariableDefinitions(instance: ModuleInstance): void {
	instance.setVariableDefinitions({
		connection_state: { name: 'Connection State' },
		companion_version: { name: 'Remote Companion Version' },
		companion_api_version: { name: 'Remote Companion API Version' },
		target_address: { name: 'Target Address' },
	})
}
