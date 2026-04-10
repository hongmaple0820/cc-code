// Test entry point for new modules
// Verifies that core and modules compile without errors

import { container, createToken, eventBus, EventTypes } from './core/index.js'
import { smartShell, kairosEngine, buddyAI } from './modules/index.js'

console.log('=== Claude Code Enhancement Module Test ===\n')

// Test 1: Core DI Container
console.log('Test 1: DI Container')
try {
  const testToken = createToken<string>('test')
  container.registerValue(testToken, 'hello')
  const value = container.resolve(testToken)
  console.log('  ✅ DI Container works:', value)
} catch (e) {
  console.log('  ❌ DI Container failed:', e)
}

// Test 2: Event Bus
console.log('\nTest 2: Event Bus')
try {
  let received = false
  eventBus.on('test:event', (data) => {
    received = true
    console.log('  ✅ Event received:', data)
  })
  eventBus.emit('test:event', { message: 'test' })
  if (!received) {
    console.log('  ❌ Event not received')
  }
} catch (e) {
  console.log('  ❌ Event Bus failed:', e)
}

// Test 3: Smart Shell
console.log('\nTest 3: Smart Shell')
try {
  const risk = smartShell.analyzeRisk('rm -rf /')
  console.log('  ✅ Risk analysis works:', risk.level)
  console.log('    - Level:', risk.level)
  console.log('    - Score:', risk.score)
  console.log('    - Requires confirmation:', risk.requiresConfirmation)
} catch (e) {
  console.log('  ❌ Smart Shell failed:', e)
}

// Test 4: Kairos Engine
console.log('\nTest 4: Kairos Engine')
try {
  const isActive = kairosEngine.isActive()
  console.log('  ✅ Kairos Engine loaded, active:', isActive)
} catch (e) {
  console.log('  ❌ Kairos Engine failed:', e)
}

// Test 5: Buddy AI
console.log('\nTest 5: Buddy AI')
try {
  const metrics = buddyAI.getProductivityMetrics()
  console.log('  ✅ Buddy AI loaded')
  console.log('    - Files modified:', metrics.filesModified)
} catch (e) {
  console.log('  ❌ Buddy AI failed:', e)
}

console.log('\n=== Test Complete ===')
