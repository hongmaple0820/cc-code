// Simple feature flags test
import { isFeatureEnabled } from './core/featureFlags.js'

console.log('Test: Feature Flags from Core')

const result = isFeatureEnabled('ULTRAPLAN')
console.log('ULTRAPLAN:', result)

console.log('Done')
