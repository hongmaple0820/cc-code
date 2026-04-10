// Peers Command - Inter-session communication
// Communicate with other Claude Code sessions

import type { Command } from '../../types/command.js'
import { isFeatureEnabled } from '../../core/featureFlags.js'

interface PeerMessage {
  id: string
  from: string
  content: string
  timestamp: number
}

const messages: PeerMessage[] = []

const peersCommand: Command = {
  type: 'prompt',
  name: 'peers',
  description: 'Inter-session communication with other Claude Code instances',
  aliases: ['inbox', 'msg'],
  source: 'builtin',
  async getPromptForCommand(args) {
    if (!isFeatureEnabled('UDS_INBOX')) {
      return {
        type: 'prompt',
        prompt: `Peers messaging is not enabled.

To enable it, set the environment variable:
export CLAUDE_CODE_ENABLE_UDS_INBOX=1`,
      }
    }

    const parts = args?.trim().split(' ') || []
    const subcommand = parts[0]?.toLowerCase()
    const message = parts.slice(1).join(' ')

    switch (subcommand) {
      case 'send':
        if (!message) {
          return {
            type: 'prompt',
            prompt: 'Usage: /peers send <message>',
          }
        }
        messages.push({
          id: Math.random().toString(36).slice(2),
          from: 'current-session',
          content: message,
          timestamp: Date.now(),
        })
        return {
          type: 'prompt',
          prompt: `📤 Message sent: ${message}`,
        }

      case 'list':
      case 'inbox':
        if (messages.length === 0) {
          return {
            type: 'prompt',
            prompt: '📭 Inbox is empty.',
          }
        }
        return {
          type: 'prompt',
          prompt: `📬 Messages:\n\n${messages.map(m => `[${new Date(m.timestamp).toLocaleTimeString()}] ${m.from}: ${m.content}`).join('\n')}`,
        }

      case 'clear':
        messages.length = 0
        return {
          type: 'prompt',
          prompt: '🗑️ Inbox cleared.',
        }

      default:
        return {
          type: 'prompt',
          prompt: `📨 Peers - Inter-Session Communication

Usage:
  /peers send <message>  - Send a message
  /peers list            - View inbox
  /peers clear           - Clear inbox

Note: This is a local implementation. Full UDS requires system-level IPC.`,
        }
    }
  },
}

export default peersCommand
