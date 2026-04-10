// Test Kairos integration
import { initKairos, activateKairos, deactivateKairos, isKairosActive, getKairosStatus } from './integrations/kairos/KairosIntegration.js'

console.log('=== Kairos Integration Test ===\n')

// Test 1: Initial state
console.log('Test 1: Initial State')
const initialStatus = getKairosStatus()
console.log('  Initialized:', initialStatus.initialized)
console.log('  Active:', initialStatus.active)
console.log('  Paused:', initialStatus.paused)

// Test 2: Initialize (should work even without activation)
console.log('\nTest 2: Initialize')
try {
  initKairos()
  console.log('  ✅ initKairos() called')
} catch (e) {
  console.log('  ❌ initKairos() failed:', e)
}

// Test 3: Check status after init
console.log('\nTest 3: Status after init')
const afterInitStatus = getKairosStatus()
console.log('  Initialized:', afterInitStatus.initialized)
console.log('  Observations:', afterInitStatus.observations)
console.log('  Tasks:', afterInitStatus.tasks)

// Test 4: Activate
console.log('\nTest 4: Activate Kairos')
try {
  activateKairos()
  console.log('  ✅ activateKairos() called')
  console.log('  Active:', isKairosActive())
} catch (e) {
  console.log('  ❌ activateKairos() failed:', e)
}

// Test 5: Status after activation
console.log('\nTest 5: Status after activation')
const afterActivateStatus = getKairosStatus()
console.log('  Active:', afterActivateStatus.active)
console.log('  Initialized:', afterActivateStatus.initialized)

// Test 6: Deactivate
console.log('\nTest 6: Deactivate Kairos')
try {
  deactivateKairos()
  console.log('  ✅ deactivateKairos() called')
  console.log('  Active:', isKairosActive())
} catch (e) {
  console.log('  ❌ deactivateKairos() failed:', e)
}

console.log('\n=== Test Complete ===')
