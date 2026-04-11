// Long-term Task Engine - Types
// Supports persistent tasks with checkpoint, pause/resume, cross-session recovery

// Task states
export type TaskState =
  | 'pending'
  | 'running'
  | 'paused'
  | 'waiting'      // waiting for external event
  | 'completed'
  | 'failed'
  | 'cancelled'

// Task priority
export type TaskPriority = 'critical' | 'high' | 'normal' | 'low' | 'background'

// Task metadata
export interface TaskMeta {
  tags: string[]
  labels: Record<string, string>
  parentTaskId?: string
  childTaskIds: string[]
  retryCount: number
  maxRetries: number
  timeoutMs?: number
  scheduledAt?: number    // run no earlier than this time
  expiresAt?: number      // auto-cancel after this time
}

// Checkpoint data
export interface Checkpoint {
  id: string
  taskId: string
  timestamp: number
  state: Record<string, unknown>
  description?: string
  canResume: boolean
}

// Step within a task
export interface TaskStep {
  id: string
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  startedAt?: number
  completedAt?: number
  error?: string
  checkpoint?: Checkpoint
}

// Full task definition
export interface LongTermTask {
  id: string
  name: string
  description?: string
  state: TaskState
  priority: TaskPriority
  createdAt: number
  startedAt?: number
  pausedAt?: number
  completedAt?: number
  failedAt?: number
  cancelledAt?: number
  updatedAt: number
  lastSessionId?: string       // session that last touched this task
  meta: TaskMeta
  steps: TaskStep[]
  currentStepIndex: number
  result?: unknown
  error?: string
  // Execution context - persisted across sessions
  context: Record<string, unknown>
  // History of state transitions
  stateHistory: Array<{
    from: TaskState
    to: TaskState
    at: number
    reason?: string
  }>
}

// Task creation options
export interface CreateTaskOptions {
  name: string
  description?: string
  priority?: TaskPriority
  tags?: string[]
  labels?: Record<string, string>
  parentTaskId?: string
  steps?: Omit<TaskStep, 'id' | 'status'>[]
  timeoutMs?: number
  maxRetries?: number
  scheduledAt?: number
  expiresAt?: number
  context?: Record<string, unknown>
}

// Query filters
export interface TaskQuery {
  state?: TaskState | TaskState[]
  priority?: TaskPriority | TaskPriority[]
  tags?: string[]        // must include all
  tagsAny?: string[]     // must include any
  createdAfter?: number
  createdBefore?: number
  limit?: number
  offset?: number
  sortBy?: 'createdAt' | 'updatedAt' | 'priority'
  sortOrder?: 'asc' | 'desc'
}

// Statistics
export interface TaskStats {
  total: number
  byState: Record<TaskState, number>
  byPriority: Record<TaskPriority, number>
  avgCompletionTimeMs: number
  failureRate: number
  oldestPendingAge: number
}

// Engine state (persisted)
export interface EngineState {
  tasks: Map<string, LongTermTask>
  checkpoints: Map<string, Checkpoint>
  nextTaskIndex: number
  lastCompactedAt: number
  version: number
}
