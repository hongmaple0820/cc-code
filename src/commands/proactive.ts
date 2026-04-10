// Proactive Command - Context-aware proactive suggestions
// Enables the proactive assistant to make suggestions based on context

import type { Command } from '../types/command.js'
import { isFeatureEnabled } from '../core/featureFlags.js'
import {
  isKairosActive,
  activateKairos,
  deactivateKairos,
  getKairosStatus,
} from '../integrations/kairos/KairosIntegration.js'

const proactiveCommand: Command = {
  type: 'local-jsx',
  name: 'proactive',
  description: 'Toggle proactive assistant mode for context-aware suggestions',
  aliases: ['kairos', 'assist'],
  source: 'builtin',
  async getPromptForCommand(args) {
    if (!isFeatureEnabled('PROACTIVE') && !isFeatureEnabled('KAIROS')) {
      return {
        type: 'prompt',
        prompt: `Proactive mode is not enabled.

To enable it, set the environment variable:
export CLAUDE_CODE_ENABLE_KAIROS=1`,
      }
    }

    const parts = args?.trim().split(' ') || []
    const subcommand = parts[0]?.toLowerCase()

    switch (subcommand) {
      case 'on':
      case 'enable':
        if (isKairosActive()) {
          return {
            type: 'prompt',
            prompt: 'Proactive mode is already active.',
          }
        }
        activateKairos()
        return {
          type: 'prompt',
          prompt: `✅ Proactive mode activated.

I will now observe your workflow and provide context-aware suggestions when appropriate.

To deactivate, use: /proactive off`,
        }

      case 'off':
      case 'disable':
        if (!isKairosActive()) {
          return {
            type: 'prompt',
            prompt: 'Proactive mode is already inactive.',
          }
        }
        deactivateKairos()
        return {
          type: 'prompt',
          prompt: '✅ Proactive mode deactivated.',
        }

      case 'status':
      case 'info': {
        const status = getKairosStatus()
        return {
          type: 'prompt',
          prompt: `Proactive Assistant Status:
  ${status.active ? '🟢 Active' : '⚪ Inactive'}
  Feature enabled: ${status.enabled ? '✅' : '❌'}
  Initialized: ${status.initialized ? '✅' : '❌'}

Usage: /proactive [on|off|status]`,
        }
      }

      default:
        if (!subcommand) {
          const isActive = isKairosActive() ? deactivateKairos() || false : activateKairos() || true
          if (isActive) {
            return {
              type: 'prompt',
              prompt: `✅ Proactive mode activated.

I will observe your workflow and suggest helpful actions based on context.

To deactivate, use /proactive off.`,
            }
          } else {
            return {
              type: 'prompt',
              prompt: '✅ Proactive mode deactivated.',
            }
          }
        }

        return {
          type: 'prompt',
          prompt: `Unknown subcommand: "${subcommand}"

Usage:
  /proactive        - Toggle on/off
  /proactive on     - Activate proactive mode
  /proactive off    - Deactivate proactive mode
  /proactive status - Show current status`,
        }
    }
  },
}

export default proactiveCommand
