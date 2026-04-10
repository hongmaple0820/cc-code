// Command Filters - Availability and filtering logic
// Split from commands.ts for better modularity

import type { Command } from '../types/command.js'
import { isClaudeAISubscriber, isUsing3PServices } from '../utils/auth.js'
import { isFirstPartyAnthropicBaseUrl } from '../utils/model/providers.js'

/**
 * Filters commands by their declared availability (auth/provider requirement)
 * Commands without availability are treated as universal
 */
export function meetsAvailabilityRequirement(cmd: Command): boolean {
  if (!cmd.availability) return true

  for (const a of cmd.availability) {
    switch (a) {
      case 'claude-ai':
        if (isClaudeAISubscriber()) return true
        break
      case 'console':
        if (
          !isClaudeAISubscriber() &&
          !isUsing3PServices() &&
          isFirstPartyAnthropicBaseUrl()
        )
          return true
        break
      default: {
        const _exhaustive: never = a
        void _exhaustive
        break
      }
    }
  }
  return false
}
