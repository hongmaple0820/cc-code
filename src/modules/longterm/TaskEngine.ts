// Long-term Task Engine
// Persistent task management with checkpoint, pause/resume, cross-session recovery

import { eventBus, EventTypes } from '../../core/events/eventBus.js'
import { container, createToken } from '../../core/di/container.js'
import { registerCleanup } from '../../utils/cleanupRegistry.js'
import { mkdirSync, existsSync, writeFileSync, readFileSync, unlinkSync, readdirSync } from 'fs'
import { join } from 'path'
import {
  type LongTermTask,
  type TaskState,
  type TaskPriority,
  type TaskQuery,
  type TaskStats,
  type CreateTaskOptions,
  type Checkpoint,
  type TaskStep,
  type EngineState,
  type TaskMeta,
} from './types.js'

// Priority sort values
const PRIORITY_VALUES: TaskPriority[] = ['critical', 'high', 'normal', 'low', 'background']
function prioritySortValue(p: TaskPriority): number {
  return PRIORITY_VALUES.indexOf(p)
}

// Generate unique ID
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

const TASKS_DIR = '.omc/tasks'

// Persistent storage helpers (JSON files)
function ensureTaskStore(): void {
  if (!existsSync(TASKS_DIR)) {
    mkdirSync(TASKS_DIR, { recursive: true })
  }
}

function taskFilePath(taskId: string): string {
  return join(TASKS_DIR, `${taskId}.json`)
}

function saveTaskToFile(task: LongTermTask): void {
  ensureTaskStore()
  writeFileSync(taskFilePath(task.id), JSON.stringify(task, null, 2))
}

function loadTaskFromFile(taskId: string): LongTermTask | null {
  try {
    const data = readFileSync(taskFilePath(taskId), 'utf-8')
    const parsed = JSON.parse(data)
    return {
      ...parsed,
      meta: {
        tags: parsed.meta?.tags ?? [],
        labels: parsed.meta?.labels ?? {},
        parentTaskId: parsed.meta?.parentTaskId,
        childTaskIds: parsed.meta?.childTaskIds ?? [],
        retryCount: parsed.meta?.retryCount ?? 0,
        maxRetries: parsed.meta?.maxRetries ?? 3,
        timeoutMs: parsed.meta?.timeoutMs,
        scheduledAt: parsed.meta?.scheduledAt,
        expiresAt: parsed.meta?.expiresAt,
      },
      stateHistory: parsed.stateHistory ?? [],
      context: parsed.context ?? {},
    } as LongTermTask
  } catch {
    return null
  }
}

function deleteTaskFile(taskId: string): void {
  try {
    unlinkSync(taskFilePath(taskId))
  } catch {
    // ignore
  }
}

function loadAllTaskFiles(): LongTermTask[] {
  ensureTaskStore()
  const files = readdirSync(TASKS_DIR).filter(f => f.endsWith('.json'))
  const tasks: LongTermTask[] = []
  for (const file of files) {
    const taskId = file.replace('.json', '')
    const task = loadTaskFromFile(taskId)
    if (task) tasks.push(task)
  }
  return tasks
}

// Engine
export class LongTermTaskEngine {
  private tasks = new Map<string, LongTermTask>()
  private checkpoints = new Map<string, Checkpoint>()
  private activeTaskIds = new Set<string>()
  private initialized = false
  private nextTaskIndex = 0

  constructor() {}

  // === Lifecycle ===

  async initialize(): Promise<void> {
    if (this.initialized) return

    ensureTaskStore()

    // Load all persisted tasks from disk
    const persistedTasks = loadAllTaskFiles()
    for (const task of persistedTasks) {
      // Recover running tasks that were interrupted by session end
      if (task.state === 'running') {
        task.state = 'paused'
        task.pausedAt = Date.now()
        task.updatedAt = Date.now()
        task.stateHistory.push({
          from: 'running',
          to: 'paused',
          at: Date.now(),
          reason: 'session ended - auto recovered',
        })
        saveTaskToFile(task)
      }
      this.tasks.set(task.id, task)
      if (task.state === 'paused' || task.state === 'waiting') {
        // These can be resumed
      }
      // Track next index
      const numPart = parseInt(task.id.split('-')[1] || '0', 10)
      if (!isNaN(numPart) && numPart >= this.nextTaskIndex) {
        this.nextTaskIndex = numPart + 1
      }
    }

    this.initialized = true
    eventBus.emit('taskengine:initialized', { taskCount: this.tasks.size })
  }

  async shutdown(): Promise<void> {
    // Pause all active tasks
    for (const taskId of this.activeTaskIds) {
      const task = this.tasks.get(taskId)
      if (task && task.state === 'running') {
        task.state = 'paused'
        task.pausedAt = Date.now()
        task.updatedAt = Date.now()
        saveTaskToFile(task)
      }
    }
    this.activeTaskIds.clear()
    eventBus.emit('taskengine:shutdown', {})
  }

  // === Task CRUD ===

  createTask(options: CreateTaskOptions): LongTermTask {
    const now = Date.now()
    const steps: TaskStep[] = (options.steps ?? []).map(s => ({
      ...s,
      id: generateId('step'),
      status: 'pending' as const,
    }))

    const task: LongTermTask = {
      id: generateId('task'),
      name: options.name,
      description: options.description,
      state: 'pending',
      priority: options.priority ?? 'normal',
      createdAt: now,
      updatedAt: now,
      meta: {
        tags: options.tags ?? [],
        labels: options.labels ?? {},
        parentTaskId: options.parentTaskId,
        childTaskIds: [],
        retryCount: 0,
        maxRetries: options.maxRetries ?? 3,
        timeoutMs: options.timeoutMs,
        scheduledAt: options.scheduledAt,
        expiresAt: options.expiresAt,
      },
      steps,
      currentStepIndex: 0,
      context: options.context ?? {},
      stateHistory: [{ from: 'none', to: 'pending', at: now }],
    }

    this.tasks.set(task.id, task)
    saveTaskToFile(task)

    // Link to parent
    if (options.parentTaskId) {
      const parent = this.tasks.get(options.parentTaskId)
      if (parent) {
        parent.meta.childTaskIds.push(task.id)
        parent.updatedAt = now
        saveTaskToFile(parent)
      }
    }

    eventBus.emit(EventTypes.TASK_CREATED, task)
    return task
  }

  getTask(taskId: string): LongTermTask | undefined {
    return this.tasks.get(taskId)
  }

  updateTask(taskId: string, updates: Partial<Pick<LongTermTask, 'name' | 'description' | 'priority' | 'context' | 'meta'>>): LongTermTask | null {
    const task = this.tasks.get(taskId)
    if (!task) return null

    if (updates.name !== undefined) task.name = updates.name
    if (updates.description !== undefined) task.description = updates.description
    if (updates.priority !== undefined) task.priority = updates.priority
    if (updates.context !== undefined) task.context = { ...task.context, ...updates.context }
    if (updates.meta !== undefined) task.meta = { ...task.meta, ...updates.meta }

    task.updatedAt = Date.now()
    saveTaskToFile(task)
    eventBus.emit('taskengine:task:updated', { taskId })
    return task
  }

  async deleteTask(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId)
    if (!task) return false

    // Cannot delete running tasks
    if (task.state === 'running') {
      await this.pauseTask(taskId)
    }

    // Delete child tasks
    for (const childId of task.meta.childTaskIds) {
      await this.deleteTask(childId)
    }

    this.tasks.delete(taskId)
    deleteTaskFile(taskId)
    eventBus.emit('taskengine:task:deleted', { taskId })
    return true
  }

  // === State Transitions ===

  async startTask(taskId: string): Promise<LongTermTask | null> {
    const task = this.tasks.get(taskId)
    if (!task) return null

    if (task.state === 'running') return task
    if (task.state === 'completed' || task.state === 'cancelled') return null

    // Check if scheduled
    if (task.meta.scheduledAt && Date.now() < task.meta.scheduledAt) {
      task.state = 'pending'
      task.updatedAt = Date.now()
      saveTaskToFile(task)
      return task
    }

    // Check if expired
    if (task.meta.expiresAt && Date.now() > task.meta.expiresAt) {
      return await this.failTask(taskId, 'Task expired')
    }

    const prevState = task.state
    task.state = 'running'
    task.startedAt = task.startedAt ?? Date.now()
    task.updatedAt = Date.now()
    task.lastSessionId = this.getSessionId()
    this.activeTaskIds.add(taskId)

    if (task.steps.length > 0 && task.currentStepIndex < task.steps.length) {
      task.steps[task.currentStepIndex].status = 'running'
      task.steps[task.currentStepIndex].startedAt = Date.now()
    }

    task.stateHistory.push({ from: prevState, to: 'running', at: Date.now() })
    saveTaskToFile(task)
    eventBus.emit('taskengine:task:started', { taskId })
    return task
  }

  async pauseTask(taskId: string, reason?: string): Promise<LongTermTask | null> {
    const task = this.tasks.get(taskId)
    if (!task) return null
    if (task.state !== 'running') return null

    const prevState = task.state
    task.state = 'paused'
    task.pausedAt = Date.now()
    task.updatedAt = Date.now()
    this.activeTaskIds.delete(taskId)

    // Pause current step
    if (task.steps[task.currentStepIndex]?.status === 'running') {
      task.steps[task.currentStepIndex].status = 'pending'
    }

    task.stateHistory.push({ from: prevState, to: 'paused', at: Date.now(), reason })
    saveTaskToFile(task)
    eventBus.emit('taskengine:task:paused', { taskId, reason })
    return task
  }

  async resumeTask(taskId: string): Promise<LongTermTask | null> {
    const task = this.tasks.get(taskId)
    if (!task) return null
    if (task.state !== 'paused' && task.state !== 'waiting') return null

    // Check expiry
    if (task.meta.expiresAt && Date.now() > task.meta.expiresAt) {
      return await this.failTask(taskId, 'Task expired')
    }

    // Retry limit
    if (task.meta.retryCount >= task.meta.maxRetries) {
      return await this.failTask(taskId, `Max retries (${task.meta.maxRetries}) exceeded`)
    }

    task.meta.retryCount++
    return await this.startTask(taskId)
  }

  async completeTask(taskId: string, result?: unknown): Promise<LongTermTask | null> {
    const task = this.tasks.get(taskId)
    if (!task) return null
    if (task.state !== 'running') return null

    const prevState = task.state
    task.state = 'completed'
    task.completedAt = Date.now()
    task.updatedAt = Date.now()
    task.result = result
    this.activeTaskIds.delete(taskId)

    // Mark current step complete
    if (task.steps[task.currentStepIndex]?.status === 'running') {
      task.steps[task.currentStepIndex].status = 'completed'
      task.steps[task.currentStepIndex].completedAt = Date.now()
    }
    // Mark remaining steps skipped
    for (let i = task.currentStepIndex + 1; i < task.steps.length; i++) {
      task.steps[i].status = 'skipped'
    }

    task.stateHistory.push({ from: prevState, to: 'completed', at: Date.now() })
    saveTaskToFile(task)
    eventBus.emit('taskengine:task:completed', { taskId, result })
    return task
  }

  async failTask(taskId: string, error: string): Promise<LongTermTask | null> {
    const task = this.tasks.get(taskId)
    if (!task) return null

    const prevState = task.state
    task.state = 'failed'
    task.failedAt = Date.now()
    task.updatedAt = Date.now()
    task.error = error
    this.activeTaskIds.delete(taskId)

    if (task.steps[task.currentStepIndex]?.status === 'running') {
      task.steps[task.currentStepIndex].status = 'failed'
      task.steps[task.currentStepIndex].error = error
    }

    task.stateHistory.push({ from: prevState, to: 'failed', at: Date.now(), reason: error })
    saveTaskToFile(task)
    eventBus.emit('taskengine:task:failed', { taskId, error })
    return task
  }

  async cancelTask(taskId: string, reason?: string): Promise<LongTermTask | null> {
    const task = this.tasks.get(taskId)
    if (!task) return null

    const prevState = task.state
    task.state = 'cancelled'
    task.cancelledAt = Date.now()
    task.updatedAt = Date.now()
    this.activeTaskIds.delete(taskId)

    task.stateHistory.push({ from: prevState, to: 'cancelled', at: Date.now(), reason })
    saveTaskToFile(task)
    eventBus.emit('taskengine:task:cancelled', { taskId, reason })
    return task
  }

  // === Checkpoint ===

  createCheckpoint(taskId: string, state: Record<string, unknown>, description?: string): Checkpoint | null {
    const task = this.tasks.get(taskId)
    if (!task) return null

    const checkpoint: Checkpoint = {
      id: generateId('cp'),
      taskId,
      timestamp: Date.now(),
      state,
      description,
      canResume: true,
    }

    this.checkpoints.set(checkpoint.id, checkpoint)

    // Save checkpoint on the current step
    if (task.steps[task.currentStepIndex]) {
      task.steps[task.currentStepIndex].checkpoint = checkpoint
    }

    // Also merge into task context for cross-session recovery
    task.context = { ...task.context, ...state, __lastCheckpoint: checkpoint.id }
    task.updatedAt = Date.now()
    saveTaskToFile(task)

    eventBus.emit('taskengine:checkpoint:created', { checkpointId: checkpoint.id, taskId })
    return checkpoint
  }

  restoreCheckpoint(taskId: string, checkpointId: string): boolean {
    const task = this.tasks.get(taskId)
    if (!task) return false

    // Check current step checkpoint
    const currentStep = task.steps[task.currentStepIndex]
    if (currentStep?.checkpoint?.id === checkpointId) {
      task.context = { ...task.context, ...currentStep.checkpoint.state }
      task.updatedAt = Date.now()
      saveTaskToFile(task)
      return true
    }

    // Search all checkpoints
    const cp = this.checkpoints.get(checkpointId)
    if (cp && cp.taskId === taskId) {
      task.context = { ...task.context, ...cp.state }
      task.updatedAt = Date.now()
      saveTaskToFile(task)
      return true
    }

    return false
  }

  getTaskCheckpoints(taskId: string): Checkpoint[] {
    const task = this.tasks.get(taskId)
    if (!task) return []

    const checkpoints: Checkpoint[] = []
    // From steps
    for (const step of task.steps) {
      if (step.checkpoint) checkpoints.push(step.checkpoint)
    }
    // From global
    for (const cp of this.checkpoints.values()) {
      if (cp.taskId === taskId && !checkpoints.find(c => c.id === cp.id)) {
        checkpoints.push(cp)
      }
    }
    return checkpoints.sort((a, b) => b.timestamp - a.timestamp)
  }

  // === Step Management ===

  advanceStep(taskId: string): LongTermTask | null {
    const task = this.tasks.get(taskId)
    if (!task) return null
    if (task.state !== 'running') return null

    // Mark current step complete
    if (task.currentStepIndex < task.steps.length) {
      const step = task.steps[task.currentStepIndex]
      if (step.status === 'running') {
        step.status = 'completed'
        step.completedAt = Date.now()
      }
    }

    task.currentStepIndex++

    if (task.currentStepIndex >= task.steps.length) {
      // All steps done
      this.completeTask(taskId)
      return task
    }

    // Start next step
    task.steps[task.currentStepIndex].status = 'running'
    task.steps[task.currentStepIndex].startedAt = Date.now()
    task.updatedAt = Date.now()
    saveTaskToFile(task)

    eventBus.emit('taskengine:step:advanced', { taskId, stepIndex: task.currentStepIndex })
    return task
  }

  // === Query ===

  queryTasks(query: TaskQuery = {}): LongTermTask[] {
    let results = Array.from(this.tasks.values())

    // Filter by state
    if (query.state) {
      const states = Array.isArray(query.state) ? query.state : [query.state]
      results = results.filter(t => states.includes(t.state))
    }

    // Filter by priority
    if (query.priority) {
      const priorities = Array.isArray(query.priority) ? query.priority : [query.priority]
      results = results.filter(t => priorities.includes(t.priority))
    }

    // Filter by tags (must include all)
    if (query.tags && query.tags.length > 0) {
      results = results.filter(t => query.tags!.every(tag => t.meta.tags.includes(tag)))
    }

    // Filter by tags (must include any)
    if (query.tagsAny && query.tagsAny.length > 0) {
      results = results.filter(t => query.tagsAny!.some(tag => t.meta.tags.includes(tag)))
    }

    // Filter by date range
    if (query.createdAfter) results = results.filter(t => t.createdAt >= query.createdAfter!)
    if (query.createdBefore) results = results.filter(t => t.createdAt <= query.createdBefore!)

    // Sort
    const sortBy = query.sortBy ?? 'createdAt'
    const sortOrder = query.sortOrder ?? 'desc'
    results.sort((a, b) => {
      let cmp = 0
      if (sortBy === 'priority') {
        cmp = prioritySortValue(b.priority) - prioritySortValue(a.priority)
      } else if (sortBy === 'updatedAt') {
        cmp = b.updatedAt - a.updatedAt
      } else {
        cmp = b.createdAt - a.createdAt
      }
      return sortOrder === 'asc' ? -cmp : cmp
    })

    // Paginate
    const offset = query.offset ?? 0
    const limit = query.limit ?? 100
    return results.slice(offset, offset + limit)
  }

  getActiveTasks(): LongTermTask[] {
    return Array.from(this.activeTaskIds)
      .map(id => this.tasks.get(id))
      .filter(Boolean) as LongTermTask[]
  }

  getRecoverableTasks(): LongTermTask[] {
    return this.queryTasks({ state: ['paused', 'waiting'] })
  }

  // === Stats ===

  getStats(): TaskStats {
    const allTasks = Array.from(this.tasks.values())
    const completed = allTasks.filter(t => t.state === 'completed')
    const failed = allTasks.filter(t => t.state === 'failed')
    const pending = allTasks.filter(t => t.state === 'pending')

    const avgTime = completed.length > 0
      ? completed.reduce((sum, t) => sum + ((t.completedAt ?? t.updatedAt) - t.createdAt), 0) / completed.length
      : 0

    const failureRate = allTasks.length > 0 ? failed.length / allTasks.length : 0

    const oldestPending = pending.length > 0
      ? Date.now() - Math.min(...pending.map(t => t.createdAt))
      : 0

    const byState = {} as Record<TaskState, number>
    const byPriority = {} as Record<TaskPriority, number>
    for (const s of ['pending', 'running', 'paused', 'waiting', 'completed', 'failed', 'cancelled'] as TaskState[]) {
      byState[s] = allTasks.filter(t => t.state === s).length
    }
    for (const p of PRIORITY_VALUES) {
      byPriority[p] = allTasks.filter(t => t.priority === p).length
    }

    return {
      total: allTasks.length,
      byState,
      byPriority,
      avgCompletionTimeMs: avgTime,
      failureRate,
      oldestPendingAge: oldestPending,
    }
  }

  // === Maintenance ===

  compact(): number {
    // Remove completed/cancelled tasks older than 7 days
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
    let compacted = 0

    for (const task of this.tasks.values()) {
      if ((task.state === 'completed' || task.state === 'cancelled') && task.updatedAt < cutoff) {
        deleteTaskFile(task.id)
        this.tasks.delete(task.id)
        compacted++
      }
    }

    this.checkpoints.clear()
    return compacted
  }

  private getSessionId(): string {
    return process.env.CLAUDE_CODE_SESSION_ID ?? 'unknown'
  }
}

// Export singleton
export const longTermTaskEngine = new LongTermTaskEngine()

// Register shutdown cleanup
registerCleanup(async () => {
  await longTermTaskEngine.shutdown()
})

// DI registration
export const LONG_TERM_TASK_ENGINE_TOKEN = createToken<LongTermTaskEngine>('LongTermTaskEngine')
container.registerValue(LONG_TERM_TASK_ENGINE_TOKEN, longTermTaskEngine)
