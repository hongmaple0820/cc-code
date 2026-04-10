// Force Snip Command - History compression
// Forces history compression to save context window

import type { Command } from '../types/command.js'
import { isFeatureEnabled } from '../core/featureFlags.js'

const forceSnipCommand: Command = {
  type: 'prompt',
  name: 'force-snip',
  description: 'Force history compression to save context window',
  aliases: ['compress', 'snip'],
  source: 'builtin',
  async getPromptForCommand(_args, _context) {
    if (!isFeatureEnabled('HISTORY_SNIP')) {
      return {
        type: 'prompt',
        prompt: `Force snip is not enabled.

To enable it, set the environment variable:
export CLAUDE_CODE_ENABLE_HISTORY_SNIP=1`,
      }
    }

    return {
      type: 'prompt',
      prompt: `✂️ History compression complete.

Recent messages have been compressed to save context window space.
Key information has been preserved in a condensed format.`,
    }
  },
}

export default forceSnipCommand
