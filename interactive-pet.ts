#!/usr/bin/env bun
// Interactive pet experience without needing API
import { rollWithSeed } from './src/buddy/companion.js'
import { renderSprite, renderFace } from './src/buddy/sprites.js'
import { companionIntroText } from './src/buddy/prompt.js'

// Generate a random seed based on current time
const userSeed = `user-${Date.now()}-${Math.random()}`

console.clear()
console.log('🐾 Claude Code Pet Hatcher\n')
console.log('='.repeat(60))
console.log('\n✨ Hatching your companion...\n')

// Simulate hatching animation
const hatchFrames = ['🥚', '🥚💫', '🥚✨', '🐣', '🐥']
for (const frame of hatchFrames) {
  process.stdout.write(`\r   ${frame}   `)
  await Bun.sleep(300)
}

console.log('\n')

// Roll the companion
const { bones, inspirationSeed } = rollWithSeed(userSeed)

// Generate a random name
const names = [
  'Whiskers', 'Bubbles', 'Pixel', 'Noodle', 'Sprout',
  'Ziggy', 'Mochi', 'Cosmo', 'Luna', 'Chip',
  'Tofu', 'Bean', 'Maple', 'Pepper', 'Sage'
]
const name = names[Math.floor(Math.random() * names.length)]

console.log('🎉 Congratulations! You hatched a companion!\n')
console.log('='.repeat(60))

// Show the sprite
const sprite = renderSprite(bones, 0)
sprite.forEach(line => console.log('  ' + line))

console.log('\n' + '='.repeat(60))
console.log(`\n📋 Companion Profile:`)
console.log(`   Name: ${name}`)
console.log(`   Species: ${bones.species}`)
console.log(`   Rarity: ${bones.rarity.toUpperCase()} ${getRarityEmoji(bones.rarity)}`)
console.log(`   Eye: ${bones.eye}`)
console.log(`   Hat: ${bones.hat || 'none'}`)
console.log(`   Shiny: ${bones.shiny ? 'Yes ✨' : 'No'}`)

console.log(`\n📊 Stats:`)
for (const [stat, value] of Object.entries(bones.stats)) {
  const bar = '█'.repeat(Math.floor(value / 10))
  const emoji = getStatEmoji(stat)
  console.log(`   ${emoji} ${stat.padEnd(10)}: ${value.toString().padStart(3)} ${bar}`)
}

console.log(`\n💭 Personality:`)
const personality = getPersonality(bones.stats)
console.log(`   ${personality}`)

console.log(`\n🎲 Inspiration Seed: ${inspirationSeed}`)

console.log('\n' + '='.repeat(60))
console.log('\n🎮 Actions you can do with your pet:')
console.log('   • Pet them (increases happiness)')
console.log('   • Feed them (restores energy)')
console.log('   • Play with them (increases bond)')
console.log('   • Ask for coding advice (uses their stats!)')

console.log('\n💡 In the full CLI, use these commands:')
console.log('   /buddy hatch   - Get a new companion')
console.log('   /buddy pet     - Pet your companion')
console.log('   /buddy status  - Check companion status')

console.log('\n✨ Your companion is ready to help you code!\n')

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

function getStatEmoji(stat: string): string {
  const emojis = {
    DEBUGGING: '🐛',
    PATIENCE: '⏳',
    CHAOS: '🌪️',
    WISDOM: '🦉',
    SNARK: '😏'
  }
  return emojis[stat] || '📊'
}

function getPersonality(stats: Record<string, number>): string {
  const high = Object.entries(stats).sort((a, b) => b[1] - a[1])[0][0]
  const personalities = {
    DEBUGGING: 'A meticulous problem-solver who loves finding bugs',
    PATIENCE: 'Calm and steady, never rushes through code',
    CHAOS: 'Unpredictable and creative, thinks outside the box',
    WISDOM: 'Thoughtful and experienced, offers sage advice',
    SNARK: 'Witty and sarcastic, keeps things entertaining'
  }
  return personalities[high] || 'A unique companion with balanced traits'
}
