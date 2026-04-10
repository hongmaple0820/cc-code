// Plugin System - Core plugin management for microkernel architecture

import { eventBus } from '../events/eventBus.js'
import { container, createToken } from '../di/container.js'

// Types
export interface Plugin {
  id: string
  name: string
  version: string
  description?: string
  author?: string
  hooks: PluginHooks
  commands?: PluginCommand[]
  tools?: PluginTool[]
  activate(): Promise<void> | void
  deactivate(): Promise<void> | void
}

export interface PluginHooks {
  beforeCommand?(command: string, context: HookContext): HookResult
  afterCommand?(command: string, result: unknown, context: HookContext): HookResult
  beforeTool?(tool: string, input: unknown): HookResult
  afterTool?(tool: string, input: unknown, output: unknown): HookResult
  onSessionStart?(session: SessionContext): void
  onSessionEnd?(session: SessionContext): void
}

export interface HookContext {
  cwd: string
  env: Record<string, string>
  config: Record<string, unknown>
}

export interface HookResult {
  proceed: boolean
  modifiedInput?: unknown
  modifiedOutput?: unknown
}

export interface PluginCommand {
  name: string
  description: string
  execute(args: string[]): Promise<void>
}

export interface PluginTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  execute(input: unknown): Promise<unknown>
}

export interface SessionContext {
  id: string
  startedAt: number
  cwd: string
}

export interface PluginManifest {
  id: string
  name: string
  version: string
  description?: string
  author?: string
  dependencies?: string[]
  optionalDependencies?: string[]
  conflicts?: string[]
  minApiVersion: string
  maxApiVersion?: string
  entryPoint: string
}

export interface PluginRegistry {
  register(plugin: Plugin): void
  unregister(pluginId: string): void
  get(pluginId: string): Plugin | undefined
  getAll(): Plugin[]
  getActive(): Plugin[]
}

// Plugin Manager
export class PluginManager {
  private plugins = new Map<string, Plugin>()
  private activePlugins = new Set<string>()
  private hooks: Map<string, Function[]> = new Map()
  private loadingOrder: string[] = []

  async loadPlugin(manifest: PluginManifest): Promise<void> {
    // Check API version compatibility
    if (!this.checkApiVersion(manifest.minApiVersion, manifest.maxApiVersion)) {
      throw new Error(`Plugin ${manifest.name} requires API version ${manifest.minApiVersion}`)
    }

    // Check dependencies
    if (manifest.dependencies) {
      for (const dep of manifest.dependencies) {
        if (!this.plugins.has(dep)) {
          throw new Error(`Plugin ${manifest.name} requires ${dep}`)
        }
      }
    }

    // Check conflicts
    if (manifest.conflicts) {
      for (const conflict of manifest.conflicts) {
        if (this.plugins.has(conflict)) {
          throw new Error(`Plugin ${manifest.name} conflicts with ${conflict}`)
        }
      }
    }

    // Load and instantiate
    const plugin = await this.instantiatePlugin(manifest)

    // Register
    this.plugins.set(plugin.id, plugin)
    this.loadingOrder.push(plugin.id)

    eventBus.emit('plugin:loaded', { pluginId: plugin.id, name: plugin.name })
  }

  async activatePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`)
    }

    if (this.activePlugins.has(pluginId)) {
      return // Already active
    }

    // Activate dependencies first
    const manifest = await this.getManifest(pluginId)
    if (manifest?.dependencies) {
      for (const dep of manifest.dependencies) {
        await this.activatePlugin(dep)
      }
    }

    // Activate the plugin
    await plugin.activate()
    this.activePlugins.add(pluginId)

    // Register hooks
    this.registerHooks(plugin)

    eventBus.emit('plugin:activated', { pluginId: plugin.name })
  }

  async deactivatePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) return

    if (!this.activePlugins.has(pluginId)) return

    // Check if other plugins depend on this
    for (const [id, otherManifest] of await this.getAllManifests()) {
      if (otherManifest.dependencies?.includes(pluginId)) {
        await this.deactivatePlugin(id)
      }
    }

    // Unregister hooks
    this.unregisterHooks(pluginId)

    // Deactivate
    await plugin.deactivate()
    this.activePlugins.delete(pluginId)

    eventBus.emit('plugin:deactivated', { pluginId: plugin.name })
  }

  private registerHooks(plugin: Plugin): void {
    if (!plugin.hooks) return

    for (const [hookName, handler] of Object.entries(plugin.hooks)) {
      if (!this.hooks.has(hookName)) {
        this.hooks.set(hookName, [])
      }
      this.hooks.get(hookName)!.push(handler.bind(plugin))
    }
  }

  private unregisterHooks(pluginId: string): void {
    // Remove all hooks for this plugin
    for (const handlers of this.hooks.values()) {
      // This is a simplification - in reality, we'd track plugin ownership
      const plugin = this.plugins.get(pluginId)
      if (plugin?.hooks) {
        const index = handlers.findIndex(h =>
          Object.values(plugin.hooks).includes(h)
        )
        if (index !== -1) {
          handlers.splice(index, 1)
        }
      }
    }
  }

  async executeHook(hookName: string, context: unknown): Promise<HookResult> {
    const handlers = this.hooks.get(hookName) || []
    let result: HookResult = { proceed: true }

    for (const handler of handlers) {
      try {
        const hookResult = await handler(context, result)
        if (hookResult) {
          if (!hookResult.proceed) {
            return hookResult
          }
          result = { ...result, ...hookResult }
        }
      } catch (error) {
        console.error(`Hook ${hookName} failed:`, error)
      }
    }

    return result
  }

  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId)
  }

  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values())
  }

  getActivePlugins(): Plugin[] {
    return this.activePlugins
      .values()
      .map(id => this.plugins.get(id)!)
      .filter(Boolean)
  }

  isActive(pluginId: string): boolean {
    return this.activePlugins.has(pluginId)
  }

  getLoadingOrder(): string[] {
    return [...this.loadingOrder]
  }

  private async instantiatePlugin(manifest: PluginManifest): Promise<Plugin> {
    // This would dynamically import and instantiate the plugin
    // Simplified for this implementation
    const module = await import(manifest.entryPoint)
    return new module.default(manifest)
  }

  private checkApiVersion(min: string, max?: string): boolean {
    const current = '2.1.88'
    // Simple semver comparison
    return this.compareVersion(current, min) >= 0 &&
           (!max || this.compareVersion(current, max) <= 0)
  }

  private compareVersion(a: string, b: string): number {
    const pa = a.split('.').map(Number)
    const pb = b.split('.').map(Number)

    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const na = pa[i] || 0
      const nb = pb[i] || 0
      if (na !== nb) return na - nb
    }
    return 0
  }

  private async getManifest(pluginId: string): Promise<PluginManifest | undefined> {
    // Would return cached manifest
    return undefined
  }

  private async getAllManifests(): Promise<Map<string, PluginManifest>> {
    // Would return all manifests
    return new Map()
  }

  async unloadPlugin(pluginId: string): Promise<void> {
    await this.deactivatePlugin(pluginId)
    this.plugins.delete(pluginId)
    this.loadingOrder = this.loadingOrder.filter(id => id !== pluginId)
    eventBus.emit('plugin:unloaded', { pluginId })
  }

  async unloadAll(): Promise<void> {
    // Deactivate in reverse loading order
    for (const pluginId of [...this.loadingOrder].reverse()) {
      await this.unloadPlugin(pluginId)
    }
  }
}

// Export singleton
export const pluginManager = new PluginManager()

// DI registration
export const PLUGIN_MANAGER_TOKEN = createToken<PluginManager>('PluginManager')
container.registerValue(PLUGIN_MANAGER_TOKEN, pluginManager)
