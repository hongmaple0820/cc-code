// Torch Command - Performance profiling
// Enables performance analysis and optimization

import type { Command } from '../types/command.js'
import { isFeatureEnabled } from '../core/featureFlags.js'

interface ProfileSession {
  startTime: number
  measurements: Map<string, number[]>
}

let currentSession: ProfileSession | null = null

const torchCommand: Command = {
  type: 'local-jsx',
  name: 'torch',
  description: 'Performance profiling and optimization tools',
  aliases: ['profile', 'perf'],
  source: 'builtin',
  async getPromptForCommand(args) {
    if (!isFeatureEnabled('TORCH')) {
      return {
        type: 'prompt',
        prompt: `Torch profiling is not enabled.

To enable it, set the environment variable:
export CLAUDE_CODE_ENABLE_TORCH=1`,
      }
    }

    const parts = args?.trim().split(' ') || []
    const subcommand = parts[0]?.toLowerCase()

    switch (subcommand) {
      case 'start':
        currentSession = {
          startTime: Date.now(),
          measurements: new Map(),
        }
        return {
          type: 'prompt',
          prompt: '🔥 Torch profiling started. Use /torch stop to end session and view results.',
        }

      case 'stop':
        if (!currentSession) {
          return {
            type: 'prompt',
            prompt: 'No active profiling session. Start one with /torch start',
          }
        }
        const duration = Date.now() - currentSession.startTime
        currentSession = null
        return {
          type: 'prompt',
          prompt: `🔥 Torch profiling stopped.

Session duration: ${duration}ms

Profiling results would be displayed here in a full implementation.`,
        }

      case 'status':
        return {
          type: 'prompt',
          prompt: currentSession
            ? '🔥 Torch: Profiling active'
            : '⚪ Torch: No active session',
        }

      default:
        return {
          type: 'prompt',
          prompt: `🔥 Torch Performance Profiler

Usage:
  /torch start  - Begin profiling session
  /torch stop   - End session and view results
  /torch status - Check current status

Torch helps identify performance bottlenecks in your workflow.`,
        }
    }
  },
}

export default torchCommand
