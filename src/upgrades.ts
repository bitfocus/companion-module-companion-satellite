import type { CompanionStaticUpgradeScript } from '@companion-module/base'
import type { ModuleConfig } from './config.js'

// No upgrade scripts needed for new module
export const UpgradeScripts: CompanionStaticUpgradeScript<ModuleConfig>[] = []
