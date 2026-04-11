// Knowledge Base - Persistent knowledge consolidation
// Stores experience, lessons, and best practices as retrievable knowledge files

import { eventBus } from '../../core/events/eventBus.js'
import { container, createToken } from '../../core/di/container.js'
import {
  existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, statSync,
} from 'fs'
import { join, relative } from 'path'

// Knowledge types
export type KnowledgeType =
  | 'lesson'       // Learned from experience (failure or success)
  | 'pattern'      // Recurring code/design pattern
  | 'best_practice' // Recommended approach
  | 'anti_pattern'  // What to avoid
  | 'decision'     // Architecture/design decision with rationale
  | 'troubleshooting' // How to diagnose and fix issues
  | 'workflow'     // Step-by-step process
  | 'reference'    // Factual reference information

export interface KnowledgeEntry {
  id: string
  title: string
  type: KnowledgeType
  tags: string[]
  content: string
  // Metadata for retrieval
  relevance: number       // 0-1, auto-updated based on usage
  createdAt: number
  updatedAt: number
  lastAccessedAt: number
  accessCount: number
  // Context
  sourceFile?: string     // Code file that inspired this
  sourceTaskId?: string   // Task that led to this knowledge
  sessionId?: string      // Session where it was learned
  // Relationships
  relatedIds: string[]
  supersedes: string[]    // IDs this replaces
  // Verification
  verified: boolean
  verifiedBy?: string
  verifiedAt?: number
}

export interface KnowledgeQuery {
  type?: KnowledgeType | KnowledgeType[]
  tags?: string[]         // must include all
  tagsAny?: string[]      // must include any
  minRelevance?: number
  createdAfter?: number
  limit?: number
  sortBy?: 'relevance' | 'createdAt' | 'accessCount' | 'lastAccessedAt'
}

export interface KnowledgeStats {
  total: number
  byType: Record<KnowledgeType, number>
  avgRelevance: number
  verifiedCount: number
  staleCount: number      // not accessed in 30+ days
  topTags: Array<{ tag: string; count: number }>
}

export interface KnowledgeFeedback {
  entryId: string
  helpful: boolean
  sessionId: string
  timestamp: number
  comment?: string
}

const KNOWLEDGE_DIR = '.omc/knowledge'

function generateId(): string {
  return `kb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function ensureKnowledgeDir(): void {
  if (!existsSync(KNOWLEDGE_DIR)) {
    mkdirSync(KNOWLEDGE_DIR, { recursive: true })
  }
}

function entryFilePath(id: string): string {
  return join(KNOWLEDGE_DIR, `${id}.json`)
}

function saveEntry(entry: KnowledgeEntry): void {
  ensureKnowledgeDir()
  writeFileSync(entryFilePath(entry.id), JSON.stringify(entry, null, 2))
}

function loadEntry(id: string): KnowledgeEntry | null {
  try {
    const data = readFileSync(entryFilePath(id), 'utf-8')
    return JSON.parse(data)
  } catch {
    return null
  }
}

function loadAllEntries(): KnowledgeEntry[] {
  ensureKnowledgeDir()
  const files = readdirSync(KNOWLEDGE_DIR).filter(f => f.endsWith('.json'))
  const entries: KnowledgeEntry[] = []
  for (const file of files) {
    const id = file.replace('.json', '')
    const entry = loadEntry(id)
    if (entry) entries.push(entry)
  }
  return entries
}

function deleteEntryFile(id: string): void {
  try {
    rmSync(entryFilePath(id))
  } catch {
    // ignore
  }
}

// TF-IDF-like keyword extraction for indexing
function extractKeywords(content: string, title: string): string[] {
  const text = `${title} ${content}`.toLowerCase()
  // Simple keyword extraction
  const words = text.match(/[a-z]{3,}/g) || []
  const stopWords = new Set([
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
    'her', 'was', 'one', 'our', 'out', 'has', 'have', 'been', 'this', 'that',
    'with', 'from', 'they', 'will', 'each', 'make', 'like', 'just', 'over',
    'such', 'more', 'than', 'when', 'very', 'what', 'how', 'its', 'who',
    'should', 'would', 'could', 'does', 'doing', 'done', 'into', 'through',
    'during', 'before', 'after', 'above', 'below', 'between', 'because',
    'while', 'about', 'against', 'other', 'some', 'then', 'these', 'those',
    'which', 'their', 'there', 'where', 'being', 'having', 'if', 'also',
  ])
  const freq = new Map<string, number>()
  for (const word of words) {
    if (!stopWords.has(word)) {
      freq.set(word, (freq.get(word) ?? 0) + 1)
    }
  }
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word)
}

// Semantic similarity (simple keyword overlap)
function keywordSimilarity(keywordsA: string[], keywordsB: string[]): number {
  if (keywordsA.length === 0 || keywordsB.length === 0) return 0
  const setB = new Set(keywordsB)
  const overlap = keywordsA.filter(k => setB.has(k)).length
  return overlap / Math.max(keywordsA.length, keywordsB.length)
}

// Knowledge Base Engine
export class KnowledgeBase {
  private entries = new Map<string, KnowledgeEntry>()
  private index = new Map<string, string[]>()  // keyword -> entry IDs
  private feedback = new Map<string, KnowledgeFeedback[]>()

  constructor() {}

  // Initialize from disk
  async initialize(): Promise<void> {
    ensureKnowledgeDir()
    const entries = loadAllEntries()
    for (const entry of entries) {
      this.entries.set(entry.id, entry)
      this.indexEntry(entry)
    }
    eventBus.emit('knowledgebase:initialized', { count: entries.length })
  }

  // Add knowledge entry
  add(entry: Omit<KnowledgeEntry, 'id' | 'createdAt' | 'updatedAt' | 'accessCount' | 'lastAccessedAt' | 'relevance' | 'relatedIds' | 'supersedes' | 'verified'>): KnowledgeEntry {
    const now = Date.now()
    const keywords = extractKeywords(entry.content, entry.title)
    const newEntry: KnowledgeEntry = {
      ...entry,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
      accessCount: 0,
      lastAccessedAt: 0,
      relevance: 0.5, // Initial relevance
      relatedIds: [],
      supersedes: [],
      verified: false,
    }

    this.entries.set(newEntry.id, newEntry)
    this.indexEntry(newEntry)
    saveEntry(newEntry)

    // Find related entries
    this.findAndLinkRelated(newEntry)

    eventBus.emit('knowledgebase:added', { id: newEntry.id, title: newEntry.title })
    return newEntry
  }

  // Query knowledge
  query(q: KnowledgeQuery = {}): KnowledgeEntry[] {
    let results = Array.from(this.entries.values())

    // Filter by type
    if (q.type) {
      const types = Array.isArray(q.type) ? q.type : [q.type]
      results = results.filter(e => types.includes(e.type))
    }

    // Filter by tags (all)
    if (q.tags && q.tags.length > 0) {
      results = results.filter(e => q.tags!.every(tag => e.tags.includes(tag)))
    }

    // Filter by tags (any)
    if (q.tagsAny && q.tagsAny.length > 0) {
      results = results.filter(e => q.tagsAny!.some(tag => e.tags.includes(tag)))
    }

    // Filter by relevance
    if (q.minRelevance !== undefined) {
      results = results.filter(e => e.relevance >= q.minRelevance!)
    }

    // Filter by date
    if (q.createdAfter) {
      results = results.filter(e => e.createdAt >= q.createdAfter)
    }

    // Sort
    const sortBy = q.sortBy ?? 'relevance'
    results.sort((a, b) => {
      switch (sortBy) {
        case 'relevance': return b.relevance - a.relevance
        case 'createdAt': return b.createdAt - a.createdAt
        case 'accessCount': return b.accessCount - a.accessCount
        case 'lastAccessedAt': return b.lastAccessedAt - a.lastAccessedAt
        default: return 0
      }
    })

    // Limit
    if (q.limit) results = results.slice(0, q.limit)

    return results
  }

  // Search by keywords
  search(keywords: string, limit = 10): KnowledgeEntry[] {
    const queryKeywords = keywords.toLowerCase().split(/\s+/).filter(w => w.length > 2)
    if (queryKeywords.length === 0) return []

    const scored: Array<{ entry: KnowledgeEntry; score: number }> = []

    for (const entry of this.entries.values()) {
      let score = 0

      // Title match (highest weight)
      const titleLower = entry.title.toLowerCase()
      for (const kw of queryKeywords) {
        if (titleLower.includes(kw)) score += 3
      }

      // Tag match
      for (const kw of queryKeywords) {
        for (const tag of entry.tags) {
          if (tag.toLowerCase().includes(kw)) score += 2
        }
      }

      // Content keyword similarity
      const contentKeywords = extractKeywords(entry.content, entry.title)
      for (const kw of queryKeywords) {
        if (contentKeywords.includes(kw)) score += 1
      }

      // Relevance boost
      score *= (0.5 + entry.relevance)

      if (score > 0) {
        scored.push({ entry, score })
      }
    }

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ entry }) => {
        // Update access stats
        entry.accessCount++
        entry.lastAccessedAt = Date.now()
        saveEntry(entry)
        return entry
      })
  }

  // Get single entry
  get(id: string): KnowledgeEntry | null {
    const entry = this.entries.get(id)
    if (entry) {
      entry.accessCount++
      entry.lastAccessedAt = Date.now()
      saveEntry(entry)
    }
    return entry ?? null
  }

  // Update entry
  update(id: string, updates: Partial<Pick<KnowledgeEntry, 'content' | 'title' | 'tags' | 'type'>>): KnowledgeEntry | null {
    const entry = this.entries.get(id)
    if (!entry) return null

    if (updates.title) entry.title = updates.title
    if (updates.content) entry.content = updates.content
    if (updates.tags) entry.tags = updates.tags
    if (updates.type) entry.type = updates.type

    entry.updatedAt = Date.now()
    saveEntry(entry)
    return entry
  }

  // Verify entry
  verify(id: string, verifiedBy?: string): boolean {
    const entry = this.entries.get(id)
    if (!entry) return false

    entry.verified = true
    entry.verifiedBy = verifiedBy
    entry.verifiedAt = Date.now()
    entry.relevance = Math.min(1, entry.relevance + 0.1)
    saveEntry(entry)
    return true
  }

  // Record feedback
  recordFeedback(entryId: string, helpful: boolean, sessionId: string, comment?: string): void {
    if (!this.entries.has(entryId)) return

    const fb: KnowledgeFeedback = {
      entryId,
      helpful,
      sessionId,
      timestamp: Date.now(),
      comment,
    }

    const entryFeedback = this.feedback.get(entryId) ?? []
    entryFeedback.push(fb)
    this.feedback.set(entryId, entryFeedback)

    // Adjust relevance based on feedback
    const entry = this.entries.get(entryId)!
    const helpfulRatio = entryFeedback.filter(f => f.helpful).length / entryFeedback.length
    entry.relevance = helpfulRatio * 0.7 + entry.relevance * 0.3
    saveEntry(entry)
  }

  // Find related entries and link them
  private findAndLinkRelated(newEntry: KnowledgeEntry): void {
    const newKeywords = extractKeywords(newEntry.content, newEntry.title)
    const related: string[] = []

    for (const existing of this.entries.values()) {
      if (existing.id === newEntry.id) continue
      const existingKeywords = extractKeywords(existing.content, existing.title)
      const similarity = keywordSimilarity(newKeywords, existingKeywords)

      if (similarity > 0.2) {
        related.push(existing.id)
        // Bidirectional link
        if (!existing.relatedIds.includes(newEntry.id)) {
          existing.relatedIds.push(newEntry.id)
          saveEntry(existing)
        }
      }
    }

    newEntry.relatedIds = related.slice(0, 5)
    saveEntry(newEntry)
  }

  // Index entry keywords
  private indexEntry(entry: KnowledgeEntry): void {
    const keywords = extractKeywords(entry.content, entry.title)
    for (const kw of keywords) {
      const existing = this.index.get(kw) ?? []
      if (!existing.includes(entry.id)) {
        existing.push(entry.id)
        this.index.set(kw, existing)
      }
    }
  }

  // Auto-extract knowledge from task completion
  extractFromTaskResult(taskId: string, taskName: string, result: unknown, error?: string): KnowledgeEntry | null {
    if (error) {
      return this.add({
        title: `Troubleshooting: ${taskName} failed`,
        type: 'troubleshooting',
        tags: ['auto-extracted', 'task-failure', taskId],
        content: `Task "${taskName}" (ID: ${taskId}) failed with error:\n\n${error}\n\nReview and update this entry with the actual fix once resolved.`,
        sourceTaskId: taskId,
      })
    }

    return null // Don't auto-extract successes (too noisy)
  }

  // Consolidate stale entries
  consolidate(): { removed: number; merged: number } {
    const now = Date.now()
    const thirtyDays = 30 * 24 * 60 * 60 * 1000
    let removed = 0
    let merged = 0

    // Remove unverified entries with 0 access after 30 days
    for (const entry of this.entries.values()) {
      if (!entry.verified && entry.accessCount === 0 && (now - entry.createdAt) > thirtyDays) {
        deleteEntryFile(entry.id)
        this.entries.delete(entry.id)
        removed++
      }
    }

    // Find and merge duplicate-like entries
    const entries = Array.from(this.entries.values())
    const toMerge = new Set<string>()

    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const a = entries[i]
        const b = entries[j]
        if (toMerge.has(b.id)) continue

        const similarity = keywordSimilarity(
          extractKeywords(a.content, a.title),
          extractKeywords(b.content, b.title),
        )

        if (similarity > 0.8 && a.type === b.type) {
          // Merge b into a
          a.content += `\n\n--- Additional from merged entry ---\n${b.content}`
          a.tags = [...new Set([...a.tags, ...b.tags])]
          a.relatedIds = [...new Set([...a.relatedIds, ...b.relatedIds])]
          a.updatedAt = now
          saveEntry(a)

          // Mark b as superseded
          b.supersedes = []
          a.supersedes.push(b.id)
          deleteEntryFile(b.id)
          this.entries.delete(b.id)
          toMerge.add(b.id)
          merged++
        }
      }
    }

    return { removed, merged }
  }

  // Stats
  getStats(): KnowledgeStats {
    const entries = Array.from(this.entries.values())
    const now = Date.now()
    const thirtyDays = 30 * 24 * 60 * 60 * 1000

    const byType = {} as Record<KnowledgeType, number>
    const tagCounts = new Map<string, number>()

    for (const e of entries) {
      byType[e.type] = (byType[e.type] ?? 0) + 1
      for (const tag of e.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
      }
    }

    const avgRelevance = entries.length > 0
      ? entries.reduce((sum, e) => sum + e.relevance, 0) / entries.length
      : 0

    const staleCount = entries.filter(e => e.accessCount > 0 && (now - e.lastAccessedAt) > thirtyDays).length

    const topTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }))

    return {
      total: entries.length,
      byType,
      avgRelevance,
      verifiedCount: entries.filter(e => e.verified).length,
      staleCount,
      topTags,
    }
  }

  // Export all knowledge as JSON
  exportAll(): KnowledgeEntry[] {
    return Array.from(this.entries.values())
  }

  // Import entries
  importEntries(entries: KnowledgeEntry[]): number {
    let imported = 0
    for (const entry of entries) {
      if (!this.entries.has(entry.id)) {
        this.entries.set(entry.id, entry)
        this.indexEntry(entry)
        saveEntry(entry)
        imported++
      }
    }
    return imported
  }
}

// Export singleton
export const knowledgeBase = new KnowledgeBase()

// DI registration
export const KNOWLEDGE_BASE_TOKEN = createToken<KnowledgeBase>('KnowledgeBase')
container.registerValue(KNOWLEDGE_BASE_TOKEN, knowledgeBase)
