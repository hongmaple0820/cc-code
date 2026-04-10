// Command Loader - Handles loading commands from various sources
// Split from commands.ts for better modularity

import memoize from 'lodash-es/memoize.js'
import type { Command } from '../types/command.js'
import { getSkillDirCommands, clearSkillCaches, getDynamicSkills } from '../skills/loadSkillsDir.js'
import { getBundledSkills } from '../skills/bundledSkills.js'
import { getBuiltinPluginSkillCommands } from '../plugins/builtinPlugins.js'
import { getPluginCommands, clearPluginCommandCache, getPluginSkills, clearPluginSkillsCache } from '../utils/plugins/loadPluginCommands.js'
import { logError } from '../utils/log.js'
import { toError } from '../utils/errors.js'
import { logForDebugging } from '../utils/debug.js'
import { isUsing3PServices, isClaudeAISubscriber } from '../utils/auth.js'
import { feature } from 'bun:bundle'
import { getBuiltInCommands, INTERNAL_ONLY_COMMANDS } from './registry.js'
import login from './login/index.js'
import logout from './logout/index.js'
import { meetsAvailabilityRequirement } from './filters.js'
import { isCommandEnabled } from '../types/command.js'

/* eslint-disable @typescript-eslint/no-require-imports */
const getWorkflowCommands = feature('WORKFLOW_SCRIPTS')
  ? (require('../tools/WorkflowTool/createWorkflowCommand.js') as typeof import('../tools/WorkflowTool/createWorkflowCommand.js')).getWorkflowCommands
  : null

const clearSkillIndexCache = feature('EXPERIMENTAL_SKILL_SEARCH')
  ? (require('../services/skillSearch/localSearch.js') as typeof import('../services/skillSearch/localSearch.js')).clearSkillIndexCache
  : null
/* eslint-enable @typescript-eslint/no-require-imports */

/**
 * Loads skills from various sources
 */
async function getSkills(cwd: string): Promise<{
  skillDirCommands: Command[]
  pluginSkills: Command[]
  bundledSkills: Command[]
  builtinPluginSkills: Command[]
}> {
  try {
    const [skillDirCommands, pluginSkills] = await Promise.all([
      getSkillDirCommands(cwd).catch(err => {
        logError(toError(err))
        logForDebugging('Skill directory commands failed to load, continuing without them')
        return []
      }),
      getPluginSkills().catch(err => {
        logError(toError(err))
        logForDebugging('Plugin skills failed to load, continuing without them')
        return []
      }),
    ])

    const bundledSkills = getBundledSkills()
    const builtinPluginSkills = getBuiltinPluginSkillCommands()

    logForDebugging(
      `getSkills returning: ${skillDirCommands.length} skill dir commands, ${pluginSkills.length} plugin skills, ${bundledSkills.length} bundled skills, ${builtinPluginSkills.length} builtin plugin skills`,
    )

    return {
      skillDirCommands,
      pluginSkills,
      bundledSkills,
      builtinPluginSkills,
    }
  } catch (err) {
    logError(toError(err))
    logForDebugging('Unexpected error in getSkills, returning empty')
    return {
      skillDirCommands: [],
      pluginSkills: [],
      bundledSkills: [],
      builtinPluginSkills: [],
    }
  }
}

/**
 * Loads all commands from all sources
 * Memoized by cwd because loading is expensive (disk I/O, dynamic imports)
 */
export const loadAllCommands = memoize(async (cwd: string): Promise<Command[]> => {
  const [
    { skillDirCommands, pluginSkills, bundledSkills, builtinPluginSkills },
    pluginCommands,
    workflowCommands,
  ] = await Promise.all([
    getSkills(cwd),
    getPluginCommands(),
    getWorkflowCommands ? getWorkflowCommands(cwd) : Promise.resolve([]),
  ])

  // Include internal commands for ant users
  const internalCommands = process.env.USER_TYPE === 'ant' && !process.env.IS_DEMO
    ? INTERNAL_ONLY_COMMANDS
    : []

  // Add login/logout for non-3P users
  const authCommands = !isUsing3PServices() ? [logout, login()] : []

  return [
    ...bundledSkills,
    ...builtinPluginSkills,
    ...skillDirCommands,
    ...(workflowCommands ?? []),
    ...pluginCommands,
    ...pluginSkills,
    ...getBuiltInCommands(),
    ...internalCommands,
    ...authCommands,
  ].filter(Boolean) as Command[]
})

/**
 * Returns commands available to the current user
 * Expensive loading is memoized, but availability checks run fresh
 */
export async function getCommands(cwd: string): Promise<Command[]> {
  const allCommands = await loadAllCommands(cwd)
  const dynamicSkills = getDynamicSkills()

  const baseCommands = allCommands.filter(
    cmd => meetsAvailabilityRequirement(cmd) && isCommandEnabled(cmd),
  )

  if (dynamicSkills.length === 0) {
    return baseCommands
  }

  const builtInNames = new Set(getBuiltInCommands().map(c => c.name))
  const insertIndex = baseCommands.findIndex(c => builtInNames.has(c.name))

  const baseCommandNames = new Set(baseCommands.map(c => c.name))
  const uniqueDynamicSkills = dynamicSkills.filter(
    s =>
      !baseCommandNames.has(s.name) &&
      meetsAvailabilityRequirement(s) &&
      isCommandEnabled(s),
  )

  if (uniqueDynamicSkills.length === 0) {
    return baseCommands
  }

  if (insertIndex === -1) {
    return [...baseCommands, ...uniqueDynamicSkills]
  }

  return [
    ...baseCommands.slice(0, insertIndex),
    ...uniqueDynamicSkills,
    ...baseCommands.slice(insertIndex),
  ]
}

/**
 * Clears command memoization caches
 */
export function clearCommandMemoizationCaches(): void {
  loadAllCommands.cache?.clear?.()
  getSkillToolCommands.cache?.clear?.()
  getSlashCommandToolSkills.cache?.clear?.()
  clearSkillIndexCache?.()
}

export function clearCommandsCache(): void {
  clearCommandMemoizationCaches()
  clearPluginCommandCache()
  clearPluginSkillsCache()
  clearSkillCaches()
}

/**
 * Filter to MCP-provided skills
 */
export function getMcpSkillCommands(
  mcpCommands: readonly Command[],
): readonly Command[] {
  if (feature('MCP_SKILLS')) {
    return mcpCommands.filter(
      cmd =>
        cmd.type === 'prompt' &&
        cmd.loadedFrom === 'mcp' &&
        !cmd.disableModelInvocation,
    )
  }
  return []
}

// SkillTool shows ALL prompt-based commands that the model can invoke
export const getSkillToolCommands = memoize(
  async (cwd: string): Promise<Command[]> => {
    const allCommands = await getCommands(cwd)
    return allCommands.filter(
      cmd =>
        cmd.type === 'prompt' &&
        !cmd.disableModelInvocation &&
        cmd.source !== 'builtin' &&
        (cmd.loadedFrom === 'bundled' ||
          cmd.loadedFrom === 'skills' ||
          cmd.loadedFrom === 'commands_DEPRECATED' ||
          cmd.hasUserSpecifiedDescription ||
          cmd.whenToUse),
    )
  },
)

// Filters commands to include only skills
export const getSlashCommandToolSkills = memoize(
  async (cwd: string): Promise<Command[]> => {
    try {
      const allCommands = await getCommands(cwd)
      return allCommands.filter(
        cmd =>
          cmd.type === 'prompt' &&
          cmd.source !== 'builtin' &&
          (cmd.hasUserSpecifiedDescription || cmd.whenToUse) &&
          (cmd.loadedFrom === 'skills' ||
            cmd.loadedFrom === 'plugin' ||
            cmd.loadedFrom === 'bundled' ||
            cmd.disableModelInvocation),
      )
    } catch (error) {
      logError(toError(error))
      logForDebugging('Returning empty skills array due to load failure')
      return []
    }
  },
)
