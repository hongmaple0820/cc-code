#!/usr/bin/env bun
/**
 * Test that buddy command can be loaded from commands.ts
 */

console.log('🧪 Testing Buddy Command Loading\n')

try {
  // Simulate what commands.ts does
  const buddy = (
    require('./src/commands/buddy/index.js') as typeof import('./src/commands/buddy/index.js')
  ).default

  console.log('✅ Buddy command loaded successfully!\n')
  console.log('Command details:')
  console.log(`   Name: ${buddy.name}`)
  console.log(`   Type: ${buddy.type}`)
  console.log(`   Description: ${buddy.description}`)
  console.log(`   Aliases: ${buddy.aliases?.join(', ') || 'none'}`)
  console.log(`   Supports Non-Interactive: ${buddy.supportsNonInteractive}`)

  console.log('\n✨ Buddy command is ready to use!')
  console.log('\n📝 Usage:')
  console.log('   1. Run: bun run dev')
  console.log('   2. Type: /buddy hatch')
  console.log('   3. Enjoy your new companion!')
} catch (error) {
  console.error('❌ Failed to load buddy command:')
  console.error(error)
  process.exit(1)
}
