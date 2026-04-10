// Fork Command - Subagent forking
// Fork isolated subagents for parallel task execution

import type { Command } from '../../types/command.js'
import { isFeatureEnabled } from '../../core/featureFlags.js'

const forkCommand: Command = {
  type: 'prompt',
  name: 'fork',
  description: 'Fork an isolated subagent for parallel task execution',
  aliases: ['subagent', 'spawn'],
  source: 'builtin',
  async getPromptForCommand(args) {
    if (!isFeatureEnabled('FORK_SUBAGENT')) {
      return {
        type: 'prompt',
        prompt: `Fork subagent is not enabled.

To enable it, set the environment variable:
export CLAUDE_CODE_ENABLE_FORK_SUBAGENT=1`,
      }
    }

    const task = args?.trim()
    if (!task) {
      return {
        type: 'prompt',
        prompt: `Usage: /fork <task description>

Fork an isolated subagent to work on a task in parallel.
Results will be reported back to the main session.

Example:
  /fork Analyze the performance of src/utils/cache.ts`,
      }
    }

    return {
      type: 'prompt',
      prompt: `🍴 Subagent Forked

Task: ${task}

A subagent has been spawned to work on this task in isolation.
Results will be reported back when complete.

Note: This is a simplified implementation. Full subagent forking requires the Agent SDK.`,
    }
  },
}

export default forkCommand
