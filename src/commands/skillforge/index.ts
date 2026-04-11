// Skill Forge Command
// CLI interface for auto-generating skills from codebase analysis

import type { Command } from '../../types/command.js'
import { skillForge } from '../../modules/skillforge/SkillForge.js'
import { existsSync, readdirSync, readFileSync, rmSync } from 'fs'
import { join } from 'path'

const skillforgeCommand: Command = {
  type: 'local',
  name: 'skillforge',
  aliases: ['forge', 'skill-gen'],
  description: 'Auto-generate skills from codebase analysis',
  source: 'builtin',
  async call(args, _context) {
    const trimmedArgs = args?.trim() || ''
    const parts = trimmedArgs.split(' ')
    const subcommand = parts[0]?.toLowerCase() || 'help'

    switch (subcommand) {
      case 'run': {
        const result = skillForge.run()
        const writtenList = result.written.length > 0
          ? result.written.map(w => `  - ${w}`).join('\n')
          : '  (none)'

        return {
          type: 'text',
          value: `SkillForge Results:
  Files analyzed: ${result.analyzed}
  Skills generated: ${result.generated}
  Skills written: ${result.written.length}

${writedList}`,
        }
      }

      case 'analyze': {
        const analyses = skillForge.analyze()
        if (analyses.length === 0) {
          return { type: 'text', value: 'No files found to analyze.' }
        }

        // Summarize patterns
        const patternCounts = new Map<string, number>()
        for (const a of analyses) {
          for (const p of a.patterns) {
            const key = p.type
            patternCounts.set(key, (patternCounts.get(key) ?? 0) + 1)
          }
        }

        const patternSummary = Array.from(patternCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([type, count]) => `  ${type}: ${count} files`)
          .join('\n')

        const topFiles = analyses
          .sort((a, b) => b.complexity - a.complexity)
          .slice(0, 10)
          .map(a => `  ${a.fileName} (${a.language}) - complexity: ${a.complexity}, patterns: ${a.patterns.length}`)
          .join('\n')

        return {
          type: 'text',
          value: `Analysis Results (${analyses.length} files):

Pattern Distribution:
${patternSummary}

Top Files by Complexity:
${topFiles}`,
        }
      }

      case 'preview': {
        const analyses = skillForge.analyze()
        const skills = skillForge.generateSkills(analyses)

        if (skills.length === 0) {
          return { type: 'text', value: 'No skills would be generated.' }
        }

        const skillList = skills.map(s => {
          const topPattern = s.patterns[0]
          return `  ${s.name}
    Description: ${s.description}
    Pattern: ${topPattern?.type} (${topPattern?.confidence?.toFixed(2)})
    Source files: ${s.sourceFiles.length}
    Output: ${s.skillPath}`
        }).join('\n\n')

        return {
          type: 'text',
          value: `Skills Preview (${skills.length} skills):\n\n${skillList}\n\nUse /skillforge run to generate and write.`,
        }
      }

      case 'clean': {
        const outputDir = '.claude/skills'
        if (!existsSync(outputDir)) {
          return { type: 'text', value: 'No skills directory to clean.' }
        }

        let cleaned = 0
        const entries = readdirSync(outputDir, { withFileTypes: true })
        for (const entry of entries) {
          if (entry.isDirectory() && entry.name.startsWith('auto-')) {
            const dirPath = join(outputDir, entry.name)
            rmSync(dirPath, { recursive: true, force: true })
            cleaned++
          }
        }

        return { type: 'text', value: `Cleaned ${cleaned} auto-generated skill directories.` }
      }

      case 'config': {
        const config = skillForge.getConfig()
        return {
          type: 'text',
          value: `SkillForge Config:
  Enabled: ${config.enabled}
  Source dirs: ${config.sourceDirs.join(', ')}
  Output dir: ${config.outputDir}
  Languages: ${config.languages.join(', ')}
  Min confidence: ${config.minConfidence}
  Max files: ${config.maxFilesToAnalyze}`,
        }
      }

      case 'help':
      default:
        return {
          type: 'text',
          value: `SkillForge - Auto-generate skills from codebase analysis

Commands:
  /skillforge analyze    Analyze codebase patterns (dry run)
  /skillforge preview    Preview skills that would be generated
  /skillforge run        Generate and write skills to disk
  /skillforge clean      Remove auto-generated skills
  /skillforge config     Show current configuration
  /skillforge help       Show this help

How it works:
  1. Scans source files for code patterns (API, state, events, etc.)
  2. Groups files by dominant pattern type
  3. Generates SKILL.md files for each pattern group
  4. Writes to .claude/skills/auto-<pattern>/

Pattern types detected:
  - api_endpoint, utility_function, data_transformer
  - state_manager, event_handler, middleware
  - validator, factory, strategy, observer
  - command, plugin_hook`,
        }
    }
  },
  isEnabled: () => true,
}

export default skillforgeCommand
