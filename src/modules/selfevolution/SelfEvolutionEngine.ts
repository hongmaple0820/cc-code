// Self-Evolution Engine - Feedback-driven behavior adaptation
// Closes the loop: observe user behavior -> learn patterns -> adjust -> verify

import { eventBus, EventTypes } from '../../core/events/eventBus.js'
import { container, createToken } from '../../core/di/container.js'
import { longTermTaskEngine } from '../longterm/TaskEngine.js'
import { knowledgeBase } from '../knowledgebase/KnowledgeBase.js'
import { skillForge } from '../skillforge/SkillForge.js'
import {
  existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync,
} from 'fs'
import { join } from 'path'

// Behavior types
export type BehaviorType =
  | 'skill_used'        // User invoked a skill
  | 'skill_ignored'     // Skill was available but not used
  | 'suggestion_accepted' // User accepted a proactive suggestion
  | 'suggestion_rejected' // User rejected a suggestion
  | 'command_repeated'  // User ran same command multiple times
  | 'error_recovered'   // User recovered from an error
  | 'workflow_changed'  // User changed their typical workflow
  | 'tool_blocked'      // User blocked a tool execution

export interface BehaviorEvent {
  type: BehaviorType
  target: string        // skill name, command, suggestion type, etc.
  sessionId: string
  timestamp: number
  context: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export interface BehaviorPattern {
  id: string
  type: string
  confidence: number
  evidence: BehaviorEvent[]
  description: string
  suggestedAdjustment: string
  createdAt: number
  updatedAt: number
}

// Adaptive settings (things the system can auto-adjust)
export interface AdaptiveSettings {
  // Suggestion behavior
  suggestionFrequency: number       // 0-1, how often to suggest
  suggestionConfidenceThreshold: number // min confidence before suggesting
  cooldownMs: number                // min time between suggestions

  // Skill behavior
  skillDiscoveryAggressiveness: number // 0-1, how eagerly to suggest new skills
  autoSkillGeneration: boolean       // whether to auto-generate skills

  // Knowledge behavior
  autoKnowledgeExtraction: boolean   // extract knowledge from failures
  knowledgeConsolidationInterval: number // ms between consolidations

  // Task behavior
  autoCheckpoint: boolean           // auto-create checkpoints
  maxConcurrentTasks: number        // max parallel tasks
  autoRecovery: boolean             // auto-recover paused tasks

  // Learning
  learningRate: number              // how fast to adapt (0-1)
  minEvidenceCount: number          // min events before adjusting
}

const DEFAULT_SETTINGS: AdaptiveSettings = {
  suggestionFrequency: 0.3,
  suggestionConfidenceThreshold: 0.6,
  cooldownMs: 30000,
  skillDiscoveryAggressiveness: 0.5,
  autoSkillGeneration: false,
  autoKnowledgeExtraction: true,
  knowledgeConsolidationInterval: 24 * 60 * 60 * 1000, // 24h
  autoCheckpoint: true,
  maxConcurrentTasks: 3,
  autoRecovery: true,
  learningRate: 0.1,
  minEvidenceCount: 5,
}

const SETTINGS_FILE = '.omc/evolution/settings.json'
const EVENTS_FILE = '.omc/evolution/events.json'

function ensureEvolutionDir(): void {
  const dir = join('.omc', 'evolution')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

// Self-Evolution Engine
export class SelfEvolutionEngine {
  private settings: AdaptiveSettings
  private events: BehaviorEvent[] = []
  private patterns: BehaviorPattern[] = []
  private lastConsolidation = 0
  private eventCounts = new Map<string, number>()

  constructor() {
    this.settings = { ...DEFAULT_SETTINGS }
    this.loadSettings()
    this.loadEvents()
  }

  // Initialize
  async initialize(): Promise<void> {
    ensureEvolutionDir()
    await knowledgeBase.initialize()
    await longTermTaskEngine.initialize()

    // Set up event listeners
    this.setupListeners()

    // Check if consolidation needed
    this.checkConsolidation()
  }

  // Set up listeners on system events
  private setupListeners(): void {
    // Track tool usage
    eventBus.on(EventTypes.TOOL_CALLED, (data) => {
      this.recordEvent({
        type: 'tool_blocked', // will be refined based on outcome
        target: data.toolName,
        sessionId: this.getSessionId(),
        timestamp: Date.now(),
        context: { tool: data.toolName },
      })
    })

    // Track skill usage (from command events)
    eventBus.on('skill:used', (data) => {
      this.recordEvent({
        type: 'skill_used',
        target: data.skillName,
        sessionId: this.getSessionId(),
        timestamp: Date.now(),
        context: data,
      })
    })

    // Track Kairos suggestion acceptance/rejection
    eventBus.on('kairos:suggestion_accepted', (data) => {
      this.recordEvent({
        type: 'suggestion_accepted',
        target: data.suggestionType,
        sessionId: this.getSessionId(),
        timestamp: Date.now(),
        context: data,
      })
    })

    eventBus.on('kairos:suggestion_rejected', (data) => {
      this.recordEvent({
        type: 'suggestion_rejected',
        target: data.suggestionType,
        sessionId: this.getSessionId(),
        timestamp: Date.now(),
        context: data,
      })
    })

    // Track task failures -> auto-extract knowledge
    eventBus.on('taskengine:task:failed', (data) => {
      if (this.settings.autoKnowledgeExtraction) {
        this.extractKnowledgeFromFailure(data.taskId, data.error)
      }
    })
  }

  // Record a behavior event
  recordEvent(event: BehaviorEvent): void {
    this.events.push(event)

    // Count events by type
    this.eventCounts.set(event.type, (this.eventCounts.get(event.type) ?? 0) + 1)

    // Keep only recent events (last 1000)
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000)
    }

    // Save periodically
    if (this.events.length % 10 === 0) {
      this.saveEvents()
    }

    // Check if enough evidence for pattern detection
    this.detectPatterns()
  }

  // Detect patterns from accumulated events
  private detectPatterns(): void {
    const minEvidence = this.settings.minEvidenceCount

    // Pattern: Repeatedly rejected suggestions -> lower confidence threshold
    const rejections = this.events.filter(e => e.type === 'suggestion_rejected')
    if (rejections.length >= minEvidence) {
      this.addOrUpdatePattern({
        type: 'suggestion_rejection_fatigue',
        description: 'User consistently rejects suggestions, threshold too low',
        suggestedAdjustment: 'Increase suggestionConfidenceThreshold',
        evidence: rejections.slice(-minEvidence),
      })
    }

    // Pattern: Repeated skill usage -> suggest related skills
    const skillUsage = this.events.filter(e => e.type === 'skill_used')
    if (skillUsage.length >= minEvidence) {
      const skillCounts = new Map<string, number>()
      for (const e of skillUsage) {
        skillCounts.set(e.target, (skillCounts.get(e.target) ?? 0) + 1)
      }
      const topSkills = Array.from(skillCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)

      this.addOrUpdatePattern({
        type: 'favorite_skills',
        description: `Most used skills: ${topSkills.map(s => s[0]).join(', ')}`,
        suggestedAdjustment: 'Prioritize these skills in suggestions, suggest related ones',
        evidence: skillUsage.slice(-minEvidence),
      })
    }

    // Pattern: Repeated command execution -> suggest workflow automation
    const toolCalls = this.events.filter(e => e.type === 'tool_blocked' || e.target)
    const cmdCounts = new Map<string, number>()
    for (const e of toolCalls) {
      cmdCounts.set(e.target, (cmdCounts.get(e.target) ?? 0) + 1)
    }
    const repeatedCmds = Array.from(cmdCounts.entries()).filter(([, count]) => count >= minEvidence)
    if (repeatedCmds.length > 0) {
      this.addOrUpdatePattern({
        type: 'repeated_commands',
        description: `Commands run ${minEvidence}+ times: ${repeatedCmds.map(c => c[0]).join(', ')}`,
        suggestedAdjustment: 'Consider creating automated workflows for these',
        evidence: toolCalls.slice(-minEvidence * 2),
      })
    }

    // Apply adjustments for high-confidence patterns
    this.applyAdjustments()
  }

  private addOrUpdatePattern(pattern: Omit<BehaviorPattern, 'id' | 'confidence' | 'createdAt' | 'updatedAt'>): void {
    const existing = this.patterns.find(p => p.type === pattern.type)
    const now = Date.now()

    if (existing) {
      existing.evidence = [...pattern.evidence]
      existing.description = pattern.description
      existing.suggestedAdjustment = pattern.suggestedAdjustment
      existing.updatedAt = now
      existing.confidence = Math.min(1, existing.evidence.length / (this.settings.minEvidenceCount * 3))
    } else {
      this.patterns.push({
        ...pattern,
        id: `pattern-${now}-${Math.random().toString(36).substr(2, 6)}`,
        confidence: pattern.evidence.length / (this.settings.minEvidenceCount * 2),
        createdAt: now,
        updatedAt: now,
      })
    }
  }

  // Apply adjustments based on patterns
  private applyAdjustments(): void {
    let changed = false

    for (const pattern of this.patterns) {
      if (pattern.confidence < 0.5) continue

      switch (pattern.type) {
        case 'suggestion_rejection_fatigue':
          if (this.settings.suggestionConfidenceThreshold < 0.9) {
            this.settings.suggestionConfidenceThreshold = Math.min(0.9, this.settings.suggestionConfidenceThreshold + 0.1)
            changed = true
          }
          break

        case 'favorite_skills':
          // Don't adjust settings, just record as knowledge
          this.recordKnowledgeFromPattern(pattern)
          break

        case 'repeated_commands':
          if (!this.settings.autoSkillGeneration && pattern.confidence > 0.7) {
            this.settings.autoSkillGeneration = true
            changed = true
          }
          break
      }
    }

    if (changed) {
      this.saveSettings()
      eventBus.emit('evolution:settings:changed', { settings: this.settings })
    }
  }

  // Extract knowledge from task failures
  private extractKnowledgeFromFailure(taskId: string, error: string): void {
    const entry = knowledgeBase.extractFromTaskResult(taskId, 'Unknown Task', null, error)
    if (entry) {
      eventBus.emit('knowledgebase:added', { id: entry.id, source: 'auto-extracted from failure' })
    }
  }

  // Record knowledge from patterns
  private recordKnowledgeFromPattern(pattern: BehaviorPattern): void {
    // Only record once per pattern
    const existing = knowledgeBase.query({ tags: [`pattern:${pattern.type}`] })
    if (existing.length > 0) return

    knowledgeBase.add({
      title: `User Behavior: ${pattern.type}`,
      type: 'pattern',
      tags: [`pattern:${pattern.type}`, 'auto-extracted', 'behavior'],
      content: `${pattern.description}\n\nSuggested adjustment: ${pattern.suggestedAdjustment}\nConfidence: ${pattern.confidence.toFixed(2)}`,
      verified: false,
    })
  }

  // Check if consolidation is due
  private checkConsolidation(): void {
    const now = Date.now()
    if (now - this.lastConsolidation > this.settings.knowledgeConsolidationInterval) {
      this.consolidate()
    }
  }

  // Run consolidation across all systems
  consolidate(): void {
    // Compact old tasks
    const compacted = longTermTaskEngine.compact()

    // Consolidate knowledge
    const kbResult = knowledgeBase.consolidate()

    // Trim old events
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000 // 7 days
    this.events = this.events.filter(e => e.timestamp > cutoff)
    this.saveEvents()

    // Clear low-confidence patterns
    this.patterns = this.patterns.filter(p => p.confidence > 0.3)

    this.lastConsolidation = Date.now()

    eventBus.emit('evolution:consolidated', {
      tasksCompacted: compacted,
      knowledgeRemoved: kbResult.removed,
      knowledgeMerged: kbResult.merged,
    })
  }

  // Get current adaptive settings
  getSettings(): AdaptiveSettings {
    return { ...this.settings }
  }

  // Update settings
  updateSettings(updates: Partial<AdaptiveSettings>): void {
    this.settings = { ...this.settings, ...updates }
    this.saveSettings()
    eventBus.emit('evolution:settings:changed', { settings: this.settings })
  }

  // Get detected patterns
  getPatterns(): BehaviorPattern[] {
    return [...this.patterns].sort((a, b) => b.confidence - a.confidence)
  }

  // Get event stats
  getEventStats(): {
    total: number
    byType: Record<string, number>
    recentBehaviorEvents: BehaviorEvent[]
    patterns: number
  } {
    const byType: Record<string, number> = {}
    for (const event of this.events) {
      byType[event.type] = (byType[event.type] ?? 0) + 1
    }
    return {
      total: this.events.length,
      byType,
      recentBehaviorEvents: this.events.slice(-20),
      patterns: this.patterns.length,
    }
  }

  // Generate evolution report
  getEvolutionReport(): string {
    const stats = this.getEventStats()
    const patterns = this.getPatterns()
    const kbStats = knowledgeBase.getStats()
    const taskStats = longTermTaskEngine.getStats()

    const patternLines = patterns.map(p =>
      `  [${p.confidence.toFixed(2)}] ${p.type}: ${p.description}`
    ).join('\n')

    return `Self-Evolution Report:

Behavior Events: ${stats.total}
  By Type: ${Object.entries(stats.byType).map(([k, v]) => `${k}: ${v}`).join(', ')}

Detected Patterns (${patterns.length}):
${patternLines || '  No patterns detected yet'}

Knowledge Base:
  Total entries: ${kbStats.total}
  Verified: ${kbStats.verifiedCount}
  Avg relevance: ${kbStats.avgRelevance.toFixed(2)}

Task Engine:
  Total tasks: ${taskStats.total}
  Completed: ${taskStats.byState.completed ?? 0}
  Failure rate: ${(taskStats.failureRate * 100).toFixed(1)}%

Adaptive Settings:
  Suggestion frequency: ${this.settings.suggestionFrequency}
  Suggestion threshold: ${this.settings.suggestionConfidenceThreshold}
  Auto skill generation: ${this.settings.autoSkillGeneration}
  Auto knowledge extraction: ${this.settings.autoKnowledgeExtraction}
  Learning rate: ${this.settings.learningRate}`
  }

  // Persistence
  private loadSettings(): void {
    try {
      if (existsSync(SETTINGS_FILE)) {
        const data = readFileSync(SETTINGS_FILE, 'utf-8')
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(data) }
      }
    } catch {
      // use defaults
    }
  }

  private saveSettings(): void {
    try {
      ensureEvolutionDir()
      writeFileSync(SETTINGS_FILE, JSON.stringify(this.settings, null, 2))
    } catch {
      // ignore
    }
  }

  private loadEvents(): void {
    try {
      if (existsSync(EVENTS_FILE)) {
        const data = readFileSync(EVENTS_FILE, 'utf-8')
        this.events = JSON.parse(data)
      }
    } catch {
      this.events = []
    }
  }

  private saveEvents(): void {
    try {
      ensureEvolutionDir()
      writeFileSync(EVENTS_FILE, JSON.stringify(this.events.slice(-500), null, 2))
    } catch {
      // ignore
    }
  }

  private getSessionId(): string {
    return process.env.CLAUDE_CODE_SESSION_ID ?? 'unknown'
  }
}

// Export singleton
export const selfEvolutionEngine = new SelfEvolutionEngine()

// DI registration
export const SELF_EVOLUTION_ENGINE_TOKEN = createToken<SelfEvolutionEngine>('SelfEvolutionEngine')
container.registerValue(SELF_EVOLUTION_ENGINE_TOKEN, selfEvolutionEngine)
