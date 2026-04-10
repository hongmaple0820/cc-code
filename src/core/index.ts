// Core module exports - Centralized exports for microkernel architecture

// Dependency Injection
export {
  DIContainer,
  container,
  createToken,
  Inject,
  Injectable,
  type Token,
  type Provider,
} from './di/container.js'

// Event Bus
export {
  EventBus,
  eventBus,
  EventTypes,
  type Event,
  type EventHandler,
  type Subscription,
  emitToolCalled,
  emitToolCompleted,
  emitMemoryCreated,
  emitAgentSpawned,
  emitAgentCompleted,
} from './events/eventBus.js'

// Feature Flags
export {
  isFeatureEnabled,
  feature,
  FEATURES,
  FEATURE_DESCRIPTIONS,
  validateFeatureDependencies,
  listEnabledFeatures,
  getFeatureStatus,
  type FeatureFlags,
} from './featureFlags.js'

// Plugin System
export {
  PluginManager,
  pluginManager,
  PLUGIN_MANAGER_TOKEN,
  type Plugin,
  type PluginHooks,
  type PluginManifest,
  type HookContext,
  type HookResult,
  type SessionContext,
} from './plugins/PluginManager.js'

// Service Registry
export {
  ServiceRegistry,
  serviceRegistry,
  BaseService,
  SERVICE_REGISTRY_TOKEN,
  type Service,
  type ServiceHealth,
  type ServiceState,
  type ServiceRegistration,
  type SystemStatus,
} from './services/ServiceRegistry.js'
