// Kairos Engine - Proactive Assistant Mode
// Provides autonomous observation and action capabilities

import { eventBus, EventTypes } from '../../core/events/eventBus.js'
import { container, createToken } from '../../core/di/container.js'

// Types
export interface KairosConfig {
  enabled: boolean
  tickInterval: number // milliseconds between ticks
  maxActiveTasks: number
  contextWindowSize: number
  enableMemoryConsolidation: boolean
  enableAutoActions: boolean
  briefMode: boolean
}

export interface KairosObservation {
  type: ObservationType
  timestamp: number
  context: ObservationContext
  relevance: number // 0-1
  suggestedAction?: SuggestedAction
}

export type ObservationType =
  | 'code_change'
  | 'test_failure'
  | 'long_operation'
  | 'user_frustration'
  | 'opportunity'
  | 'memory_trigger'
  | 'time_based'

export interface ObservationContext {
  filePath?: string
  codeSnippet?: string
  errorMessage?: string
  duration?: number
  userInput?: string
  timestamp: number
}

export interface SuggestedAction {
  type: string
  description: string
  confidence: number
  execute: () => Promise<void>
}

export interface KairosTask {
  id: string
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  priority: number
  createdAt: number
  startedAt?: number
  completedAt?: number
}

// Memory consolidation phases
export type ConsolidationPhase = 'orient' | 'gather' | 'consolidate' | 'prune'

export interface ConsolidationState {
  phase: ConsolidationPhase
  startedAt: number
  itemsProcessed: number
  itemsConsolidated: number
}

// Kairos Engine
export class KairosEngine {
  private config: KairosConfig
  private active = false
  private paused = false
  private tickTimer: NodeJS.Timeout | null = null
  private observations: KairosObservation[] = []
  private tasks: KairosTask[] = []
  private consolidationState: ConsolidationState | null = null

  // Trigger patterns
  private triggers: Map<ObservationType, TriggerConfig> = new Map([
    ['code_change', { minRelevance: 0.3, cooldown: 5000 }],
    ['test_failure', { minRelevance: 0.8, cooldown: 0 }],
    ['long_operation', { minRelevance: 0.5, cooldown: 30000 }],
    ['user_frustration', { minRelevance: 0.6, cooldown: 60000 }],
    ['opportunity', { minRelevance: 0.4, cooldown: 10000 }],
    ['memory_trigger', { minRelevance: 0.3, cooldown: 60000 }],
    ['time_based', { minRelevance: 0.2, cooldown: 300000 }],
  ])

  private lastTriggerTime: Map<ObservationType, number> = new Map()

  constructor(config: Partial<KairosConfig> = {}) {
    this.config = {
      enabled: true,
      tickInterval: 15000, // 15 seconds
      maxActiveTasks: 3,
      contextWindowSize: 10,
      enableMemoryConsolidation: true,
      enableAutoActions: false, // Disabled by default for safety
      briefMode: false,
      ...config,
    }
  }

  // Lifecycle
  activate(): void {
    if (this.active) return
    this.active = true
    this.paused = false
    this.startTicking()
    eventBus.emit(EventTypes.KAIROS_ACTIVATED, { timestamp: Date.now() })
  }

  deactivate(): void {
    this.active = false
    this.paused = false
    this.stopTicking()
    eventBus.emit(EventTypes.KAIROS_DEACTIVATED, { timestamp: Date.now() })
  }

  pause(): void {
    this.paused = true
    eventBus.emit(EventTypes.KAIROS_PAUSED, { timestamp: Date.now() })
  }

  resume(): void {
    this.paused = false
    eventBus.emit(EventTypes.KAIROS_RESUMED, { timestamp: Date.now() })
  }

  isActive(): boolean {
    return this.active && !this.paused
  }

  // Tick system
  private startTicking(): void {
    if (this.tickTimer) return
    this.tickTimer = setInterval(() => this.onTick(), this.config.tickInterval)
  }

  private stopTicking(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer)
      this.tickTimer = null
    }
  }

  private async onTick(): Promise<void> {
    if (!this.isActive()) return

    // Check for time-based observations
    this.observeTimeBased()

    // Check memory consolidation schedule
    if (this.shouldConsolidate()) {
      await this.runMemoryConsolidation()
    }

    // Process pending observations
    await this.processObservations()

    // Check for auto-actions
    if (this.config.enableAutoActions) {
      await this.executeAutoActions()
    }
  }

  // Observation system
  observe(type: ObservationType, context: ObservationContext, relevance: number): void {
    const observation: KairosObservation = {
      type,
      timestamp: Date.now(),
      context,
      relevance,
    }

    this.observations.push(observation)

    // Trim old observations
    if (this.observations.length > this.config.contextWindowSize * 2) {
      this.observations = this.observations.slice(-this.config.contextWindowSize)
    }

    eventBus.emit(EventTypes.KAIROS_OBSERVATION, observation)
  }

  private observeTimeBased(): void {
    const now = Date.now()
    const lastActivity = this.getLastActivityTime()
    const idleTime = now - lastActivity

    // Long idle - suggest break or checkpoint
    if (idleTime > 300000) { // 5 minutes
      this.observe('time_based', { timestamp: now }, 0.3)
    }
  }

  private getLastActivityTime(): number {
    if (this.observations.length === 0) return Date.now()
    return this.observations[this.observations.length - 1].timestamp
  }

  // Process observations and trigger actions
  private async processObservations(): Promise<void> {
    const pendingObservations = this.observations.filter(o => !o.suggestedAction)

    for (const observation of pendingObservations) {
      const action = await this.suggestAction(observation)
      if (action) {
        observation.suggestedAction = action
        this.notifyUser(observation)
      }
    }
  }

  private async suggestAction(observation: KairosObservation): Promise<SuggestedAction | null> {
    const trigger = this.triggers.get(observation.type)
    if (!trigger) return null

    // Check cooldown
    const lastTime = this.lastTriggerTime.get(observation.type) || 0
    if (Date.now() - lastTime < trigger.cooldown) return null

    // Check relevance threshold
    if (observation.relevance < trigger.minRelevance) return null

    // Generate action based on type
    switch (observation.type) {
      case 'code_change':
        return this.suggestTestForChange(observation)
      case 'test_failure':
        return this.suggestDebugAction(observation)
      case 'long_operation':
        return this.suggestBackgroundTask(observation)
      case 'user_frustration':
        return this.suggestHelpAction(observation)
      case 'opportunity':
        return this.suggestOptimization(observation)
      case 'memory_trigger':
        return this.suggestMemoryRecall(observation)
      case 'time_based':
        return this.suggestCheckpoint(observation)
      default:
        return null
    }
  }

  // Action suggestions
  private suggestTestForChange(observation: KairosObservation): SuggestedAction | null {
    if (!observation.context.filePath) return null

    return {
      type: 'suggest_test',
      description: `Run tests for ${observation.context.filePath}`,
      confidence: observation.relevance,
      execute: async () => {
        eventBus.emit('kairos:action:run_tests', { filePath: observation.context.filePath })
      },
    }
  }

  private suggestDebugAction(observation: KairosObservation): SuggestedAction | null {
    return {
      type: 'suggest_debug',
      description: `Debug test failure: ${observation.context.errorMessage}`,
      confidence: observation.relevance,
      execute: async () => {
        eventBus.emit('kairos:action:debug', { error: observation.context.errorMessage })
      },
    }
  }

  private suggestBackgroundTask(observation: KairosObservation): SuggestedAction | null {
    return {
      type: 'background_task',
      description: 'Continue long operation in background',
      confidence: observation.relevance,
      execute: async () => {
        eventBus.emit('kairos:action:background', { duration: observation.context.duration })
      },
    }
  }

  private suggestHelpAction(observation: KairosObservation): SuggestedAction | null {
    return {
      type: 'offer_help',
      description: 'Offer assistance with current task',
      confidence: observation.relevance,
      execute: async () => {
        eventBus.emit('kairos:action:offer_help', { context: observation.context.userInput })
      },
    }
  }

  private suggestOptimization(observation: KairosObservation): SuggestedAction | null {
    return {
      type: 'suggest_optimization',
      description: 'Optimize detected opportunity',
      confidence: observation.relevance,
      execute: async () => {
        eventBus.emit('kairos:action:optimize', { context: observation.context })
      },
    }
  }

  private suggestMemoryRecall(observation: KairosObservation): SuggestedAction | null {
    return {
      type: 'recall_memory',
      description: 'Recall relevant past memory',
      confidence: observation.relevance,
      execute: async () => {
        eventBus.emit('kairos:action:recall', { context: observation.context })
      },
    }
  }

  private suggestCheckpoint(observation: KairosObservation): SuggestedAction | null {
    return {
      type: 'suggest_checkpoint',
      description: 'Create checkpoint or take a break',
      confidence: observation.relevance,
      execute: async () => {
        eventBus.emit('kairos:action:checkpoint', {})
      },
    }
  }

  // User notification
  private notifyUser(observation: KairosObservation): void {
    if (!observation.suggestedAction) return

    const message = this.config.briefMode
      ? `[Kairos] ${observation.suggestedAction.description}`
      : `[Kairos] Suggestion: ${observation.suggestedAction.description} (confidence: ${Math.round(observation.suggestedAction.confidence * 100)}%)`

    eventBus.emit(EventTypes.KAIROS_SUGGESTION, {
      message,
      action: observation.suggestedAction,
      observation,
    })
  }

  // Auto-execution (if enabled)
  private async executeAutoActions(): Promise<void> {
    const highConfidenceActions = this.observations
      .filter(o => o.suggestedAction && o.suggestedAction.confidence > 0.9)
      .slice(0, this.config.maxActiveTasks)

    for (const observation of highConfidenceActions) {
      if (observation.suggestedAction) {
        await observation.suggestedAction.execute()
        this.lastTriggerTime.set(observation.type, Date.now())
      }
    }
  }

  // Memory consolidation
  private shouldConsolidate(): boolean {
    if (!this.config.enableMemoryConsolidation) return false

    // Check if 24h passed since last consolidation
    // This is simplified - actual implementation would check persistent storage
    return false
  }

  private async runMemoryConsolidation(): Promise<void> {
    if (this.consolidationState?.phase !== null) return

    // Phase 1: Orient
    this.consolidationState = {
      phase: 'orient',
      startedAt: Date.now(),
      itemsProcessed: 0,
      itemsConsolidated: 0,
    }

    eventBus.emit(EventTypes.MEMORY_CONSOLIDATION_STARTED, this.consolidationState)

    // Phase 2: Gather (async)
    await this.runConsolidationPhase('gather', async () => {
      // Gather memories from various sources
      return 100 // items gathered
    })

    // Phase 3: Consolidate
    await this.runConsolidationPhase('consolidate', async () => {
      // Merge and deduplicate memories
      return 50 // items consolidated
    })

    // Phase 4: Prune
    await this.runConsolidationPhase('prune', async () => {
      // Remove outdated memories
      return 20 // items pruned
    })

    // Complete
    this.consolidationState = null
    eventBus.emit(EventTypes.MEMORY_CONSOLIDATION_COMPLETED, { timestamp: Date.now() })
  }

  private async runConsolidationPhase(
    phase: ConsolidationPhase,
    processor: () => Promise<number>
  ): Promise<void> {
    if (!this.consolidationState) return

    this.consolidationState.phase = phase
    const count = await processor()
    this.consolidationState.itemsProcessed += count

    eventBus.emit(EventTypes.MEMORY_CONSOLIDATION_PHASE, {
      phase,
      itemsProcessed: count,
    })
  }

  // Task management
  createTask(name: string, priority = 5): KairosTask {
    const task: KairosTask = {
      id: `kairos-task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      status: 'pending',
      priority,
      createdAt: Date.now(),
    }

    this.tasks.push(task)
    eventBus.emit(EventTypes.KAIROS_TASK_CREATED, task)
    return task
  }

  getTasks(): KairosTask[] {
    return [...this.tasks]
  }

  getObservations(): KairosObservation[] {
    return [...this.observations]
  }

  getConfig(): KairosConfig {
    return { ...this.config }
  }

  updateConfig(updates: Partial<KairosConfig>): void {
    this.config = { ...this.config, ...updates }
  }
}

// Trigger configuration
interface TriggerConfig {
  minRelevance: number
  cooldown: number
}

// Add event types
EventTypes.KAIROS_ACTIVATED = 'kairos:activated'
EventTypes.KAIROS_DEACTIVATED = 'kairos:deactivated'
EventTypes.KAIROS_PAUSED = 'kairos:paused'
EventTypes.KAIROS_RESUMED = 'kairos:resumed'
EventTypes.KAIROS_OBSERVATION = 'kairos:observation'
EventTypes.KAIROS_SUGGESTION = 'kairos:suggestion'
EventTypes.KAIROS_TASK_CREATED = 'kairos:task:created'
EventTypes.MEMORY_CONSOLIDATION_STARTED = 'memory:consolidation:started'
EventTypes.MEMORY_CONSOLIDATION_COMPLETED = 'memory:consolidation:completed'
EventTypes.MEMORY_CONSOLIDATION_PHASE = 'memory:consolidation:phase'

// Export singleton
export const kairosEngine = new KairosEngine()

// DI registration
export const KAIROS_ENGINE_TOKEN = createToken<KairosEngine>('KairosEngine')
container.registerValue(KAIROS_ENGINE_TOKEN, kairosEngine)
