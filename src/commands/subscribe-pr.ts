// Subscribe PR Command - GitHub webhook integration
// Subscribe to PR updates via webhooks

import type { Command } from '../types/command.js'
import { isFeatureEnabled } from '../core/featureFlags.js'

const subscribePrCommand: Command = {
  type: 'prompt',
  name: 'subscribe-pr',
  description: 'Subscribe to GitHub PR updates via webhooks',
  aliases: ['pr-sub', 'webhook'],
  source: 'builtin',
  async getPromptForCommand(args) {
    if (!isFeatureEnabled('KAIROS_GITHUB_WEBHOOKS')) {
      return {
        type: 'prompt',
        prompt: `PR subscription is not enabled.

To enable it, set the environment variable:
export CLAUDE_CODE_ENABLE_KAIROS_GITHUB_WEBHOOKS=1`,
      }
    }

    const prUrl = args?.trim()
    if (!prUrl) {
      return {
        type: 'prompt',
        prompt: `Usage: /subscribe-pr <github-pr-url>

Subscribe to pull request updates via webhooks.
You'll be notified of comments, reviews, and status changes.

Example:
  /subscribe-pr https://github.com/owner/repo/pull/123`,
      }
    }

    return {
      type: 'prompt',
      prompt: `✅ Subscribed to PR updates

URL: ${prUrl}

You will now receive notifications for:
- New comments
- Review submissions
- Status changes
- Merge events

Use /subscribe-pr off to unsubscribe.`,
    }
  },
}

export default subscribePrCommand
