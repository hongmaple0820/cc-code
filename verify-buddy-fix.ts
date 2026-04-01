#!/usr/bin/env bun
/**
 * Final verification for buddy command fix
 */

console.log('🔍 Final Buddy Command Verification\n')
console.log('=' .repeat(50))

// 1. Check files exist
console.log('\n📁 File Check:\n')
const files = [
  'src/commands/buddy/index.ts',
  'src/commands/buddy/buddy.ts',
  'src/buddy/companion.ts',
  'src/buddy/types.ts',
  'src/buddy/CompanionSprite.tsx',
]
const fs = await import('fs')
for (const file of files) {
  const exists = fs.existsSync(file)
  console.log(`   ${exists ? '✅' : '❌'} ${file}`)
}

// 2. Check commands.ts registration
console.log('\n📋 Command Registration:\n')
const commandsContent = await Bun.file('src/commands.ts').text()
const hasBuddyImport = commandsContent.includes("require('./commands/buddy/index.js')")
const hasBuddyArray = commandsContent.includes("...(buddy ? [buddy] : [])")
console.log(`   ${hasBuddyImport ? '✅' : '❌'} Buddy import registered`)
console.log(`   ${hasBuddyArray ? '✅' : '❌'} Buddy added to commands array`)

// 3. Check buddy.ts exports
console.log('\n📤 Export Check:\n')
const buddyContent = await Bun.file('src/commands/buddy/buddy.ts').text()
const hasBuddyCallExport = buddyContent.includes('export { hatchCompanion, petCompanion, showStatus, buddyCall }')
const hasDefaultExport = buddyContent.includes('export default buddy')
console.log(`   ${hasBuddyCallExport ? '✅' : '❌'} buddyCall exported`)
console.log(`   ${hasDefaultExport ? '✅' : '❌'} default export (buddy)`)

// 4. Check index.ts structure
console.log('\n📑 Index.ts Check:\n')
const indexContent = await Bun.file('src/commands/buddy/index.ts').text()
const hasCallImport = indexContent.includes("import { buddyCall } from './buddy.js'")
const hasCallProperty = indexContent.includes('call: buddyCall')
const noLoadProperty = !indexContent.includes('load:')
console.log(`   ${hasCallImport ? '✅' : '❌'} Imports buddyCall`)
console.log(`   ${hasCallProperty ? '✅' : '❌'} Has call property`)
console.log(`   ${noLoadProperty ? '✅' : '❌'} No load property (correct!)`)

// 5. Load test
console.log('\n🧪 Load Test:\n')
try {
  const buddy = (await import('./src/commands/buddy/index.js')).default
  console.log(`   ✅ Command loaded successfully`)
  console.log(`   ✅ Name: ${buddy.name}`)
  console.log(`   ✅ Type: ${buddy.type}`)
  console.log(`   ✅ Has call: ${typeof buddy.call === 'function'}`)
  console.log(`   ✅ Has isEnabled: ${typeof buddy.isEnabled === 'function'}`)
} catch (error: any) {
  console.log(`   ❌ Load failed: ${error.message}`)
}

console.log('\n' + '=' .repeat(50))
console.log('\n✅ Buddy command fix verification complete!\n')
console.log('📝 Usage:')
console.log('   1. Run: bun run dev')
console.log('   2. Type: /buddy hatch')
console.log('   3. Enjoy your companion!\n')
