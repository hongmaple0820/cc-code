// Coordinator Command - Multi-agent orchestration mode
// Enables parallel task execution with worker agents

import type { Command } from '../../types/command.js'
import { isFeatureEnabled } from '../../core/featureFlags.js'
import {
  isCoordinatorMode,
  activateCoordinator,
  deactivateCoordinator,
  toggleCoordinator,
  getCoordinatorStatus,
} from '../../integrations/coordinator/CoordinatorIntegration.js'

const coordinatorCommand: Command = {
  type: 'local-jsx',
  name: 'coordinator',
  description: 'Enter multi-agent coordinator mode for parallel task execution',
  aliases: ['coord', 'multi-agent'],
  source: 'builtin',
  async getPromptForCommand(args) {
    // Check if feature is enabled
    if (!isFeatureEnabled('COORDINATOR_MODE')) {
      return {
        type: 'prompt',
        prompt: `Coordinator mode is not enabled in the feature flags.

To enable it, set the environment variable:
export CLAUDE_CODE_COORDINATOR_MODE=1

Or use: /coordinator enable`,
      }
    }

    const parts = args?.trim().split(' ') || []
    const subcommand = parts[0]?.toLowerCase()

    // Handle subcommands
    switch (subcommand) {
      case 'on':
      case 'enable':
        if (isCoordinatorMode()) {
          return {
            type: 'prompt',
            prompt: 'Coordinator mode is already active.',
          }
        }
        activateCoordinator()
        return {
          type: 'prompt',
          prompt: `✅ Coordinator mode activated.

You can now spawn multiple worker agents to work on tasks in parallel using the Agent tool with subagent_type: 'worker'.

To exit coordinator mode, use: /coordinator off`,
        }

      case 'off':
      case 'disable':
        if (!isCoordinatorMode()) {
          return {
            type: 'prompt',
            prompt: 'Coordinator mode is already inactive.',
          }
        }
        deactivateCoordinator()
        return {
          type: 'prompt',
          prompt: '✅ Coordinator mode deactivated.',
        }

      case 'status':
      case 'info': {
        const status = getCoordinatorStatus()
        return {
          type: 'prompt',
          prompt: `Coordinator Status:
  ${status.active ? '🟢 Active' : '⚪ Inactive'}
  Feature enabled: ${status.enabled ? '✅' : '❌'}
  Initialized: ${status.initialized ? '✅' : '❌'}

Usage: /coordinator [on|off|status]`,
        }
      }

      case 'exit':
        if (isCoordinatorMode()) {
          deactivateCoordinator()
          return {
            type: 'prompt',
            prompt: '✅ Coordinator mode deactivated.',
          }
        }
        return {
          type: 'prompt',
          prompt: 'Coordinator mode is not active.',
        }

      default:
        // Toggle if no subcommand
        if (!subcommand) {
          const isActive = toggleCoordinator()
          if (isActive) {
            return {
              type: 'prompt',
              prompt: `✅ Coordinator mode activated.

You are now in Coordinator mode. You can spawn worker agents using the Agent tool with subagent_type: 'worker'.

Workers have access to these tools and can execute tasks in parallel. Results arrive as notifications.

To exit coordinator mode, use /coordinator exit.`,
            }
          } else {
            return {
              type: 'prompt',
              prompt: '✅ Coordinator mode deactivated.',
            }
          }
        }

        return {
          type: 'prompt',
          prompt: `Unknown subcommand: "${subcommand}"

Usage:
  /coordinator        - Toggle on/off
  /coordinator on     - Activate coordinator mode
  /coordinator off    - Deactivate coordinator mode
  /coordinator status - Show current status`,
        }
    }
  },
}

export default coordinatorCommand
