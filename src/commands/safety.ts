// Command Safety - Remote and bridge-safe command definitions
// Split from commands.ts for better modularity

import compact from './compact/index.js'
import clear from './clear/index.js'
import cost from './cost/index.js'
import summary from './summary/index.js'
import releaseNotes from './release-notes/index.js'
import files from './files/index.js'
import session from './session/index.js'
import exit from './exit/index.js'
import help from './help/index.js'
import theme from './theme/index.js'
import color from './color/index.js'
import vim from './vim/index.js'
import usage from './usage/index.js'
import copy from './copy/index.js'
import btw from './btw/index.js'
import feedback from './feedback/index.js'
import plan from './plan/index.js'
import keybindings from './keybindings/index.js'
import statusline from './statusline.js'
import stickers from './stickers/index.js'
import mobile from './mobile/index.js'
import type { Command } from '../types/command.js'

/**
 * Commands safe to use in remote mode (--remote)
 * These only affect local TUI state
 */
export const REMOTE_SAFE_COMMANDS: Set<Command> = new Set([
  session,
  exit,
  clear,
  help,
  theme,
  color,
  vim,
  cost,
  usage,
  copy,
  btw,
  feedback,
  plan,
  keybindings,
  statusline,
  stickers,
  mobile,
])

/**
 * Builtin commands of type 'local' that ARE safe to execute over Remote Control bridge
 */
export const BRIDGE_SAFE_COMMANDS: Set<Command> = new Set(
  [
    compact,
    clear,
    cost,
    summary,
    releaseNotes,
    files,
  ].filter((c): c is Command => c !== null),
)

/**
 * Whether a slash command is safe to execute from bridge
 */
export function isBridgeSafeCommand(cmd: Command): boolean {
  if (cmd.type === 'local-jsx') return false
  if (cmd.type === 'prompt') return true
  return BRIDGE_SAFE_COMMANDS.has(cmd)
}

/**
 * Filter commands for remote mode
 */
export function filterCommandsForRemoteMode(commands: Command[]): Command[] {
  return commands.filter(cmd => REMOTE_SAFE_COMMANDS.has(cmd))
}
