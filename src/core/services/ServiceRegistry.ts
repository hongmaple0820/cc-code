// Service Registry - Centralized service management for microkernel

import { eventBus } from '../events/eventBus.js'
import { container, createToken } from '../di/container.js'

// Service lifecycle states
export type ServiceState = 'uninitialized' | 'initializing' | 'running' | 'stopping' | 'stopped' | 'error'

// Service interface
export interface Service {
  readonly name: string
  readonly dependencies?: string[]

  getState(): ServiceState
  getHealth(): ServiceHealth

  initialize(): Promise<void>
  start(): Promise<void>
  stop(): Promise<void>
  restart(): Promise<void>
}

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  lastChecked: number
  uptime: number
  memoryUsage: number
  cpuUsage?: number
  errorCount: number
  warnings: string[]
}

export interface ServiceRegistration {
  name: string
  service: Service
  priority: number
  autoStart: boolean
}

// Service Registry
export class ServiceRegistry {
  private services = new Map<string, ServiceRegistration>()
  private state = new Map<string, ServiceState>()
  private healthChecks = new Map<string, ServiceHealth>()
  private startOrder: string[] = []

  // Register a service
  register(registration: ServiceRegistration): void {
    const { name, service, priority } = registration

    if (this.services.has(name)) {
      throw new Error(`Service ${name} is already registered`)
    }

    this.services.set(name, registration)
    this.state.set(name, 'uninitialized')

    // Insert in priority order
    const index = this.startOrder.findIndex(n => {
      const reg = this.services.get(n)
      return reg && reg.priority > priority
    })

    if (index === -1) {
      this.startOrder.push(name)
    } else {
      this.startOrder.splice(index, 0, name)
    }

    eventBus.emit('service:registered', { name, priority })
  }

  // Unregister a service
  async unregister(name: string): Promise<void> {
    const registration = this.services.get(name)
    if (!registration) return

    // Stop if running
    if (this.isRunning(name)) {
      await this.stop(name)
    }

    this.services.delete(name)
    this.state.delete(name)
    this.healthChecks.delete(name)
    this.startOrder = this.startOrder.filter(n => n !== name)

    eventBus.emit('service:unregistered', { name })
  }

  // Initialize a service
  async initialize(name: string): Promise<void> {
    const registration = this.services.get(name)
    if (!registration) {
      throw new Error(`Service ${name} not found`)
    }

    if (this.state.get(name) !== 'uninitialized') {
      return
    }

    this.state.set(name, 'initializing')

    try {
      // Initialize dependencies first
      if (registration.service.dependencies) {
        for (const dep of registration.service.dependencies) {
          await this.initialize(dep)
        }
      }

      await registration.service.initialize()
      this.state.set(name, 'stopped')
      eventBus.emit('service:initialized', { name })
    } catch (error) {
      this.state.set(name, 'error')
      eventBus.emit('service:initialization_failed', { name, error })
      throw error
    }
  }

  // Start a service
  async start(name: string): Promise<void> {
    const registration = this.services.get(name)
    if (!registration) {
      throw new Error(`Service ${name} not found`)
    }

    const currentState = this.state.get(name)
    if (currentState === 'running') return

    if (currentState === 'uninitialized') {
      await this.initialize(name)
    }

    this.state.set(name, 'initializing')

    try {
      await registration.service.start()
      this.state.set(name, 'running')
      this.startHealthCheck(name)
      eventBus.emit('service:started', { name })
    } catch (error) {
      this.state.set(name, 'error')
      eventBus.emit('service:start_failed', { name, error })
      throw error
    }
  }

  // Stop a service
  async stop(name: string): Promise<void> {
    const registration = this.services.get(name)
    if (!registration) return

    const currentState = this.state.get(name)
    if (currentState !== 'running') return

    this.state.set(name, 'stopping')
    this.stopHealthCheck(name)

    try {
      await registration.service.stop()
      this.state.set(name, 'stopped')
      eventBus.emit('service:stopped', { name })
    } catch (error) {
      this.state.set(name, 'error')
      eventBus.emit('service:stop_failed', { name, error })
      throw error
    }
  }

  // Restart a service
  async restart(name: string): Promise<void> {
    await this.stop(name)
    await this.start(name)
  }

  // Start all auto-start services in dependency order
  async startAll(): Promise<void> {
    for (const name of this.startOrder) {
      const registration = this.services.get(name)
      if (registration?.autoStart) {
        await this.start(name)
      }
    }
  }

  // Stop all services in reverse order
  async stopAll(): Promise<void> {
    for (const name of [...this.startOrder].reverse()) {
      await this.stop(name)
    }
  }

  // Get service state
  getState(name: string): ServiceState {
    return this.state.get(name) || 'uninitialized'
  }

  // Check if running
  isRunning(name: string): boolean {
    return this.state.get(name) === 'running'
  }

  // Get service
  getService(name: string): Service | undefined {
    return this.services.get(name)?.service
  }

  // Get all services
  getAllServices(): ServiceRegistration[] {
    return Array.from(this.services.values())
  }

  // Get running services
  getRunningServices(): string[] {
    return this.startOrder.filter(name => this.isRunning(name))
  }

  // Health check
  private healthCheckIntervals = new Map<string, NodeJS.Timeout>()

  private startHealthCheck(name: string): void {
    const interval = setInterval(async () => {
      try {
        const service = this.services.get(name)?.service
        if (service) {
          const health = await service.getHealth()
          this.healthChecks.set(name, health)

          if (health.status !== 'healthy') {
            eventBus.emit('service:health_warning', { name, health })
          }
        }
      } catch (error) {
        console.error(`Health check failed for ${name}:`, error)
      }
    }, 30000) // 30 seconds

    this.healthCheckIntervals.set(name, interval)
  }

  private stopHealthCheck(name: string): void {
    const interval = this.healthCheckIntervals.get(name)
    if (interval) {
      clearInterval(interval)
      this.healthCheckIntervals.delete(name)
    }
  }

  getHealth(name: string): ServiceHealth | undefined {
    return this.healthChecks.get(name)
  }

  getAllHealth(): Map<string, ServiceHealth> {
    return new Map(this.healthChecks)
  }

  // System status
  getSystemStatus(): SystemStatus {
    const services = Array.from(this.services.keys())
    const running = services.filter(n => this.isRunning(n))
    const errors = services.filter(n => this.state.get(n) === 'error')

    return {
      total: services.length,
      running: running.length,
      stopped: services.length - running.length,
      errors: errors.length,
      services: services.map(name => ({
        name,
        state: this.state.get(name)!,
        health: this.healthChecks.get(name)?.status,
      })),
    }
  }
}

export interface SystemStatus {
  total: number
  running: number
  stopped: number
  errors: number
  services: Array<{
    name: string
    state: ServiceState
    health?: string
  }>
}

// Base service implementation
export abstract class BaseService implements Service {
  abstract readonly name: string
  abstract readonly dependencies?: string[]

  protected state: ServiceState = 'uninitialized'
  protected startTime = 0
  protected errorCount = 0
  protected warnings: string[] = []

  getState(): ServiceState {
    return this.state
  }

  getHealth(): ServiceHealth {
    return {
      status: this.state === 'running' ? 'healthy' : 'degraded',
      lastChecked: Date.now(),
      uptime: this.startTime > 0 ? Date.now() - this.startTime : 0,
      memoryUsage: process.memoryUsage().heapUsed,
      errorCount: this.errorCount,
      warnings: [...this.warnings],
    }
  }

  async initialize(): Promise<void> {
    this.state = 'uninitialized'
  }

  async start(): Promise<void> {
    this.startTime = Date.now()
    this.state = 'running'
  }

  async stop(): Promise<void> {
    this.state = 'stopped'
  }

  async restart(): Promise<void> {
    await this.stop()
    await this.start()
  }

  protected addWarning(message: string): void {
    this.warnings.push(message)
    if (this.warnings.length > 10) {
      this.warnings.shift()
    }
  }

  protected incrementError(): void {
    this.errorCount++
  }
}

// Export singleton
export const serviceRegistry = new ServiceRegistry()

// DI registration
export const SERVICE_REGISTRY_TOKEN = createToken<ServiceRegistry>('ServiceRegistry')
container.registerValue(SERVICE_REGISTRY_TOKEN, serviceRegistry)
