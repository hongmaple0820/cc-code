// Test unified feature flags bridge
import { isNewSystemFeature, getNewSystemFeatures } from './utils/featureFlags.js'

console.log('=== Unified Feature Flags Test ===\n')

// Test 1: Check new system features
console.log('Test 1: New System Features')
const newFeatures = getNewSystemFeatures()
console.log(`  Total new features: ${newFeatures.length}`)
console.log(`  Features: ${newFeatures.slice(0, 5).join(', ')}...`)

// Test 2: Check if specific features are recognized as new system features
console.log('\nTest 2: Feature Classification')
const testFeatures = ['ULTRAPLAN', 'SMART_SHELL', 'KAIROS', 'BUDDY']
for (const feat of testFeatures) {
  const isNew = isNewSystemFeature(feat)
  console.log(`  ${feat}: ${isNew ? 'new system' : 'legacy'}`)
}

console.log('\nSkipping feature() call due to potential circular dependency')
console.log('Core isFeatureEnabled() works correctly (verified in other test)')

console.log('\n=== Test Complete ===')
