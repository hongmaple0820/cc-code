/**
 * Coordinator Integration - Multi-agent orchestration mode
 *
 * Bridges Coordinator mode with the new feature flag system.
 * Provides enhanced multi-agent task management.
 */

import { isFeatureEnabled } from '../../core/featureFlags.js'
import { eventBus, EventTypes } from '../../core/events/eventBus.js'

// Track coordinator state
let coordinatorInitialized = false
let coordinatorActive = false

// Re-export from existing coordinator mode with feature flag integration
export function isCoordinatorMode(): boolean {
  // First check new feature flag system
  if (!isFeatureEnabled('COORDINATOR_MODE')) {
    return false
  }

  // Then check environment variable
  return process.env.CLAUDE_CODE_COORDINATOR_MODE === '1'
}

/**
 * Initialize Coordinator integration.
 */
export function initCoordinator(): void {
  if (coordinatorInitialized) {
    return
  }

  if (!isFeatureEnabled('COORDINATOR_MODE')) {
    console.log('[Coordinator] Feature disabled, skipping initialization')
    return
  }

  console.log('[Coordinator] Initializing multi-agent orchestration...')

  // Set up event listeners for worker tracking
  setupCoordinatorEventListeners()

  coordinatorInitialized = true
  console.log('[Coordinator] Initialization complete')
}

/**
 * Activate Coordinator mode.
 */
export function activateCoordinator(): void {
  if (!isFeatureEnabled('COORDINATOR_MODE')) {
    console.warn('[Coordinator] Cannot activate: feature disabled')
    return
  }

  if (!coordinatorInitialized) {
    initCoordinator()
  }

  // Set environment variable
  process.env.CLAUDE_CODE_COORDINATOR_MODE = '1'
  coordinatorActive = true

  console.log('[Coordinator] Multi-agent mode activated')

  // Emit event
  eventBus.emit(EventTypes.COORDINATOR_MODE_CHANGED, { active: true })
}

/**
 * Deactivate Coordinator mode.
 */
export function deactivateCoordinator(): void {
  // Unset environment variable
  delete process.env.CLAUDE_CODE_COORDINATOR_MODE
  coordinatorActive = false

  console.log('[Coordinator] Multi-agent mode deactivated')

  // Emit event
  eventBus.emit(EventTypes.COORDINATOR_MODE_CHANGED, { active: false })
}

/**
 * Toggle Coordinator mode.
 */
export function toggleCoordinator(): boolean {
  if (isCoordinatorMode()) {
    deactivateCoordinator()
    return false
  } else {
    activateCoordinator()
    return true
  }
}

/**
 * Get Coordinator status.
 */
export function getCoordinatorStatus(): {
  initialized: boolean
  active: boolean
  enabled: boolean
} {
  return {
    initialized: coordinatorInitialized,
    active: coordinatorActive,
    enabled: isFeatureEnabled('COORDINATOR_MODE'),
  }
}

// Internal: Set up event listeners
function setupCoordinatorEventListeners(): void {
  // Track agent spawning
  eventBus.on(EventTypes.AGENT_SPAWNED, (data) => {
    if (!coordinatorActive) return

    console.log(`[Coordinator] Worker spawned: ${data.agentId}`)
  })

  // Track agent completion
  eventBus.on(EventTypes.AGENT_COMPLETED, (data) => {
    if (!coordinatorActive) return

    console.log(`[Coordinator] Worker completed: ${data.agentId}`)
  })
}

// Auto-initialize if feature is enabled
if (isFeatureEnabled('COORDINATOR_MODE')) {
  setTimeout(() => {
    initCoordinator()
  }, 5000)
}
