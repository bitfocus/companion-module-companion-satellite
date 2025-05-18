import type { CompanionStaticUpgradeScript } from '@companion-module/base'
import type { ModuleConfig } from './config.js'

export const UpgradeScripts: CompanionStaticUpgradeScript<ModuleConfig>[] = [
	// v1.0.0 - Add columns and rows config
	function (context, props) {
		const config = props.config

		return {
			updatedConfig: config
				? {
						...config,
						columns: 8,
						rows: 4,
					}
				: null,
			updatedActions: [],
			updatedFeedbacks: [],
		}
	},
]
