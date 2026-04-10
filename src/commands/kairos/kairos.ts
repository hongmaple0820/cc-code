// Kairos command - Toggle proactive assistant mode
// Usage: /kairos [on|off|status]

import { activateKairos, deactivateKairos, isKairosActive, getKairosStatus } from '../../integrations/kairos/KairosIntegration.js'
import { isFeatureEnabled } from '../../core/featureFlags.js'

export const description = 'Toggle Kairos proactive assistant mode'
export const help = `
Kairos - Proactive Assistant Mode

Usage:
  /kairos        - Toggle on/off
  /kairos on     - Activate proactive mode
  /kairos off    - Deactivate proactive mode
  /kairos status - Show current status

When active, Kairos will:
- Observe your coding patterns
- Suggest tests after code changes
- Offer help when tests fail
- Suggest background tasks for long operations
`

export async function execute(args: string[]): Promise<string> {
  // Check if feature is enabled
  if (!isFeatureEnabled('KAIROS')) {
    return '❌ Kairos feature is disabled. Enable it with CLAUDE_CODE_ENABLE_KAIROS=1'
  }

  const subcommand = args[0]?.toLowerCase()

  switch (subcommand) {
    case 'on':
    case 'enable':
      if (isKairosActive()) {
        return 'Kairos is already active.'
      }
      activateKairos()
      return '✅ Kairos proactive mode activated. I\'ll now observe and suggest actions.'

    case 'off':
    case 'disable':
      if (!isKairosActive()) {
        return 'Kairos is already inactive.'
      }
      deactivateKairos()
      return '✅ Kairos proactive mode deactivated.'

    case 'status':
    case 'info': {
      const status = getKairosStatus()
      return `Kairos Status:
  ${status.active ? '🟢 Active' : '⚪ Inactive'}
  Initialized: ${status.initialized ? '✅' : '❌'}
  Paused: ${status.paused ? '⏸️' : '▶️'}
  Observations: ${status.observations}
  Active Tasks: ${status.tasks}`
    }

    default: {
      // Toggle
      const isActive = isKairosActive()
      if (isActive) {
        deactivateKairos()
        return '✅ Kairos proactive mode deactivated.'
      } else {
        activateKairos()
        return '✅ Kairos proactive mode activated. I\'ll now observe and suggest actions.'
      }
    }
  }
}
