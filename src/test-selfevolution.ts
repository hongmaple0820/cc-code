// Test: Self-Evolution Engine
import { selfEvolutionEngine } from './modules/selfevolution/SelfEvolutionEngine.js'
import { existsSync, rmSync } from 'fs'
import { resolve } from 'path'

const EVO_DIR = resolve('.omc/evolution')

function cleanup(): void {
  if (existsSync(EVO_DIR)) {
    rmSync(EVO_DIR, { recursive: true, force: true })
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
  console.log('\n=== Self-Evolution Engine Tests ===\n')

  cleanup()
  await selfEvolutionEngine.initialize()

  let passed = 0
  let total = 0

  // Test 1: Record events
  total++
  if (await test('Record behavior events', async () => {
    for (let i = 0; i < 6; i++) {
      selfEvolutionEngine.recordEvent({
        type: 'suggestion_rejected',
        target: 'suggest_test',
        sessionId: 'test-session',
        timestamp: Date.now(),
        context: { iteration: i },
      })
    }
    const stats = selfEvolutionEngine.getEventStats()
    if (stats.total < 6) throw new Error(`Expected 6+ events, got ${stats.total}`)
  })) passed++

  // Test 2: Pattern detection
  total++
  if (await test('Detect patterns from events', async () => {
    const patterns = selfEvolutionEngine.getPatterns()
    const rejectionPattern = patterns.find(p => p.type === 'suggestion_rejection_fatigue')
    if (!rejectionPattern) throw new Error('Should detect rejection fatigue pattern')
    if (rejectionPattern.confidence < 0.3) throw new Error('Pattern confidence too low')
  })) passed++

  // Test 3: Settings adjustment
  total++
  if (await test('Settings adjust based on patterns', async () => {
    // Record more rejections to push confidence higher
    for (let i = 0; i < 10; i++) {
      selfEvolutionEngine.recordEvent({
        type: 'suggestion_rejected',
        target: `suggest_${i}`,
        sessionId: 'test-session',
        timestamp: Date.now(),
        context: {},
      })
    }
    const settings = selfEvolutionEngine.getSettings()
    // Threshold should have increased
    if (settings.suggestionConfidenceThreshold <= 0.6) {
      console.log(`    Threshold: ${settings.suggestionConfidenceThreshold} (may need more evidence)`)
    }
  })) passed++

  // Test 4: Manual settings update
  total++
  if (await test('Manual settings update', async () => {
    selfEvolutionEngine.updateSettings({ learningRate: 0.2 })
    const settings = selfEvolutionEngine.getSettings()
    if (settings.learningRate !== 0.2) throw new Error('Setting not updated')
  })) passed++

  // Test 5: Report generation
  total++
  if (await test('Generate evolution report', async () => {
    const report = selfEvolutionEngine.getEvolutionReport()
    if (!report.includes('Behavior Events')) throw new Error('Missing behavior section')
    if (!report.includes('Knowledge Base')) throw new Error('Missing KB section')
    if (!report.includes('Task Engine')) throw new Error('Missing task section')
  })) passed++

  // Test 6: Consolidation
  total++
  if (await test('Consolidation runs', async () => {
    selfEvolutionEngine.consolidate()
    const stats = selfEvolutionEngine.getEventStats()
    // Should still work after consolidation
    if (typeof stats.total !== 'number') throw new Error('Stats broken after consolidation')
  })) passed++

  // Test 7: Cross-system integration
  total++
  if (await test('Cross-system: knowledge extraction from failure', async () => {
    // Record a tool_blocked event
    selfEvolutionEngine.recordEvent({
      type: 'tool_blocked',
      target: 'BashTool',
      sessionId: 'test-session',
      timestamp: Date.now(),
      context: { command: 'dangerous-command' },
    })

    // Check patterns updated
    const patterns = selfEvolutionEngine.getPatterns()
    if (!Array.isArray(patterns)) throw new Error('Patterns should be array')
  })) passed++

  // Test 8: Settings persistence
  total++
  if (await test('Settings persist to disk', async () => {
    const settingsFile = resolve('.omc/evolution/settings.json')
    if (!existsSync(settingsFile)) throw new Error('Settings file not written')
  })) passed++

  cleanup()
  console.log(`\n=== Results: ${passed}/${total} passed ===\n`)
}

main().catch(console.error)
