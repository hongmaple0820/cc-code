// Buddy AI - Enhanced Companion System
// Provides productivity assistance through the pet companion

import { eventBus, EventTypes } from '../../core/events/eventBus.js'
import { container, createToken } from '../../core/di/container.js'
import type { Companion, Rarity, Species, StatName } from '../../buddy/types.js'

// Types
export interface BuddyAIConfig {
  enabled: boolean
  emotionDetection: boolean
  productivityAssistance: boolean
  celebrationEnabled: boolean
  codeQualityReflection: boolean
  personalityAdaptation: boolean
  breakReminders: boolean
  workSessionTracking: boolean
}

export interface EmotionState {
  type: EmotionType
  intensity: number // 0-1
  detectedAt: number
  source: string
}

export type EmotionType =
  | 'frustrated'
  | 'focused'
  | 'tired'
  | 'celebratory'
  | 'confused'
  | 'neutral'

export interface ProductivityMetrics {
  codeLinesWritten: number
  testsRun: number
  commitsMade: number
  filesModified: number
  errorsEncountered: number
  errorsFixed: number
  sessionDuration: number
  breakCount: number
}

export interface CodeQualityMetrics {
  complexity: number
  testCoverage: number
  lintErrors: number
  typeErrors: number
  maintainability: number
}

export interface BuddyReaction {
  animation: string
  message: string
  duration: number
  priority: number
}

export interface WorkSession {
  id: string
  startedAt: number
  endedAt?: number
  project: string
  tasks: string[]
  metrics: ProductivityMetrics
}

// Buddy AI Engine
export class BuddyAI {
  private config: BuddyAIConfig
  private currentEmotion: EmotionState = { type: 'neutral', intensity: 0, detectedAt: Date.now(), source: 'initial' }
  private currentSession: WorkSession | null = null
  private sessions: WorkSession[] = []
  private lastBreakTime: number = Date.now()
  private productivityMetrics: ProductivityMetrics = {
    codeLinesWritten: 0,
    testsRun: 0,
    commitsMade: 0,
    filesModified: 0,
    errorsEncountered: 0,
    errorsFixed: 0,
    sessionDuration: 0,
    breakCount: 0,
  }

  // Negative emotion keywords (from original code)
  private frustrationKeywords = [
    'ffs', 'damn', 'shitty', 'crap', 'wtf', 'ugh',
    'broken', 'bug', 'error', 'fail', 'stupid',
    'annoying', 'frustrating', 'hate this', 'not working'
  ]

  // Celebration triggers
  private celebrationTriggers = [
    'success', 'passed', 'working', 'fixed', 'done', 'complete',
    'deployed', 'merged', 'ship it', 'looks good'
  ]

  constructor(config: Partial<BuddyAIConfig> = {}) {
    this.config = {
      enabled: true,
      emotionDetection: true,
      productivityAssistance: true,
      celebrationEnabled: true,
      codeQualityReflection: true,
      personalityAdaptation: true,
      breakReminders: true,
      workSessionTracking: true,
      ...config,
    }

    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    // Listen for code changes
    eventBus.on(EventTypes.TOOL_COMPLETED, (data) => {
      if (data.toolName === 'FileEditTool') {
        this.onCodeChange(data)
      }
      if (data.toolName === 'BashTool' && data.output?.includes('test')) {
        this.onTestRun(data)
      }
    })

    // Listen for user input
    eventBus.on(EventTypes.USER_INPUT, (data) => {
      this.analyzeUserInput(data.input)
    })

    // Listen for errors
    eventBus.on(EventTypes.TOOL_FAILED, (data) => {
      this.onError(data)
    })

    // Listen for session events
    eventBus.on(EventTypes.SESSION_STARTED, () => {
      this.startWorkSession()
    })

    eventBus.on(EventTypes.SESSION_ENDED, () => {
      this.endWorkSession()
    })
  }

  // Emotion detection
  analyzeUserInput(input: string): BuddyReaction | null {
    if (!this.config.emotionDetection) return null

    const lowerInput = input.toLowerCase()

    // Check for frustration
    for (const keyword of this.frustrationKeywords) {
      if (lowerInput.includes(keyword)) {
        this.updateEmotion('frustrated', 0.7, `keyword: ${keyword}`)
        return this.getFrustrationReaction()
      }
    }

    // Check for celebration
    for (const trigger of this.celebrationTriggers) {
      if (lowerInput.includes(trigger)) {
        this.updateEmotion('celebratory', 0.8, `trigger: ${trigger}`)
        return this.getCelebrationReaction()
      }
    }

    // Check for confusion/questions
    if (input.includes('?') || lowerInput.includes('how to') || lowerInput.includes('what is')) {
      this.updateEmotion('confused', 0.4, 'question detected')
      return this.getHelpReaction()
    }

    return null
  }

  private updateEmotion(type: EmotionType, intensity: number, source: string): void {
    this.currentEmotion = { type, intensity, detectedAt: Date.now(), source }
    eventBus.emit('buddy:emotion:changed', this.currentEmotion)
  }

  // Reaction generators
  private getFrustrationReaction(): BuddyReaction {
    const reactions: BuddyReaction[] = [
      { animation: 'concerned', message: 'Take a deep breath. Want me to help debug?', duration: 3000, priority: 8 },
      { animation: 'thinking', message: 'Stuck? Maybe a quick break would help!', duration: 3000, priority: 7 },
      { animation: 'encouraging', message: 'You\'ve got this! Let\'s tackle it together.', duration: 3000, priority: 7 },
    ]
    return reactions[Math.floor(Math.random() * reactions.length)]
  }

  private getCelebrationReaction(): BuddyReaction {
    if (!this.config.celebrationEnabled) return { animation: 'happy', message: '', duration: 0, priority: 0 }

    const reactions: BuddyReaction[] = [
      { animation: 'celebrate', message: '🎉 Awesome work!', duration: 2000, priority: 9 },
      { animation: 'dance', message: '✨ Looking good!', duration: 2000, priority: 9 },
      { animation: 'sparkle', message: '⭐ Great progress!', duration: 2000, priority: 8 },
    ]
    return reactions[Math.floor(Math.random() * reactions.length)]
  }

  private getHelpReaction(): BuddyReaction {
    return {
      animation: 'helpful',
      message: 'Need a hand? Try /help or ask me anything!',
      duration: 3000,
      priority: 5,
    }
  }

  private getTiredReaction(): BuddyReaction {
    return {
      animation: 'sleepy',
      message: 'You\'ve been working hard. Time for a break?',
      duration: 4000,
      priority: 8,
    }
  }

  // Productivity tracking
  private onCodeChange(data: { input: any; output: any }): void {
    if (!this.config.productivityAssistance) return

    this.productivityMetrics.filesModified++
    this.productivityMetrics.codeLinesWritten += this.estimateLinesChanged(data.input)

    // Check if need break reminder
    if (this.config.breakReminders && this.shouldSuggestBreak()) {
      const reaction = this.getTiredReaction()
      eventBus.emit('buddy:reaction', reaction)
    }
  }

  private onTestRun(data: { output: string }): void {
    this.productivityMetrics.testsRun++

    if (data.output.includes('pass') || data.output.includes('✓')) {
      this.updateEmotion('celebratory', 0.6, 'tests passed')
      const reaction = this.getCelebrationReaction()
      eventBus.emit('buddy:reaction', reaction)
    }
  }

  private onError(data: { error: any }): void {
    this.productivityMetrics.errorsEncountered++
    this.updateEmotion('frustrated', 0.5, 'error occurred')
  }

  private estimateLinesChanged(input: any): number {
    // Rough estimation based on edit size
    if (input?.newString) {
      return input.newString.split('\n').length
    }
    return 1
  }

  // Break management
  private shouldSuggestBreak(): boolean {
    const workDuration = Date.now() - this.lastBreakTime
    const minutesSinceBreak = workDuration / 60000

    // Suggest break every 45 minutes
    return minutesSinceBreak > 45
  }

  recordBreak(): void {
    this.lastBreakTime = Date.now()
    this.productivityMetrics.breakCount++
    eventBus.emit('buddy:break:taken', { timestamp: this.lastBreakTime })
  }

  // Session management
  private startWorkSession(): void {
    if (!this.config.workSessionTracking) return

    this.currentSession = {
      id: `session-${Date.now()}`,
      startedAt: Date.now(),
      project: process.cwd(),
      tasks: [],
      metrics: { ...this.productivityMetrics },
    }

    this.lastBreakTime = Date.now()
    eventBus.emit('buddy:session:started', this.currentSession)
  }

  private endWorkSession(): void {
    if (!this.currentSession) return

    this.currentSession.endedAt = Date.now()
    this.currentSession.metrics = { ...this.productivityMetrics }
    this.sessions.push(this.currentSession)

    // Generate session summary
    const summary = this.generateSessionSummary()
    eventBus.emit('buddy:session:ended', { session: this.currentSession, summary })

    this.currentSession = null
  }

  private generateSessionSummary(): string {
    const m = this.productivityMetrics
    const duration = Math.round(m.sessionDuration / 60000) // minutes

    return `Session Summary:
- Duration: ${duration} minutes
- Files modified: ${m.filesModified}
- Tests run: ${m.testsRun}
- Breaks taken: ${m.breakCount}
- Errors fixed: ${m.errorsFixed}/${m.errorsEncountered}`
  }

  // Code quality reflection
  reflectCodeQuality(metrics: CodeQualityMetrics): BuddyReaction | null {
    if (!this.config.codeQualityReflection) return null

    if (metrics.complexity > 10) {
      return {
        animation: 'thinking',
        message: 'That function is getting complex. Consider refactoring?',
        duration: 4000,
        priority: 6,
      }
    }

    if (metrics.testCoverage < 50) {
      return {
        animation: 'concerned',
        message: 'Test coverage is low. Want to add some tests?',
        duration: 4000,
        priority: 5,
      }
    }

    if (metrics.lintErrors > 0) {
      return {
        animation: 'sweeping',
        message: 'Let\'s clean up those lint errors!',
        duration: 3000,
        priority: 4,
      }
    }

    return null
  }

  // Achievement celebration
  celebrateAchievement(type: string): BuddyReaction {
    const achievements: Record<string, BuddyReaction> = {
      'first_commit': { animation: 'celebrate', message: '🎉 First commit! Keep it up!', duration: 3000, priority: 10 },
      'test_passed': { animation: 'dance', message: '✅ Tests passing! Nice work!', duration: 2000, priority: 8 },
      'pr_merged': { animation: 'fireworks', message: '🚀 PR merged! You\'re on fire!', duration: 3000, priority: 10 },
      'refactor_complete': { animation: 'sparkle', message: '✨ Refactoring done! Code looks cleaner!', duration: 2500, priority: 8 },
      'bug_fixed': { animation: 'happy', message: '🐛 Bug squashed! Great debugging!', duration: 2500, priority: 9 },
      'streak_10': { animation: 'rainbow', message: '🔥 10 commits in a row! Amazing!', duration: 3000, priority: 10 },
    }

    return achievements[type] || { animation: 'happy', message: '🎉 Achievement unlocked!', duration: 2000, priority: 7 }
  }

  // Stats for companion
  getStatsForRarity(rarity: Rarity): Record<StatName, number> {
    // Base stats modified by rarity
    const baseStats: Record<StatName, number> = {
      DEBUGGING: 50,
      PATIENCE: 50,
      CHAOS: 50,
      WISDOM: 50,
      SNARK: 50,
    }

    // Rarity multipliers
    const multipliers: Record<Rarity, Partial<Record<StatName, number>>> = {
      common: { WISDOM: 1.0, PATIENCE: 1.0 },
      uncommon: { WISDOM: 1.1, DEBUGGING: 1.1 },
      rare: { WISDOM: 1.2, DEBUGGING: 1.2, SNARK: 1.1 },
      epic: { WISDOM: 1.3, DEBUGGING: 1.3, PATIENCE: 1.2 },
      legendary: { WISDOM: 1.5, DEBUGGING: 1.4, PATIENCE: 1.3, SNARK: 1.2 },
    }

    const multiplier = multipliers[rarity]
    const result = { ...baseStats }

    for (const [stat, mult] of Object.entries(multiplier)) {
      result[stat as StatName] = Math.min(100, Math.round(result[stat as StatName] * mult))
    }

    return result
  }

  // Personality based on species
  getPersonalityForSpecies(species: Species): string {
    const personalities: Record<Species, string> = {
      duck: 'Playful and curious, always ready to explore new code',
      goose: 'Protective and vigilant, watches for bugs carefully',
      blob: 'Adaptable and flexible, molds to any situation',
      cat: 'Independent and clever, solves problems in unique ways',
      dragon: 'Powerful and confident, tackles big challenges head-on',
      octopus: 'Multitasking genius, handles many files at once',
      owl: 'Wise and thoughtful, gives careful consideration',
      penguin: 'Reliable and hardworking, thrives in any environment',
      turtle: 'Patient and steady, slow and steady wins the race',
      snail: 'Deliberate and thorough, checks every detail',
      ghost: 'Mysterious and insightful, sees hidden bugs',
      axolotl: 'Cheerful and resilient, always bounces back',
      capybara: 'Chill and friendly, keeps the team together',
      cactus: 'Tough and self-sufficient, needs little maintenance',
      robot: 'Efficient and logical, optimizes everything',
      rabbit: 'Quick and energetic, hops between tasks',
      mushroom: 'Growth-oriented, helps code flourish',
      chonk: 'Substantial and supportive, always there for you',
    }

    return personalities[species] || 'Mysterious and unique'
  }

  // Get current state
  getCurrentEmotion(): EmotionState {
    return { ...this.currentEmotion }
  }

  getProductivityMetrics(): ProductivityMetrics {
    return { ...this.productivityMetrics }
  }

  getCurrentSession(): WorkSession | null {
    return this.currentSession ? { ...this.currentSession } : null
  }

  getConfig(): BuddyAIConfig {
    return { ...this.config }
  }

  updateConfig(updates: Partial<BuddyAIConfig>): void {
    this.config = { ...this.config, ...updates }
  }
}

// Export singleton
export const buddyAI = new BuddyAI()

// DI registration
export const BUDDY_AI_TOKEN = createToken<BuddyAI>('BuddyAI')
container.registerValue(BUDDY_AI_TOKEN, buddyAI)
