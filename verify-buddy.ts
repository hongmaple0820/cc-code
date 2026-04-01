// Verify buddy command can be loaded
import { existsSync } from 'fs'

console.log('🔍 Verifying Buddy Command Installation\n')

const files = [
  'src/commands/buddy/index.ts',
  'src/commands/buddy/buddy.ts',
  'src/buddy/companion.ts',
  'src/buddy/types.ts',
  'src/buddy/CompanionSprite.tsx',
  'launch-with-proxy.ts',
]

console.log('📁 File Check:\n')
for (const file of files) {
  const exists = existsSync(file)
  console.log(`   ${exists ? '✅' : '❌'} ${file}`)
}

// Check commands.ts registration
console.log('\n📋 Command Registration:\n')
const commandsContent = await Bun.file('src/commands.ts').text()
const hasBuddyImport = commandsContent.includes("require('./commands/buddy/index.js')")
const hasBuddyFeature = commandsContent.includes("feature('BUDDY')")
console.log(`   ${hasBuddyImport ? '✅' : '❌'} Buddy import registered`)
console.log(`   ${hasBuddyFeature ? '✅' : '❌'} BUDDY feature flag check`)

// Show feature flag config
console.log('\n🚩 Feature Flag Configuration:\n')
console.log(`   CLAUDE_INTERNAL_FC_OVERRIDES: ${process.env.CLAUDE_INTERNAL_FC_OVERRIDES || '(not set)'}`)
console.log(`   BUDDY enabled: ${process.env.CLAUDE_INTERNAL_FC_OVERRIDES?.includes('BUDDY') ? 'Yes ✅' : 'No ❌'}`)

console.log('\n✨ All checks complete!')
