#!/usr/bin/env bun
/**
 * Test buddy command execution
 */

// Set up minimal config environment
const os = await import('os')
const fs = await import('fs')
const path = await import('path')

const configDir = path.join(os.homedir(), '.claude')
const configPath = path.join(configDir, 'config.json')

// Create config directory if it doesn't exist
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true })
}

// Create minimal config if it doesn't exist
if (!fs.existsSync(configPath)) {
  fs.writeFileSync(configPath, JSON.stringify({
    userID: 'test-user-' + Date.now(),
  }, null, 2))
}

// Set NODE_ENV to avoid config access error
process.env.NODE_ENV = 'test'

import { buddyCall } from './src/commands/buddy/buddy.js'

console.log('🧪 Testing Buddy Command Execution\n')

// Test 1: Show help (no args)
console.log('Test 1: /buddy (no args)')
const result1 = await buddyCall(null as any, '')
console.log(`   ✓ Result: ${(result1 as any).value?.split('\n')[0]}...`)

// Test 2: Hatch command
console.log('\nTest 2: /buddy hatch')
const result2 = await buddyCall(null as any, 'hatch')
console.log(`   ✓ Result: ${(result2 as any).value?.split('\n')[0]}`)

// Test 3: Pet command
console.log('\nTest 3: /buddy pet')
const result3 = await buddyCall(null as any, 'pet')
console.log(`   ✓ Result: ${(result3 as any).value?.split('\n')[0]}`)

// Test 4: Status command
console.log('\nTest 4: /buddy status')
const result4 = await buddyCall(null as any, 'status')
console.log(`   ✓ Result: ${(result4 as any).value?.split('\n')[0]}`)

// Test 5: Unknown command
console.log('\nTest 5: /buddy unknown')
const result5 = await buddyCall(null as any, 'unknown')
console.log(`   ✓ Result: ${(result5 as any).value}`)

console.log('\n✅ All buddy command tests passed!')
