// Remote Control Server Command - Daemon mode server
// Manages the remote control daemon

import type { Command } from '../../types/command.js'
import { isFeatureEnabled } from '../../core/featureFlags.js'

let serverActive = false

const remoteControlServerCommand: Command = {
  type: 'local-jsx',
  name: 'remote-server',
  description: 'Manage the remote control daemon server',
  aliases: ['daemon', 'server'],
  source: 'builtin',
  async getPromptForCommand(args) {
    if (!isFeatureEnabled('DAEMON') || !isFeatureEnabled('BRIDGE_MODE')) {
      return {
        type: 'prompt',
        prompt: `Remote control server is not enabled.

To enable it, set the environment variables:
export CLAUDE_CODE_ENABLE_DAEMON=1
export CLAUDE_CODE_ENABLE_BRIDGE_MODE=1`,
      }
    }

    const parts = args?.trim().split(' ') || []
    const subcommand = parts[0]?.toLowerCase()

    switch (subcommand) {
      case 'start':
        if (serverActive) {
          return {
            type: 'prompt',
            prompt: 'Server is already running.',
          }
        }
        serverActive = true
        return {
          type: 'prompt',
          prompt: `🖥️ Remote control server started.

The daemon is now running and accepting connections.
Use /remote-server stop to shut down.`,
        }

      case 'stop':
        if (!serverActive) {
          return {
            type: 'prompt',
            prompt: 'Server is not running.',
          }
        }
        serverActive = false
        return {
          type: 'prompt',
          prompt: '🛑 Remote control server stopped.',
        }

      case 'status':
        return {
          type: 'prompt',
          prompt: serverActive
            ? '🟢 Remote server: Running'
            : '⚪ Remote server: Stopped',
        }

      default:
        return {
          type: 'prompt',
          prompt: `🖥️ Remote Control Server

Usage:
  /remote-server start  - Start the daemon
  /remote-server stop   - Stop the daemon
  /remote-server status - Check status

The remote control server allows mobile/web clients to connect.`,
        }
    }
  },
}

export default remoteControlServerCommand
