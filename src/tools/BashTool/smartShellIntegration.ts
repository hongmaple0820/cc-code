/**
 * Enhanced destructive command detection with Smart Shell integration.
 * Falls back to legacy pattern matching when Smart Shell is disabled.
 */

import { smartShell } from '../../modules/smartshell/SmartShell.js'
import { isFeatureEnabled } from '../../core/featureFlags.js'

// Re-export original implementation for fallback
export {
  getDestructiveCommandWarning as getLegacyDestructiveCommandWarning,
} from './destructiveCommandWarning.js'

/**
 * Risk level mapping from Smart Shell to UI warnings
 */
const RISK_LEVEL_MESSAGES: Record<string, string> = {
  critical: '⚠️ 危险命令：可能造成严重数据丢失或系统损坏',
  high: '⚠️ 高风险命令：请确认您了解此操作的影响',
  medium: '注意：此命令可能有副作用',
  low: '提示：轻微风险操作',
}

/**
 * Enhanced command risk analysis using Smart Shell.
 * Returns detailed warning with risk score and reasons.
 */
export function analyzeCommandRisk(
  command: string,
): {
  warning: string | null
  level: 'critical' | 'high' | 'medium' | 'low' | 'none'
  score: number
  reasons: string[]
  requiresConfirmation: boolean
} {
  // Check if Smart Shell is enabled
  if (!isFeatureEnabled('SMART_SHELL')) {
    // Fall back to legacy implementation
    const { getLegacyDestructiveCommandWarning } = require('./destructiveCommandWarning.js')
    const warning = getLegacyDestructiveCommandWarning(command)
    return {
      warning,
      level: warning ? 'medium' : 'none',
      score: warning ? 50 : 0,
      reasons: warning ? [warning] : [],
      requiresConfirmation: !!warning,
    }
  }

  try {
    const assessment = smartShell.analyzeRisk(command)

    if (assessment.level === 'none') {
      return {
        warning: null,
        level: 'none',
        score: 0,
        reasons: [],
        requiresConfirmation: false,
      }
    }

    // Build detailed warning message
    const baseMessage = RISK_LEVEL_MESSAGES[assessment.level] || '注意：此命令有风险'
    const reasonDescriptions = assessment.reasons.map(r => typeof r === 'string' ? r : r.description)
    const reasonsText = reasonDescriptions.length > 0
      ? ` (${reasonDescriptions.join(', ')})`
      : ''

    return {
      warning: `${baseMessage}${reasonsText}`,
      level: assessment.level,
      score: assessment.score,
      reasons: reasonDescriptions,
      requiresConfirmation: assessment.requiresConfirmation,
    }
  } catch (error) {
    // Smart Shell failed, fall back to legacy
    const { getLegacyDestructiveCommandWarning } = require('./destructiveCommandWarning.js')
    const warning = getLegacyDestructiveCommandWarning(command)
    return {
      warning,
      level: warning ? 'medium' : 'none',
      score: warning ? 50 : 0,
      reasons: warning ? [warning] : [],
      requiresConfirmation: !!warning,
    }
  }
}

/**
 * Legacy compatibility: returns simple warning string or null.
 * Used by existing permission request components.
 */
export function getDestructiveCommandWarning(command: string): string | null {
  const result = analyzeCommandRisk(command)
  return result.warning
}

/**
 * Quick check if command requires high-confidence confirmation.
 * Used for auto-approval decision making.
 */
export function requiresHighConfidenceConfirmation(command: string): boolean {
  if (!isFeatureEnabled('SMART_SHELL')) {
    return false
  }

  try {
    const assessment = smartShell.analyzeRisk(command)
    return assessment.level === 'critical' || assessment.level === 'high'
  } catch {
    return false
  }
}
