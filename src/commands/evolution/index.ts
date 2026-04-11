// Self-Evolution Engine Command
// CLI interface for feedback-driven behavior adaptation

import type { Command } from '../../types/command.js'
import { selfEvolutionEngine } from '../../modules/selfevolution/SelfEvolutionEngine.js'

const evolutionCommand: Command = {
  type: 'local',
  name: 'evolution',
  aliases: ['evo', 'self-evolve'],
  description: 'Manage self-evolution feedback loop',
  source: 'builtin',
  async call(args, _context) {
    await selfEvolutionEngine.initialize()

    const trimmedArgs = args?.trim() || ''
    const parts = trimmedArgs.split(' ')
    const subcommand = parts[0]?.toLowerCase() || 'help'

    switch (subcommand) {
      case 'report': {
        const report = selfEvolutionEngine.getEvolutionReport()
        return { type: 'text', value: report }
      }

      case 'patterns': {
        const patterns = selfEvolutionEngine.getPatterns()
        if (patterns.length === 0) {
          return { type: 'text', value: 'No behavioral patterns detected yet.' }
        }
        const lines = patterns.map(p =>
          `[${p.confidence.toFixed(2)}] ${p.type}\n  ${p.description}\n  Adjustment: ${p.suggestedAdjustment}\n  Evidence: ${p.evidence.length} events`
        ).join('\n\n')
        return {
          type: 'text',
          value: `Detected Patterns (${patterns.length}):\n\n${lines}`,
        }
      }

      case 'stats': {
        const stats = selfEvolutionEngine.getEventStats()
        const byTypeLines = Object.entries(stats.byType)
          .map(([type, count]) => `  ${type}: ${count}`)
          .join('\n')
        return {
          type: 'text',
          value: `Evolution Stats:
  Total behavior events: ${stats.total}
  Patterns detected: ${stats.patterns}

  Events by Type:
${byTypeLines}`,
        }
      }

      case 'settings': {
        const settings = selfEvolutionEngine.getSettings()
        const settingsLines = Object.entries(settings)
          .map(([key, value]) => `  ${key}: ${value}`)
          .join('\n')
        return {
          type: 'text',
          value: `Adaptive Settings:\n\n${settingsLines}`,
        }
      }

      case 'set': {
        const key = parts[1]
        const value = parts[2]
        if (!key || value === undefined) {
          return { type: 'text', value: 'Usage: /evolution set <key> <value>' }
        }
        const settings = selfEvolutionEngine.getSettings()
        const typedKey = key as keyof typeof settings
        if (!(typedKey in settings)) {
          return { type: 'text', value: `Unknown setting: ${key}. Available: ${Object.keys(settings).join(', ')}` }
        }
        // Parse value
        const parsed = isNaN(Number(value)) ? (value === 'true') : Number(value)
        const newSettings: Partial<Parameters<typeof selfEvolutionEngine.updateSettings>[0]> = {}
        newSettings[typedKey] = parsed as never
        selfEvolutionEngine.updateSettings(newSettings)
        return { type: 'text', value: `Set ${key} = ${parsed}` }
      }

      case 'consolidate': {
        selfEvolutionEngine.consolidate()
        return { type: 'text', value: 'Consolidation complete across all systems.' }
      }

      case 'record': {
        // Manually record a behavior event
        const eventType = parts[1]
        const target = parts.slice(2).join(' ') || 'manual'
        if (!eventType) return { type: 'text', value: 'Usage: /evolution record <type> <target>' }
        selfEvolutionEngine.recordEvent({
          type: eventType as any,
          target,
          sessionId: process.env.CLAUDE_CODE_SESSION_ID ?? 'unknown',
          timestamp: Date.now(),
          context: { source: 'manual' },
        })
        return { type: 'text', value: `Recorded event: ${eventType} -> ${target}` }
      }

      case 'help':
      default:
        return {
          type: 'text',
          value: `Self-Evolution Engine - Feedback-driven behavior adaptation

Commands:
  /evolution report          Full evolution report
  /evolution patterns        Show detected behavioral patterns
  /evolution stats           Show event statistics
  /evolution settings         Show current adaptive settings
  /evolution set <k> <v>     Update an adaptive setting
  /evolution consolidate     Run consolidation across all systems
  /evolution record <type> <target>  Manually record behavior event
  /evolution help             Show this help

How the loop works:
  1. Observe: Track user behavior (skill usage, suggestion acceptance, etc.)
  2. Learn: Detect patterns from accumulated events
  3. Adapt: Adjust settings (thresholds, frequencies, automation)
  4. Verify: Monitor if adjustments improve experience

Connected systems:
  - Long-term Task Engine: Task failures -> knowledge extraction
  - Knowledge Base: Stores learned patterns and lessons
  - Skill Forge: Auto-generates skills from usage patterns`,
        }
    }
  },
  isEnabled: () => true,
}

export default evolutionCommand
