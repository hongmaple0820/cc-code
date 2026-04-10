// Brief Command - Kairos briefing feature
// Generates a summary of current context and pending tasks

import type { Command } from '../types/command.js'
import { isFeatureEnabled } from '../core/featureFlags.js'
import { getKairosStatus, getObservationCount } from '../integrations/kairos/KairosIntegration.js'

const briefCommand: Command = {
  type: 'prompt',
  name: 'brief',
  description: 'Generate a Kairos briefing of current context and observations',
  aliases: ['summary', 'status'],
  source: 'builtin',
  async getPromptForCommand(_args, _context) {
    if (!isFeatureEnabled('KAIROS') && !isFeatureEnabled('KAIROS_BRIEF')) {
      return {
        type: 'prompt',
        prompt: `Briefing feature is not enabled.

To enable Kairos features, set:
export CLAUDE_CODE_ENABLE_KAIROS=1`,
      }
    }

    const status = getKairosStatus()
    const observations = getObservationCount()

    return {
      type: 'prompt',
      prompt: `📋 Kairos Briefing

Status: ${status.active ? '🟢 Active' : '⚪ Inactive'}
Observations recorded: ${observations}

This command provides a snapshot of what the proactive assistant has observed about your current workflow.

To enable continuous observations, activate proactive mode with: /proactive on`,
    }
  },
}

export default briefCommand
