#!/usr/bin/env bun
// Showcase rare pets by generating many until we find each rarity
import { rollWithSeed } from './src/buddy/companion.js'
import { renderSprite } from './src/buddy/sprites.ts'

function getRarityEmoji(rarity: string): string {
  const emojis = {
    common: '⚪',
    uncommon: '🟢',
    rare: '🔵',
    epic: '🟣',
    legendary: '🟡'
  }
  return emojis[rarity] || '⚪'
}

console.clear()
console.log('🌟 Rare Pet Showcase\n')
console.log('='.repeat(70))
console.log('\n🔍 Searching for rare companions...\n')

const found: Record<string, any> = {}
const targetRarities = ['uncommon', 'rare', 'epic', 'legendary']
let attempts = 0
const maxAttempts = 10000

while (Object.keys(found).length < targetRarities.length && attempts < maxAttempts) {
  const seed = `rare-search-${attempts}`
  const { bones } = rollWithSeed(seed)
  
  if (targetRarities.includes(bones.rarity) && !found[bones.rarity]) {
    found[bones.rarity] = { bones, attempts }
    process.stdout.write(`\r✨ Found ${Object.keys(found).length}/${targetRarities.length} rarities...`)
  }
  
  attempts++
}

console.log('\r✅ Search complete!                    \n')
console.log('='.repeat(70))

// Display in rarity order
const rarityOrder = ['uncommon', 'rare', 'epic', 'legendary']

for (const rarity of rarityOrder) {
  if (found[rarity]) {
    const { bones, attempts: foundAt } = found[rarity]
    
    console.log(`\n【 ${rarity.toUpperCase()} ${getRarityEmoji(rarity)} 】`)
    console.log(`Species: ${bones.species} | Found after ${foundAt} attempts`)
    console.log(`Eye: ${bones.eye} | Hat: ${bones.hat || 'none'} | Shiny: ${bones.shiny ? 'Yes ✨' : 'No'}`)
    
    const sprite = renderSprite(bones, 0)
    sprite.forEach(line => console.log('  ' + line))
    
    console.log(`Stats:`)
    for (const [stat, value] of Object.entries(bones.stats)) {
      const bar = '█'.repeat(Math.floor(value / 10))
      console.log(`  ${stat.padEnd(10)}: ${value.toString().padStart(3)} ${bar}`)
    }
  } else {
    console.log(`\n【 ${rarity.toUpperCase()} ${getRarityEmoji(rarity)} 】`)
    console.log(`Not found in ${maxAttempts} attempts (very rare!)`)
  }
}

console.log('\n' + '='.repeat(70))
console.log(`\n📊 Statistics:`)
console.log(`   Total attempts: ${attempts}`)
console.log(`   Rarities found: ${Object.keys(found).length}/${targetRarities.length}`)

if (found.legendary) {
  console.log(`\n🎉 LEGENDARY FOUND! You're incredibly lucky!`)
  console.log(`   Legendary rate: ~1% (1 in 100)`)
}

console.log('\n💡 These are the special companions you might encounter!')
console.log('   Keep hatching in the real CLI to find your perfect match!\n')
