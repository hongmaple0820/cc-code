/**
 * Buddy AI Integration - Enhanced Companion System
 *
 * Bridges Buddy AI with the existing companion system.
 * Provides productivity tracking, emotion detection, and celebration effects.
 */

import { buddyAI, BuddyAI } from '../../modules/buddy/BuddyAI.js'
import { isFeatureEnabled } from '../../core/featureFlags.js'
import { eventBus, EventTypes } from '../../core/events/eventBus.js'

// Track Buddy state
let buddyInitialized = false
let buddyActive = false

/**
 * Initialize Buddy AI integration.
 * Called once at startup if BUDDY feature is enabled.
 */
export function initBuddy(): void {
  if (buddyInitialized) {
    return
  }

  if (!isFeatureEnabled('BUDDY')) {
    console.log('[Buddy] Feature disabled, skipping initialization')
    return
  }

  console.log('[Buddy] Initializing enhanced companion system...')

  // Set up event listeners
  setupBuddyEventListeners()

  buddyInitialized = true
  console.log('[Buddy] Initialization complete')
}

/**
 * Activate Buddy AI enhanced features.
 */
export function activateBuddy(): void {
  if (!isFeatureEnabled('BUDDY')) {
    console.warn('[Buddy] Cannot activate: feature disabled')
    return
  }

  if (!buddyInitialized) {
    initBuddy()
  }

  // Update Buddy AI config
  buddyAI.updateConfig({
    enabled: true,
    emotionDetection: true,
    productivityAssistance: true,
    celebrationEnabled: true,
    codeQualityReflection: true,
    personalityAdaptation: true,
    breakReminders: true,
    workSessionTracking: true,
  })

  buddyActive = true
  console.log('[Buddy] Enhanced features activated')

  // Emit event for UI updates
  eventBus.emit('buddy:mode:changed', { active: true })
}

/**
 * Deactivate Buddy AI enhanced features.
 * Falls back to basic companion mode.
 */
export function deactivateBuddy(): void {
  // Update Buddy AI config
  buddyAI.updateConfig({
    enabled: false,
    emotionDetection: false,
    productivityAssistance: false,
    celebrationEnabled: false,
    codeQualityReflection: false,
    personalityAdaptation: false,
    breakReminders: false,
    workSessionTracking: false,
  })

  buddyActive = false
  console.log('[Buddy] Enhanced features deactivated')

  // Emit event
  eventBus.emit('buddy:mode:changed', { active: false })
}

/**
 * Check if Buddy AI is currently active.
 */
export function isBuddyActive(): boolean {
  return buddyActive && buddyAI.getConfig().enabled
}

/**
 * Get current Buddy status for UI display.
 */
export function getBuddyStatus(): {
  initialized: boolean
  active: boolean
  emotion: string
  metrics: {
    filesModified: number
    testsRun: number
    sessionDuration: number
  }
} {
  const emotion = buddyAI.getCurrentEmotion()
  const metrics = buddyAI.getProductivityMetrics()

  return {
    initialized: buddyInitialized,
    active: isBuddyActive(),
    emotion: emotion.type,
    metrics: {
      filesModified: metrics.filesModified,
      testsRun: metrics.testsRun,
      sessionDuration: metrics.sessionDuration,
    },
  }
}

/**
 * Get productivity summary for display.
 */
export function getProductivitySummary(): string {
  const metrics = buddyAI.getProductivityMetrics()
  return `Session: ${metrics.filesModified} files modified, ${metrics.testsRun} tests run`
}

/**
 * Toggle Buddy on/off.
 */
export function toggleBuddy(): boolean {
  if (isBuddyActive()) {
    deactivateBuddy()
    return false
  } else {
    activateBuddy()
    return true
  }
}

/**
 * Record a break (for break reminder feature).
 */
export function recordBuddyBreak(): void {
  buddyAI.recordBreak()
}

// Internal: Set up event listeners for Buddy
function setupBuddyEventListeners(): void {
  // Listen for celebration triggers
  eventBus.on(EventTypes.TOOL_COMPLETED, (data) => {
    if (!buddyActive) return

    // Trigger celebration on successful test run
    if (data.toolName === 'BashTool' && data.output?.exitCode === 0) {
      const command = data.input?.command || ''
      if (command.includes('test') || command.includes('npm test')) {
        buddyAI.celebrateAchievement('test_success')
      }
    }
  })

  // Listen for git commits
  eventBus.on(EventTypes.TOOL_COMPLETED, (data) => {
    if (!buddyActive) return

    if (data.toolName === 'BashTool') {
      const command = data.input?.command || ''
      if (command.startsWith('git commit')) {
        buddyAI.celebrateAchievement('first_commit')
      }
    }
  })
}

// Auto-initialize if feature is enabled (lazy, on first import)
if (isFeatureEnabled('BUDDY')) {
  // Delay initialization to avoid startup impact
  setTimeout(() => {
    initBuddy()
  }, 3000)
}
