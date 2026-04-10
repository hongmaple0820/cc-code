/**
 * Unified Feature Flags - Bridge between bun:bundle and new feature flag system
 *
 * This module provides a migration path from the legacy bun:bundle feature flags
 * to the new centralized feature flag system in src/core/featureFlags.ts.
 */

import { isFeatureEnabled } from '../core/featureFlags.js'

// Set of features that are managed by the new system
// These will be checked against src/core/featureFlags.ts first
const NEW_SYSTEM_FEATURES = new Set<string>([
  'ULTRAPLAN',
  'COORDINATOR_MODE',
  'KAIROS',
  'BUDDY',
  'SMART_SHELL',
  'PROACTIVE',
  'BRIDGE_MODE',
  'VOICE_MODE',
  'DAEMON',
  'WORKFLOW_SCRIPTS',
  'MCP_SKILLS',
  'HISTORY_SNIP',
  'EXPERIMENTAL_SKILL_SEARCH',
  'TORCH',
  'UDS_INBOX',
  'FORK_SUBAGENT',
  'CCR_REMOTE_SETUP',
  'KAIROS_GITHUB_WEBHOOKS',
  'AGENT_TRIGGERS',
  'MONITOR_TOOL',
])

/**
 * Unified feature flag check function.
 *
 * Priority:
 * 1. New system (src/core/featureFlags.ts) - for newly added features
 * 2. Return false for unknown features (for now, during migration)
 *
 * Note: bun:bundle feature() requires string literals, so we can't pass variables.
 * During migration, only new system features are supported.
 *
 * @param name - Feature flag name
 * @returns true if feature is enabled
 */
export function feature(name: string): boolean {
  // Check new system first for features it manages
  if (NEW_SYSTEM_FEATURES.has(name)) {
    return isFeatureEnabled(name as any)
  }

  // Unknown features default to false during migration
  // Legacy bun:bundle features should be imported directly where needed
  return false
}

/**
 * Check if a feature is managed by the new system.
 * Useful for debugging and migration tracking.
 */
export function isNewSystemFeature(name: string): boolean {
  return NEW_SYSTEM_FEATURES.has(name)
}

/**
 * Get list of all features managed by the new system.
 */
export function getNewSystemFeatures(): string[] {
  return Array.from(NEW_SYSTEM_FEATURES)
}

/**
 * Legacy compatibility alias.
 * @deprecated Use `feature()` instead
 */
export const isFeatureEnabled = feature

// Re-export types from core for convenience
export type { FeatureFlags } from '../core/featureFlags.js'
export { listEnabledFeatures, getFeatureStatus } from '../core/featureFlags.js'
