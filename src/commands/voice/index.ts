// Voice Command - Voice interaction mode
// Enable voice input and output

import type { Command } from '../../types/command.js'
import { isFeatureEnabled } from '../../core/featureFlags.js'

let voiceActive = false

const voiceCommand: Command = {
  type: 'local-jsx',
  name: 'voice',
  description: 'Toggle voice interaction mode',
  aliases: ['speak', 'listen'],
  source: 'builtin',
  async getPromptForCommand(args) {
    if (!isFeatureEnabled('VOICE_MODE')) {
      return {
        type: 'prompt',
        prompt: `Voice mode is not enabled.

To enable it, set the environment variable:
export CLAUDE_CODE_ENABLE_VOICE=1

Note: Voice mode requires hardware support.`,
      }
    }

    const parts = args?.trim().split(' ') || []
    const subcommand = parts[0]?.toLowerCase()

    switch (subcommand) {
      case 'on':
        if (voiceActive) {
          return {
            type: 'prompt',
            prompt: 'Voice mode is already active.',
          }
        }
        voiceActive = true
        return {
          type: 'prompt',
          prompt: `🎤 Voice mode activated.

Listening for voice input...
Speak naturally to interact with Claude.`,
        }

      case 'off':
        if (!voiceActive) {
          return {
            type: 'prompt',
            prompt: 'Voice mode is already inactive.',
          }
        }
        voiceActive = false
        return {
          type: 'prompt',
          prompt: '🔇 Voice mode deactivated.',
        }

      case 'status':
        return {
          type: 'prompt',
          prompt: voiceActive
            ? '🎤 Voice: Active'
            : '🔇 Voice: Inactive',
        }

      default:
        voiceActive = !voiceActive
        return {
          type: 'prompt',
          prompt: voiceActive
            ? `🎤 Voice mode activated.

Listening for voice input...`
            : '🔇 Voice mode deactivated.',
        }
    }
  },
}

export default voiceCommand
