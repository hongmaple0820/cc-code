/**
 * Kairos Integration - Proactive Assistant Mode
 *
 * Bridges the Kairos Engine with Claude Code's existing proactive system.
 * Provides opt-in autonomous observation and action capabilities.
 */

import { kairosEngine, KairosEngine } from '../../modules/kairos/KairosEngine.js'
import { isFeatureEnabled } from '../../core/featureFlags.js'
import { eventBus, EventTypes } from '../../core/events/eventBus.js'
import {
  activateProactive,
  deactivateProactive,
  pauseProactive,
  resumeProactive,
  isProactiveActive,
  isProactivePaused,
} from '../../proactive/index.js'

// Track Kairos state
let kairosInitialized = false
let kairosActive = false

/**
 * Initialize Kairos integration.
 * Called once at startup if KAIROS feature is enabled.
 */
export function initKairos(): void {
  if (kairosInitialized) {
    return
  }

  if (!isFeatureEnabled('KAIROS')) {
    console.log('[Kairos] Feature disabled, skipping initialization')
    return
  }

  console.log('[Kairos] Initializing proactive assistant mode...')

  // Set up event listeners
  setupKairosEventListeners()

  // Subscribe to proactive system changes
  const { subscribeToProactiveChanges } = require('../../proactive/index.js')
  subscribeToProactiveChanges(() => {
    syncKairosWithProactiveState()
  })

  kairosInitialized = true
  console.log('[Kairos] Initialization complete')
}

/**
 * Activate Kairos proactive mode.
 * User-initiated activation.
 */
export function activateKairos(): void {
  if (!isFeatureEnabled('KAIROS')) {
    console.warn('[Kairos] Cannot activate: feature disabled')
    return
  }

  if (!kairosInitialized) {
    initKairos()
  }

  // Activate through existing proactive system
  activateProactive('kairos')

  // Activate Kairos engine
  kairosEngine.activate()
  kairosActive = true

  console.log('[Kairos] Proactive mode activated')

  // Emit event for UI updates
  eventBus.emit(EventTypes.PROACTIVE_MODE_CHANGED, {
    active: true,
    source: 'kairos',
  })
}

/**
 * Deactivate Kairos proactive mode.
 */
export function deactivateKairos(): void {
  // Deactivate through existing proactive system
  deactivateProactive()

  // Deactivate Kairos engine
  kairosEngine.deactivate()
  kairosActive = false

  console.log('[Kairos] Proactive mode deactivated')

  // Emit event
  eventBus.emit(EventTypes.PROACTIVE_MODE_CHANGED, {
    active: false,
    source: 'kairos',
  })
}

/**
 * Pause Kairos temporarily (e.g., during sensitive operations).
 */
export function pauseKairos(): void {
  pauseProactive()
  kairosEngine.pause()
  console.log('[Kairos] Paused')
}

/**
 * Resume Kairos after pause.
 */
export function resumeKairos(): void {
  resumeProactive()
  kairosEngine.resume()
  console.log('[Kairos] Resumed')
}

/**
 * Check if Kairos is currently active.
 */
export function isKairosActive(): boolean {
  return kairosActive && isProactiveActive()
}

/**
 * Check if Kairos is paused.
 */
export function isKairosPaused(): boolean {
  return isProactivePaused()
}

/**
 * Get current Kairos status for UI display.
 */
export function getKairosStatus(): {
  initialized: boolean
  active: boolean
  paused: boolean
  observations: number
  tasks: number
} {
  return {
    initialized: kairosInitialized,
    active: isKairosActive(),
    paused: isKairosPaused(),
    observations: kairosEngine.getObservations().length,
    tasks: kairosEngine.getTasks().length,
  }
}

/**
 * Toggle Kairos on/off.
 */
export function toggleKairos(): boolean {
  if (isKairosActive()) {
    deactivateKairos()
    return false
  } else {
    activateKairos()
    return true
  }
}

// Internal: Set up event listeners for tool events
function setupKairosEventListeners(): void {
  // Listen for tool completions to feed Kairos observations
  eventBus.on(EventTypes.TOOL_COMPLETED, (data) => {
    if (!kairosActive || isProactivePaused()) {
      return
    }

    // Feed relevant events to Kairos
    if (data.toolName === 'BashTool' && data.output?.exitCode !== 0) {
      kairosEngine.observe({
        type: 'test_failure',
        timestamp: Date.now(),
        context: {
          errorMessage: data.output?.stderr || 'Command failed',
          timestamp: Date.now(),
        },
        relevance: 0.8,
      })
    }

    // Track long operations
    if (data.duration && data.duration > 30000) {
      kairosEngine.observe({
        type: 'long_operation',
        timestamp: Date.now(),
        context: {
          duration: data.duration,
          timestamp: Date.now(),
        },
        relevance: 0.5,
      })
    }
  })

  // Listen for memory creation
  eventBus.on(EventTypes.MEMORY_CREATED, (data) => {
    if (!kairosActive || isProactivePaused()) {
      return
    }

    kairosEngine.observe({
      type: 'memory_trigger',
      timestamp: Date.now(),
      context: {
        userInput: data.content,
        timestamp: Date.now(),
      },
      relevance: 0.4,
    })
  })
}

// Internal: Sync Kairos state with proactive system changes
function syncKairosWithProactiveState(): void {
  const proactiveActive = isProactiveActive()

  if (proactiveActive && !kairosActive) {
    // Proactive was activated externally, activate Kairos too
    kairosEngine.activate()
    kairosActive = true
  } else if (!proactiveActive && kairosActive) {
    // Proactive was deactivated externally, deactivate Kairos too
    kairosEngine.deactivate()
    kairosActive = false
  }
}

// Auto-initialize if feature is enabled (lazy, on first import)
if (isFeatureEnabled('KAIROS')) {
  // Delay initialization to avoid startup impact
  setTimeout(() => {
    initKairos()
  }, 5000)
}
