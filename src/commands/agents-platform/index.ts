// Agents Platform Command - Anthropic agents platform
// Access to the Anthropic agents platform

import type { Command } from '../../types/command.js'

const agentsPlatformCommand: Command = {
  type: 'prompt',
  name: 'agents-platform',
  description: 'Access the Anthropic agents platform (internal)',
  aliases: ['ant', 'platform'],
  source: 'builtin',
  async getPromptForCommand(args) {
    const parts = args?.trim().split(' ') || []
    const subcommand = parts[0]?.toLowerCase()

    switch (subcommand) {
      case 'status':
        return {
          type: 'prompt',
          prompt: `🐜 Agents Platform Status

Platform: Available
User type: ${process.env.USER_TYPE || 'standard'}

This is an internal Anthropic feature.`,
        }

      case 'list':
        return {
          type: 'prompt',
          prompt: `🐜 Available Agents

- Claude Code (current)
- Claude Desktop
- Claude API

Access managed by USER_TYPE environment variable.`,
        }

      default:
        return {
          type: 'prompt',
          prompt: `🐜 Anthropic Agents Platform

Usage:
  /agents-platform status  - Show platform status
  /agents-platform list    - List available agents

This feature is for internal Anthropic users (USER_TYPE=ant).`,
        }
    }
  },
}

export default agentsPlatformCommand
