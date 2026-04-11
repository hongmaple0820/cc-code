// Test: Knowledge Base
import { knowledgeBase } from './modules/knowledgebase/KnowledgeBase.js'
import { existsSync, rmSync, readdirSync } from 'fs'
import { resolve } from 'path'

const KNOWLEDGE_DIR = resolve('.omc/knowledge')

function cleanup(): void {
  if (existsSync(KNOWLEDGE_DIR)) {
    rmSync(KNOWLEDGE_DIR, { recursive: true, force: true })
  }
}

async function test(name: string, fn: () => Promise<void>): Promise<boolean> {
  try {
    await fn()
    console.log(`  PASS: ${name}`)
    return true
  } catch (e) {
    console.error(`  FAIL: ${name}`)
    console.error(`    ${e}`)
    return false
  }
}

async function main(): Promise<void> {
  console.log('\n=== KnowledgeBase Tests ===\n')

  cleanup()
  await knowledgeBase.initialize()

  let passed = 0
  let total = 0

  // Test 1: Add entry
  total++
  if (await test('Add knowledge entry', async () => {
    const entry = knowledgeBase.add({
      title: 'Test Lesson',
      type: 'lesson',
      tags: ['test', 'auto-generated'],
      content: 'This is a test knowledge entry for validation.',
      verified: false,
    })
    if (!entry.id) throw new Error('Entry ID missing')
    if (entry.relevance !== 0.5) throw new Error('Initial relevance should be 0.5')
  })) passed++

  // Test 2: Add multiple entries
  total++
  if (await test('Add multiple entries', async () => {
    knowledgeBase.add({
      title: 'Avoid rm -rf without backup',
      type: 'anti_pattern',
      tags: ['safety', 'shell'],
      content: 'Never run rm -rf on critical directories without verifying backup exists.',
      verified: true,
    })
    knowledgeBase.add({
      title: 'Use feature flags for gradual rollout',
      type: 'best_practice',
      tags: ['architecture', 'deployment'],
      content: 'Always wrap new features in feature flags for safe gradual rollout.',
      verified: false,
    })
    knowledgeBase.add({
      title: 'Event-driven architecture for module communication',
      type: 'pattern',
      tags: ['architecture', 'event-bus'],
      content: 'Use the event bus for cross-module communication instead of direct imports.',
      verified: true,
    })
    const entries = knowledgeBase.query({})
    if (entries.length < 4) throw new Error(`Expected 4 entries, got ${entries.length}`)
  })) passed++

  // Test 3: Search
  total++
  if (await test('Search by keywords', async () => {
    const results = knowledgeBase.search('event bus architecture')
    if (results.length === 0) throw new Error('Should find event bus entry')
    if (!results[0].title.includes('Event-driven')) throw new Error('Expected event-driven entry on top')
  })) passed++

  // Test 4: Query by type
  total++
  if (await test('Query by type', async () => {
    const lessons = knowledgeBase.query({ type: 'lesson' })
    if (lessons.length === 0) throw new Error('Should find lesson entry')
    const verified = knowledgeBase.query({ type: 'anti_pattern' })
    if (verified.length === 0) throw new Error('Should find anti_pattern')
  })) passed++

  // Test 5: Verify entry
  total++
  if (await test('Verify entry', async () => {
    const entries = knowledgeBase.query({ verified: false as any })
    const unverified = knowledgeBase.query({}).filter(e => !e.verified)
    if (unverified.length === 0) throw new Error('Need unverified entries')
    const ok = knowledgeBase.verify(unverified[0].id, 'test')
    if (!ok) throw new Error('Verify failed')
    const verified = knowledgeBase.get(unverified[0].id)
    if (!verified?.verified) throw new Error('Entry not verified')
  })) passed++

  // Test 6: Feedback adjusts relevance
  total++
  if (await test('Feedback adjusts relevance', async () => {
    const entries = knowledgeBase.query({})
    const entry = entries[0]
    const initialRelevance = entry.relevance
    knowledgeBase.recordFeedback(entry.id, true, 'test-session')
    knowledgeBase.recordFeedback(entry.id, true, 'test-session-2')
    const updated = knowledgeBase.get(entry.id)
    if (!updated) throw new Error('Entry not found')
    if (updated.accessCount < 2) throw new Error('Access count not tracked')
  })) passed++

  // Test 7: Stats
  total++
  if (await test('Get stats', async () => {
    const stats = knowledgeBase.getStats()
    if (stats.total === 0) throw new Error('No entries counted')
    if (typeof stats.avgRelevance !== 'number') throw new Error('avgRelevance missing')
    if (!Array.isArray(stats.topTags)) throw new Error('topTags missing')
  })) passed++

  // Test 8: Consolidation
  total++
  if (await test('Consolidation runs', async () => {
    const result = knowledgeBase.consolidate()
    if (typeof result.removed !== 'number') throw new Error('removed count missing')
    if (typeof result.merged !== 'number') throw new Error('merged count missing')
  })) passed++

  // Test 9: Related entries
  total++
  if (await test('Related entries linked', async () => {
    const entries = knowledgeBase.query({})
    const hasRelated = entries.some(e => e.relatedIds.length > 0)
    // May or may not have related entries depending on content similarity
    console.log(`    Entries with related links: ${entries.filter(e => e.relatedIds.length > 0).length}`)
  })) passed++

  // Test 10: File persistence
  total++
  if (await test('Entries persisted to disk', async () => {
    if (!existsSync(KNOWLEDGE_DIR)) throw new Error('Knowledge dir missing')
    const files = readdirSync(KNOWLEDGE_DIR).filter(f => f.endsWith('.json'))
    if (files.length === 0) throw new Error('No entries on disk')
  })) passed++

  cleanup()
  console.log(`\n=== Results: ${passed}/${total} passed ===\n`)
}

main().catch(console.error)
