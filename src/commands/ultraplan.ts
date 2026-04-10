// Ultraplan Command - 30-minute deep planning mode
// Uses Opus model for complex task decomposition

import type { Command } from '../types/command.js'
import { isFeatureEnabled } from '../core/featureFlags.js'

const ultraplanCommand: Command = {
  type: 'prompt',
  name: 'ultraplan',
  description: 'Enter 30-minute deep planning mode with Opus model for complex tasks',
  aliases: ['deep-plan', 'planning'],
  source: 'builtin',
  async getPromptForCommand(args, _context) {
    if (!isFeatureEnabled('ULTRAPLAN')) {
      return {
        type: 'prompt',
        prompt: `Ultraplan mode is not enabled.

To enable it, set the environment variable:
export CLAUDE_CODE_ENABLE_ULTRAPLAN=1`,
      }
    }

    const task = args?.trim()
    if (!task) {
      return {
        type: 'prompt',
        prompt: `Usage: /ultraplan <task description>

Enter 30-minute deep planning mode for complex task decomposition.
This mode uses the Opus model to create detailed implementation plans.

Example:
  /ultraplan Implement a user authentication system with OAuth and JWT`,
      }
    }

    return {
      type: 'prompt',
      prompt: `🎯 ULTRAPLAN MODE ACTIVATED

Task: ${task}

I'm now switching to deep planning mode. This will take up to 30 minutes and will produce:

1. **Architecture Analysis** - System design and component breakdown
2. **Implementation Steps** - Detailed, ordered tasks with file paths
3. **Dependency Map** - What depends on what, parallelization opportunities
4. **Risk Assessment** - Potential blockers and mitigation strategies
5. **Testing Strategy** - How to verify each component
6. **Completion Criteria** - Specific, measurable definitions of done

Let's begin planning...`,
    }
  },
}

export default ultraplanCommand

// Re-export from the JSX implementation
export {
  launchUltraplan,
  stopUltraplan,
  buildUltraplanPrompt,
  CCR_TERMS_URL,
} from './ultraplan.tsx'
