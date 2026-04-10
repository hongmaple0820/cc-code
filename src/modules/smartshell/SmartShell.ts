// Smart Shell - Intelligent Command Line Enhancement
// Provides command prediction, risk analysis, and output optimization

import { eventBus, EventTypes } from '../../core/events/eventBus.js'
import { container, createToken } from '../../core/di/container.js'

// Types
export interface SmartShellConfig {
  enabled: boolean
  riskAnalysis: boolean
  commandPrediction: boolean
  outputSummarization: boolean
  safeMode: boolean // Extra cautious mode
  maxSummaryLines: number
  dangerousCommandsRequireConfirm: boolean
  showAlternatives: boolean
}

export interface RiskAssessment {
  level: RiskLevel
  score: number // 0-100
  reasons: RiskReason[]
  mitigation?: string
  safeAlternative?: string
  requiresConfirmation: boolean
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export interface RiskReason {
  type: string
  description: string
  severity: number
}

export interface CommandPrediction {
  command: string
  confidence: number
  context: string
  basedOn: string[] // history items this is based on
}

export interface OutputSummary {
  originalLines: number
  summary: string
  keyPoints: string[]
  warnings: string[]
  errors: string[]
  truncated: boolean
}

export interface CommandHistory {
  command: string
  timestamp: number
  cwd: string
  exitCode: number
  output?: string
}

// Dangerous command patterns
const DANGEROUS_PATTERNS: Array<{ pattern: RegExp; level: RiskLevel; reason: string; mitigation?: string; alternative?: string }> = [
  {
    pattern: /rm\s+-rf?\s+\/\s*/,
    level: 'critical',
    reason: 'Will delete entire filesystem root',
    mitigation: 'This will destroy your system. Are you sure?',
    alternative: 'rm -rf /specific/path',
  },
  {
    pattern: /rm\s+-rf?\s+(~|\$HOME)/,
    level: 'critical',
    reason: 'Will delete home directory',
    mitigation: 'This will delete your home folder. Confirm?',
    alternative: 'rm -rf ~/specific/folder',
  },
  {
    pattern: /rm\s+-rf?\s+\.\.?/,
    level: 'high',
    reason: 'Recursive deletion with relative path',
    mitigation: 'Double-check the path before executing',
  },
  {
    pattern: /git\s+push\s+.*--force/,
    level: 'high',
    reason: 'Force push can overwrite remote changes',
    mitigation: 'Others may have pushed changes. Consider git push --force-with-lease',
    alternative: 'git push --force-with-lease',
  },
  {
    pattern: /git\s+reset\s+--hard/,
    level: 'high',
    reason: 'Will discard uncommitted changes',
    mitigation: 'Uncommitted changes will be lost. Stash them first?',
    alternative: 'git stash && git reset --hard',
  },
  {
    pattern: /git\s+clean\s+-fd/,
    level: 'medium',
    reason: 'Will delete untracked files',
    mitigation: 'Untracked files will be deleted. Check git status first?',
  },
  {
    pattern: /dd\s+if=.*of=\/dev\/(sd|hd|disk)/,
    level: 'critical',
    reason: 'Will overwrite disk directly',
    mitigation: 'This can corrupt your drive. Verify the device path?',
  },
  {
    pattern: /mkfs\./,
    level: 'critical',
    reason: 'Will format filesystem',
    mitigation: 'All data on target will be lost. Confirm?',
  },
  {
    pattern: /:(){ :|:& };:/,
    level: 'critical',
    reason: 'Fork bomb - will crash system',
    mitigation: 'This is a fork bomb. Do not execute.',
  },
  {
    pattern: /curl.*\|.*sh/,
    level: 'high',
    reason: 'Piping curl to shell is dangerous',
    mitigation: 'Remote code execution risk. Review the script first?',
    alternative: 'curl -o file.sh && review file.sh && bash file.sh',
  },
  {
    pattern: /wget.*\|.*sh/,
    level: 'high',
    reason: 'Piping wget to shell is dangerous',
    mitigation: 'Remote code execution risk. Review the script first?',
  },
  {
    pattern: /sudo\s+rm/,
    level: 'high',
    reason: 'Deleting with elevated privileges',
    mitigation: 'Running as root. Extra caution needed.',
  },
  {
    pattern: /sudo\s+dd/,
    level: 'critical',
    reason: 'Direct disk write with elevated privileges',
    mitigation: 'This can destroy your system. Verify everything twice.',
  },
  {
    pattern: /chmod\s+-R\s+777/,
    level: 'medium',
    reason: 'Making all files world-writable',
    mitigation: 'Security risk. Use more restrictive permissions?',
    alternative: 'chmod -R 755',
  },
  {
    pattern: /chown\s+-R/,
    level: 'medium',
    reason: 'Recursive ownership change',
    mitigation: 'Verify target path is correct',
  },
  {
    pattern: /find\s+.*-delete/,
    level: 'medium',
    reason: 'Will delete files matching pattern',
    mitigation: 'Preview with -print first?',
    alternative: 'find ... -print (preview) then find ... -delete',
  },
  {
    pattern: /docker\s+system\s+prune/,
    level: 'medium',
    reason: 'Will remove unused containers, networks, images',
    mitigation: 'This may delete resources you need later',
  },
  {
    pattern: /docker\s+rm.*-f/,
    level: 'low',
    reason: 'Force removing containers',
    mitigation: 'Containers will be deleted immediately',
  },
  {
    pattern: /npm\s+clean-install|npm\s+ci/,
    level: 'low',
    reason: 'Will delete node_modules and reinstall',
    mitigation: 'Your node_modules will be removed and rebuilt',
  },
  {
    pattern: /npm\s+audit\s+fix.*--force/,
    level: 'medium',
    reason: 'Force fixing may break dependencies',
    mitigation: 'Check for breaking changes after fix',
  },
]

// Smart Shell Engine
export class SmartShell {
  private config: SmartShellConfig
  private history: CommandHistory[] = []
  private maxHistorySize = 1000

  constructor(config: Partial<SmartShellConfig> = {}) {
    this.config = {
      enabled: true,
      riskAnalysis: true,
      commandPrediction: true,
      outputSummarization: true,
      safeMode: false,
      maxSummaryLines: 50,
      dangerousCommandsRequireConfirm: true,
      showAlternatives: true,
      ...config,
    }

    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    eventBus.on(EventTypes.TOOL_COMPLETED, (data) => {
      if (data.toolName === 'BashTool') {
        this.recordCommand(data.input.command, data.output, data.input.cwd, 0)
      }
    })
  }

  // Risk analysis
  analyzeRisk(command: string): RiskAssessment {
    if (!this.config.riskAnalysis) {
      return { level: 'low', score: 0, reasons: [], requiresConfirmation: false }
    }

    const reasons: RiskReason[] = []
    let highestLevel: RiskLevel = 'low'
    let requiresConfirm = false
    let mitigation: string | undefined
    let safeAlternative: string | undefined

    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.pattern.test(command)) {
        const severity = this.getSeverityScore(pattern.level)
        reasons.push({
          type: pattern.level,
          description: pattern.reason,
          severity,
        })

        if (this.compareRiskLevels(pattern.level, highestLevel) > 0) {
          highestLevel = pattern.level
        }

        if (pattern.level === 'high' || pattern.level === 'critical') {
          requiresConfirm = true
        }

        if (pattern.mitigation) mitigation = pattern.mitigation
        if (pattern.alternative) safeAlternative = pattern.alternative
      }
    }

    // Safe mode doubles caution
    if (this.config.safeMode && highestLevel !== 'low') {
      requiresConfirm = true
    }

    // Check for destructive operations
    if (this.isDestructiveCommand(command)) {
      reasons.push({
        type: 'destructive',
        description: 'This command may delete or modify data',
        severity: 30,
      })
    }

    const score = reasons.reduce((acc, r) => acc + r.severity, 0)

    return {
      level: highestLevel,
      score,
      reasons,
      mitigation,
      safeAlternative,
      requiresConfirmation: requiresConfirm && this.config.dangerousCommandsRequireConfirm,
    }
  }

  private getSeverityScore(level: RiskLevel): number {
    const scores = { low: 10, medium: 30, high: 60, critical: 100 }
    return scores[level]
  }

  private compareRiskLevels(a: RiskLevel, b: RiskLevel): number {
    const order = ['low', 'medium', 'high', 'critical']
    return order.indexOf(a) - order.indexOf(b)
  }

  private isDestructiveCommand(command: string): boolean {
    const destructive = ['rm', 'mv', 'dd', 'mkfs', 'format']
    const cmd = command.trim().toLowerCase().split(' ')[0]
    return destructive.some(d => cmd.includes(d))
  }

  // Command prediction
  predictNext(context?: string): CommandPrediction[] {
    if (!this.config.commandPrediction || this.history.length === 0) {
      return []
    }

    const predictions: CommandPrediction[] = []
    const recentCommands = this.history.slice(-20)

    // Pattern: git workflow
    const lastGitCommands = recentCommands
      .filter(h => h.command.startsWith('git'))
      .slice(-3)

    if (lastGitCommands.length > 0) {
      const lastGit = lastGitCommands[lastGitCommands.length - 1].command

      if (lastGit.includes('add')) {
        predictions.push({
          command: 'git commit -m "..."',
          confidence: 0.9,
          context: 'git workflow',
          basedOn: ['git add pattern'],
        })
      }

      if (lastGit.includes('commit')) {
        predictions.push({
          command: 'git push',
          confidence: 0.85,
          context: 'git workflow',
          basedOn: ['commit after add'],
        })
      }
    }

    // Pattern: test after edit
    const hasRecentEdit = recentCommands.some(h =>
      h.timestamp > Date.now() - 300000 && // 5 min
      (h.command.includes('edit') || h.command.includes('save'))
    )

    if (hasRecentEdit) {
      predictions.push({
        command: 'npm test',
        confidence: 0.7,
        context: 'development workflow',
        basedOn: ['file edited recently'],
      })
    }

    // Pattern: build before deploy
    const hasBuildCommand = recentCommands.some(h =>
      h.command.includes('build') || h.command.includes('compile')
    )

    if (hasBuildCommand) {
      predictions.push({
        command: 'deploy command',
        confidence: 0.6,
        context: 'deployment workflow',
        basedOn: ['recent build'],
      })
    }

    return predictions.sort((a, b) => b.confidence - a.confidence).slice(0, 3)
  }

  // Output summarization
  summarizeOutput(output: string, maxLines = this.config.maxSummaryLines): OutputSummary {
    if (!this.config.outputSummarization) {
      return {
        originalLines: output.split('\n').length,
        summary: output,
        keyPoints: [],
        warnings: [],
        errors: [],
        truncated: false,
      }
    }

    const lines = output.split('\n')
    const originalLines = lines.length

    if (originalLines <= maxLines) {
      return {
        originalLines,
        summary: output,
        keyPoints: this.extractKeyPoints(output),
        warnings: this.extractWarnings(output),
        errors: this.extractErrors(output),
        truncated: false,
      }
    }

    // Extract important lines
    const errors = this.extractErrors(output)
    const warnings = this.extractWarnings(output)
    const keyPoints = this.extractKeyPoints(output)

    // Build summary
    const summaryLines: string[] = []

    if (errors.length > 0) {
      summaryLines.push(`--- Errors (${errors.length}) ---`)
      summaryLines.push(...errors.slice(0, 5))
    }

    if (warnings.length > 0) {
      summaryLines.push(`\n--- Warnings (${warnings.length}) ---`)
      summaryLines.push(...warnings.slice(0, 5))
    }

    if (keyPoints.length > 0) {
      summaryLines.push(`\n--- Key Points ---`)
      summaryLines.push(...keyPoints.slice(0, 10))
    }

    // Add context from start and end
    summaryLines.push(`\n--- Output Preview ---`)
    summaryLines.push(...lines.slice(0, 10))
    summaryLines.push(`\n... ${originalLines - 20} lines omitted ...\n`)
    summaryLines.push(...lines.slice(-10))

    return {
      originalLines,
      summary: summaryLines.join('\n'),
      keyPoints,
      warnings,
      errors,
      truncated: true,
    }
  }

  private extractErrors(output: string): string[] {
    const lines = output.split('\n')
    return lines.filter(line =>
      /error|ERROR|failed|FAIL|exception|Exception|fatal|FATAL/i.test(line)
    )
  }

  private extractWarnings(output: string): string[] {
    const lines = output.split('\n')
    return lines.filter(line =>
      /warning|WARNING|warn|WARN|deprecated|DEPRECATED/i.test(line)
    )
  }

  private extractKeyPoints(output: string): string[] {
    const lines = output.split('\n')
    const keyPoints: string[] = []

    for (const line of lines) {
      // Success patterns
      if (/success|Success|✓|✅|passed|Passed|PASSED/i.test(line)) {
        keyPoints.push(line)
      }
      // Result patterns
      if (/result|Result|summary|Summary|total|Total/i.test(line)) {
        keyPoints.push(line)
      }
      // File patterns
      if (/created|Created|written|Written|saved|Saved/i.test(line)) {
        keyPoints.push(line)
      }
    }

    return keyPoints
  }

  // History management
  recordCommand(command: string, output: string, cwd: string, exitCode: number): void {
    this.history.push({
      command,
      timestamp: Date.now(),
      cwd,
      exitCode,
      output: output.substring(0, 1000), // Limit stored output
    })

    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize)
    }
  }

  getHistory(): CommandHistory[] {
    return [...this.history]
  }

  clearHistory(): void {
    this.history = []
  }

  // Safe command alternatives
  getSafeAlternative(command: string): string | undefined {
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.pattern.test(command) && pattern.alternative) {
        return pattern.alternative
      }
    }
    return undefined
  }

  // Config
  getConfig(): SmartShellConfig {
    return { ...this.config }
  }

  updateConfig(updates: Partial<SmartShellConfig>): void {
    this.config = { ...this.config, ...updates }
  }

  // Interactive confirmation
  shouldConfirm(command: string): boolean {
    if (!this.config.enabled) return false

    const assessment = this.analyzeRisk(command)
    return assessment.requiresConfirmation
  }

  getConfirmationMessage(command: string): string {
    const assessment = this.analyzeRisk(command)
    const parts: string[] = []

    parts.push(`⚠️  Risk Level: ${assessment.level.toUpperCase()}`)

    if (assessment.reasons.length > 0) {
      parts.push(`\nReasons:`)
      assessment.reasons.forEach(r => {
        parts.push(`  • ${r.description}`)
      })
    }

    if (assessment.mitigation) {
      parts.push(`\n⚡ ${assessment.mitigation}`)
    }

    if (assessment.safeAlternative && this.config.showAlternatives) {
      parts.push(`\n💡 Alternative: ${assessment.safeAlternative}`)
    }

    parts.push(`\nExecute: ${command}`)
    parts.push(`\nConfirm? (yes/no)`)

    return parts.join('\n')
  }
}

// Export singleton
export const smartShell = new SmartShell()

// DI registration
export const SMART_SHELL_TOKEN = createToken<SmartShell>('SmartShell')
container.registerValue(SMART_SHELL_TOKEN, smartShell)
