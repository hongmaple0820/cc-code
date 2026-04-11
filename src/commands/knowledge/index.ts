// Knowledge Base Command
// CLI interface for persistent knowledge management

import type { Command } from '../../types/command.js'
import { knowledgeBase } from '../../modules/knowledgebase/KnowledgeBase.js'
import type { KnowledgeType } from '../../modules/knowledgebase/KnowledgeBase.js'

const knowledgeCommand: Command = {
  type: 'local',
  name: 'knowledge',
  aliases: ['kb', 'kbase'],
  description: 'Manage persistent knowledge base',
  source: 'builtin',
  async call(args, _context) {
    await knowledgeBase.initialize()

    const trimmedArgs = args?.trim() || ''
    const parts = trimmedArgs.split(/\s+/)
    const subcommand = parts[0]?.toLowerCase() || 'help'

    switch (subcommand) {
      case 'add': {
        const type = parts[1] as KnowledgeType || 'lesson'
        const title = parts.slice(2).join(' ') || 'Untitled Knowledge'
        const entry = knowledgeBase.add({
          title,
          type,
          tags: ['manual'],
          content: `Knowledge entry: ${title}\n\nType: ${type}\n\nEdit this file to add detailed content.`,
          verified: false,
        })
        return {
          type: 'text',
          value: `Added knowledge entry:\n  ID: ${entry.id}\n  Title: ${entry.title}\n  Type: ${entry.type}\n\nUse /knowledge verify ${entry.id} to mark as verified.`,
        }
      }

      case 'search': {
        const query = parts.slice(1).join(' ')
        if (!query) return { type: 'text', value: 'Usage: /knowledge search <keywords>' }
        const results = knowledgeBase.search(query, 10)
        if (results.length === 0) {
          return { type: 'text', value: `No results for: "${query}"` }
        }
        const lines = results.map(r => {
          const icon = r.verified ? '✅' : ' '
          const snippet = r.content.slice(0, 80).replace(/\n/g, ' ')
          return `${icon} [${r.type}] ${r.title}\n   ID: ${r.id} | relevance: ${r.relevance.toFixed(2)} | accesses: ${r.accessCount}\n   ${snippet}...`
        }).join('\n\n')
        return {
          type: 'text',
          value: `Search results for "${query}" (${results.length}):\n\n${lines}`,
        }
      }

      case 'list': {
        const typeFilter = parts[1] as KnowledgeType | undefined
        const query = typeFilter ? { type: typeFilter } : {}
        const entries = knowledgeBase.query({ ...query, limit: 20 })
        if (entries.length === 0) {
          return { type: 'text', value: typeFilter ? `No entries of type: ${typeFilter}` : 'Knowledge base is empty.' }
        }
        const lines = entries.map(e => {
          const icon = e.verified ? '✅' : ' '
          return `${icon} ${e.id.slice(0, 20)}  ${e.title}  [${e.type}]  relevance: ${e.relevance.toFixed(2)}  accessed: ${e.accessCount}x`
        }).join('\n')
        return {
          type: 'text',
          value: `Knowledge Entries (${entries.length}):\n\n${lines}`,
        }
      }

      case 'get': {
        const id = parts[1]
        if (!id) return { type: 'text', value: 'Usage: /knowledge get <id>' }
        const entry = knowledgeBase.get(id)
        if (!entry) return { type: 'text', value: `Entry ${id} not found.` }
        const related = entry.relatedIds.length > 0
          ? `\n  Related: ${entry.relatedIds.join(', ')}`
          : ''
        const supersedes = entry.supersedes.length > 0
          ? `\n  Supersedes: ${entry.supersedes.join(', ')}`
          : ''
        return {
          type: 'text',
          value: `Entry: ${entry.title}
  ID: ${entry.id}
  Type: ${entry.type}
  Tags: ${entry.tags.join(', ') || 'none'}
  Verified: ${entry.verified ? `Yes (${entry.verifiedBy ?? 'unknown'})` : 'No'}
  Relevance: ${entry.relevance.toFixed(2)}
  Accessed: ${entry.accessCount}x${related}${supersedes}

Content:
${entry.content}`,
        }
      }

      case 'verify': {
        const id = parts[1]
        if (!id) return { type: 'text', value: 'Usage: /knowledge verify <id>' }
        const ok = knowledgeBase.verify(id, 'user')
        return { type: 'text', value: ok ? `Verified entry: ${id}` : `Entry ${id} not found.` }
      }

      case 'feedback': {
        const id = parts[1]
        const rating = parts[2]
        if (!id || !rating) return { type: 'text', value: 'Usage: /knowledge feedback <id> <helpful|not-helpful>' }
        const helpful = rating === 'helpful' || rating === 'yes' || rating === '1'
        knowledgeBase.recordFeedback(id, helpful, process.env.CLAUDE_CODE_SESSION_ID ?? 'unknown')
        return { type: 'text', value: `Feedback recorded for ${id}.` }
      }

      case 'stats': {
        const stats = knowledgeBase.getStats()
        const byTypeLines = Object.entries(stats.byType)
          .filter(([, count]) => count > 0)
          .map(([type, count]) => `  ${type}: ${count}`)
          .join('\n')
        const topTagsLines = stats.topTags.map(t => `  ${t.tag}: ${t.count}`).join('\n')
        return {
          type: 'text',
          value: `Knowledge Base Stats:
  Total entries: ${stats.total}
  Verified: ${stats.verifiedCount}
  Stale (30+ days): ${stats.staleCount}
  Avg relevance: ${stats.avgRelevance.toFixed(2)}

  By Type:
${byTypeLines || '  (none)'}

  Top Tags:
${topTagsLines || '  (none)'}`,
        }
      }

      case 'consolidate': {
        const result = knowledgeBase.consolidate()
        return {
          type: 'text',
          value: `Consolidation complete:
  Removed stale entries: ${result.removed}
  Merged duplicates: ${result.merged}`,
        }
      }

      case 'help':
      default:
        return {
          type: 'text',
          value: `Knowledge Base - Persistent knowledge management

Commands:
  /knowledge add <type> <title>   Add a new knowledge entry
  /knowledge search <keywords>    Search by keywords
  /knowledge list [type]          List entries (optionally filter by type)
  /knowledge get <id>             View entry details
  /knowledge verify <id>          Mark entry as verified
  /knowledge feedback <id> <rating>  Give feedback (helpful/not-helpful)
  /knowledge stats                Show knowledge base statistics
  /knowledge consolidate          Clean up stale entries, merge duplicates
  /knowledge help                 Show this help

Knowledge Types:
  lesson, pattern, best_practice, anti_pattern,
  decision, troubleshooting, workflow, reference`,
        }
    }
  },
  isEnabled: () => true,
}

export default knowledgeCommand
