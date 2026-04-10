// Command Utils - Utility functions for command operations
// Split from commands.ts for better modularity

import type { Command } from '../types/command.js'
import { getCommandName } from '../types/command.js'
import { getSettingSourceName } from '../utils/settings/constants.js'

/**
 * Find a command by name or alias
 */
export function findCommand(
  commandName: string,
  commands: Command[],
): Command | undefined {
  return commands.find(
    cmd =>
      cmd.name === commandName ||
      getCommandName(cmd) === commandName ||
      cmd.aliases?.includes(commandName),
  )
}

/**
 * Check if a command exists
 */
export function hasCommand(commandName: string, commands: Command[]): boolean {
  return findCommand(commandName, commands) !== undefined
}

/**
 * Get a command by name, throws if not found
 */
export function getCommand(commandName: string, commands: Command[]): Command {
  const command = findCommand(commandName, commands)
  if (!command) {
    throw ReferenceError(
      `Command ${commandName} not found. Available commands: ${commands
        .map(cmd => {
          const name = getCommandName(cmd)
          return cmd.aliases ? `${name} (aliases: ${cmd.aliases.join(', ')})` : name
        })
        .sort((a, b) => a.localeCompare(b))
        .join(', ')}`,
    )
  }
  return command
}

/**
 * Formats a command's description with its source annotation
 */
export function formatDescriptionWithSource(cmd: Command): string {
  if (cmd.type !== 'prompt') {
    return cmd.description
  }

  if (cmd.kind === 'workflow') {
    return `${cmd.description} (workflow)`
  }

  if (cmd.source === 'plugin') {
    const pluginName = cmd.pluginInfo?.pluginManifest.name
    if (pluginName) {
      return `(${pluginName}) ${cmd.description}`
    }
    return `${cmd.description} (plugin)`
  }

  if (cmd.source === 'builtin' || cmd.source === 'mcp') {
    return cmd.description
  }

  if (cmd.source === 'bundled') {
    return `${cmd.description} (bundled)`
  }

  return `${cmd.description} (${getSettingSourceName(cmd.source)})`
}
