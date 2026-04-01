#!/usr/bin/env bun
// Pet gacha - hatch multiple pets and pick your favorite!
import { rollWithSeed } from './src/buddy/companion.js'
import { renderSprite } from './src/buddy/sprites.js'

const names = [
  'Whiskers', 'Bubbles', 'Pixel', 'Noodle', 'Sprout',
  'Ziggy', 'Mochi', 'Cosmo', 'Luna', 'Chip',
  'Tofu', 'Bean', 'Maple', 'Pepper', 'Sage',
  'Cookie', 'Waffle', 'Peanut', 'Pickles', 'Nugget'
]

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
console.log('🎰 Claude Code Pet Gacha!\n')
console.log('='.repeat(70))
console.log('\n✨ Hatching 5 companions for you to choose from...\n')

const companions = []

for (let i = 0; i < 5; i++) {
  const seed = `gacha-${Date.now()}-${Math.random()}-${i}`
  const { bones } = rollWithSeed(seed)
  const name = names[Math.floor(Math.random() * names.length)]
  companions.push({ bones, name })
  
  // Animation
  process.stdout.write(`\r   🥚 Hatching ${i + 1}/5...`)
  await Bun.sleep(400)
}

console.log('\r   ✅ All hatched!        \n')
console.log('='.repeat(70))

// Display all companions
for (let i = 0; i < companions.length; i++) {
  const { bones, name } = companions[i]
  
  console.log(`\n【 Option ${i + 1} 】`)
  console.log(`Name: ${name} | Species: ${bones.species} | Rarity: ${bones.rarity.toUpperCase()} ${getRarityEmoji(bones.rarity)}`)
  
  const sprite = renderSprite(bones, 0)
  sprite.forEach(line => console.log('  ' + line))
  
  // Show top 2 stats
  const sortedStats = Object.entries(bones.stats).sort((a, b) => b[1] - a[1])
  console.log(`  Top Stats: ${sortedStats[0][0]}(${sortedStats[0][1]}) • ${sortedStats[1][0]}(${sortedStats[1][1]})`)
}

console.log('\n' + '='.repeat(70))

// Find the rarest one
const rarest = companions.reduce((prev, curr) => {
  const rarityOrder = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 }
  return rarityOrder[curr.bones.rarity] > rarityOrder[prev.bones.rarity] ? curr : prev
})

console.log(`\n🌟 Rarest pull: ${rarest.name} the ${rarest.bones.species} (${rarest.bones.rarity.toUpperCase()})`)

// Count by rarity
const rarityCounts = companions.reduce((acc, c) => {
  acc[c.bones.rarity] = (acc[c.bones.rarity] || 0) + 1
  return acc
}, {} as Record<string, number>)

console.log(`\n📊 Your pull results:`)
for (const [rarity, count] of Object.entries(rarityCounts)) {
  console.log(`   ${getRarityEmoji(rarity)} ${rarity}: ${count}`)
}

console.log('\n💡 In the real CLI, you can use /buddy hatch to get your companion!')
console.log('   Run this script again to see different companions!\n')
