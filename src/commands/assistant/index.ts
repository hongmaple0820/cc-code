// Assistant Command - AI Assistant management
// Manages the Kairos AI assistant

import type { Command } from '../../types/command.js'
import { isFeatureEnabled } from '../../core/featureFlags.js'
import {
  isKairosActive,
  activateKairos,
  deactivateKairos,
  getKairosStatus,
} from '../../integrations/kairos/KairosIntegration.js'

const assistantCommand: Command = {
  type: 'local-jsx',
  name: 'assistant',
  description: 'Manage the Kairos AI assistant',
  aliases: ['ai', 'kairos'],
  source: 'builtin',
  async getPromptForCommand(args) {
    if (!isFeatureEnabled('KAIROS')) {
      return {
        type: 'prompt',
        prompt: `Assistant feature is not enabled.

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
            prompt: 'Assistant is already active.',
          }
        }
        activateKairos()
        return {
          type: 'prompt',
          prompt: `✅ Assistant activated.

The Kairos AI assistant is now active and will provide context-aware suggestions.`,
        }

      case 'off':
      case 'disable':
        if (!isKairosActive()) {
          return {
            type: 'prompt',
            prompt: 'Assistant is already inactive.',
          }
        }
        deactivateKairos()
        return {
          type: 'prompt',
          prompt: '✅ Assistant deactivated.',
        }

      case 'status': {
        const status = getKairosStatus()
        return {
          type: 'prompt',
          prompt: `Assistant Status:
  ${status.active ? '🟢 Active' : '⚪ Inactive'}
  Feature enabled: ${status.enabled ? '✅' : '❌'}
  Initialized: ${status.initialized ? '✅' : '❌'}`,
        }
      }

      default:
        return {
          type: 'prompt',
          prompt: `🤖 Kairos AI Assistant

Usage:
  /assistant on     - Activate assistant
  /assistant off    - Deactivate assistant
  /assistant status - Show current status

The assistant observes your workflow and provides helpful suggestions.`,
        }
    }
  },
}

export default assistantCommand
