// Event Bus - Decoupled event system for cross-module communication

export type EventHandler<T = any> = (payload: T) => void | Promise<void>

export interface Event<T = any> {
  type: string
  payload: T
  timestamp: number
  source?: string
}

export interface Subscription {
  unsubscribe(): void
}

export class EventBus {
  private handlers = new Map<string, Set<EventHandler>>()
  private middlewares: Array<(event: Event) => Event | null> = []
  private history: Event[] = []
  private maxHistorySize = 1000

  // Subscribe to an event type
  on<T>(eventType: string, handler: EventHandler<T>): Subscription {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set())
    }

    const handlers = this.handlers.get(eventType)!
    const wrappedHandler = handler as EventHandler
    handlers.add(wrappedHandler)

    return {
      unsubscribe: () => {
        handlers.delete(wrappedHandler)
        if (handlers.size === 0) {
          this.handlers.delete(eventType)
        }
      }
    }
  }

  // Subscribe once
  once<T>(eventType: string, handler: EventHandler<T>): void {
    const subscription = this.on<T>(eventType, (payload) => {
      subscription.unsubscribe()
      handler(payload)
    })
  }

  // Emit an event
  emit<T>(type: string, payload: T, source?: string): void {
    let event: Event<T> = {
      type,
      payload,
      timestamp: Date.now(),
      source,
    }

    // Run through middlewares
    for (const middleware of this.middlewares) {
      event = middleware(event) as Event<T>
      if (event === null) return
    }

    // Store in history
    this.history.push(event)
    if (this.history.length > this.maxHistorySize) {
      this.history.shift()
    }

    // Notify handlers
    const handlers = this.handlers.get(type)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          const result = handler(payload)
          if (result instanceof Promise) {
            result.catch(err => console.error(`Error in event handler for ${type}:`, err))
          }
        } catch (err) {
          console.error(`Error in event handler for ${type}:`, err)
        }
      })
    }
  }

  // Add middleware
  use(middleware: (event: Event) => Event | null): void {
    this.middlewares.push(middleware)
  }

  // Get event history
  getHistory(eventType?: string, limit = 100): Event[] {
    let history = this.history
    if (eventType) {
      history = history.filter(e => e.type === eventType)
    }
    return history.slice(-limit)
  }

  // Clear history
  clearHistory(): void {
    this.history = []
  }

  // Get active event types
  getActiveEventTypes(): string[] {
    return Array.from(this.handlers.keys())
  }

  // Get handler count for an event type
  getHandlerCount(eventType: string): number {
    return this.handlers.get(eventType)?.size ?? 0
  }

  // Remove all handlers for an event type
  off(eventType: string): void {
    this.handlers.delete(eventType)
  }

  // Clear all handlers
  clear(): void {
    this.handlers.clear()
    this.middlewares = []
    this.clearHistory()
  }
}

// Global event bus instance
export const eventBus = new EventBus()

// Predefined event types for type safety
export const EventTypes = {
  // Tool events
  TOOL_CALLED: 'tool:called',
  TOOL_COMPLETED: 'tool:completed',
  TOOL_FAILED: 'tool:failed',

  // Command events
  COMMAND_EXECUTED: 'command:executed',
  COMMAND_FAILED: 'command:failed',

  // Session events
  SESSION_STARTED: 'session:started',
  SESSION_ENDED: 'session:ended',
  CONTEXT_COMPACTED: 'context:compacted',

  // Memory events
  MEMORY_CREATED: 'memory:created',
  MEMORY_UPDATED: 'memory:updated',
  MEMORY_CONSOLIDATED: 'memory:consolidated',

  // UI events
  UI_RENDERED: 'ui:rendered',
  USER_INPUT: 'user:input',
  RESPONSE_RECEIVED: 'response:received',

  // Agent events
  AGENT_SPAWNED: 'agent:spawned',
  AGENT_COMPLETED: 'agent:completed',

  // Proactive events
  PROACTIVE_MODE_CHANGED: 'proactive:mode:changed',

  // Coordinator events
  COORDINATOR_MODE_CHANGED: 'coordinator:mode:changed',
  AGENT_COMPLETED: 'agent:completed',
  AGENT_FAILED: 'agent:failed',

  // Long-term task events
  TASK_CREATED: 'task:created',
  TASK_UPDATED: 'task:updated',

  // Bridge events
  BRIDGE_CONNECTED: 'bridge:connected',
  BRIDGE_DISCONNECTED: 'bridge:disconnected',
  MESSAGE_RECEIVED: 'bridge:message:received',
} as const

// Typed event emitter helper
export function emitToolCalled(toolName: string, input: unknown): void {
  eventBus.emit(EventTypes.TOOL_CALLED, { toolName, input })
}

export function emitToolCompleted(toolName: string, output: unknown, duration: number): void {
  eventBus.emit(EventTypes.TOOL_COMPLETED, { toolName, output, duration })
}

export function emitMemoryCreated(type: string, content: string, relevance: number): void {
  eventBus.emit(EventTypes.MEMORY_CREATED, { type, content, relevance })
}

export function emitAgentSpawned(agentId: string, task: string): void {
  eventBus.emit(EventTypes.AGENT_SPAWNED, { agentId, task })
}

export function emitAgentCompleted(agentId: string, result: unknown): void {
  eventBus.emit(EventTypes.AGENT_COMPLETED, { agentId, result })
}
