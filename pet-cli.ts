#!/usr/bin/env bun
// Simplified CLI for pet interaction without API
import { rollWithSeed } from './src/buddy/companion.js'
import { renderSprite } from './src/buddy/sprites.js'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const PET_FILE = join(homedir(), '.claude-pet.json')

interface Pet {
  name: string
  species: string
  rarity: string
  bones: any
  happiness: number
  energy: number
  bond: number
  lastPet: number
  hatchedAt: number
}

const names = [
  'Whiskers', 'Bubbles', 'Pixel', 'Noodle', 'Sprout',
  'Ziggy', 'Mochi', 'Cosmo', 'Luna', 'Chip',
  'Tofu', 'Bean', 'Maple', 'Pepper', 'Sage',
  'Cookie', 'Waffle', 'Peanut', 'Pickles', 'Nugget'
]

function loadPet(): Pet | null {
  if (!existsSync(PET_FILE)) return null
  try {
    return JSON.parse(readFileSync(PET_FILE, 'utf-8'))
  } catch {
    return null
  }
}

function savePet(pet: Pet) {
  writeFileSync(PET_FILE, JSON.stringify(pet, null, 2))
}

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

function showHelp() {
  console.log('\n🐾 Pet CLI Commands:\n')
  console.log('  hatch    - Hatch a new companion')
  console.log('  status   - Check your companion status')
  console.log('  pet      - Pet your companion')
  console.log('  feed     - Feed your companion')
  console.log('  play     - Play with your companion')
  console.log('  rename   - Rename your companion')
  console.log('  release  - Release your companion')
  console.log('  help     - Show this help\n')
}

async function hatchPet() {
  const existing = loadPet()
  if (existing) {
    console.log(`\n❌ You already have ${existing.name} the ${existing.species}!`)
    console.log('   Use "release" first if you want a new companion.\n')
    return
  }

  console.log('\n✨ Hatching your companion...\n')
  
  const hatchFrames = ['🥚', '🥚💫', '🥚✨', '🐣', '🐥']
  for (const frame of hatchFrames) {
    process.stdout.write(`\r   ${frame}   `)
    await Bun.sleep(300)
  }
  
  console.log('\n')
  
  const seed = `user-${Date.now()}-${Math.random()}`
  const { bones } = rollWithSeed(seed)
  const name = names[Math.floor(Math.random() * names.length)]
  
  const pet: Pet = {
    name,
    species: bones.species,
    rarity: bones.rarity,
    bones,
    happiness: 50,
    energy: 100,
    bond: 0,
    lastPet: Date.now(),
    hatchedAt: Date.now()
  }
  
  savePet(pet)
  
  console.log('🎉 Congratulations! You hatched a companion!\n')
  console.log('='.repeat(60))
  
  const sprite = renderSprite(bones, 0)
  sprite.forEach(line => console.log('  ' + line))
  
  console.log('\n' + '='.repeat(60))
  console.log(`\n📋 ${name} the ${bones.species}`)
  console.log(`   Rarity: ${bones.rarity.toUpperCase()} ${getRarityEmoji(bones.rarity)}`)
  console.log(`\n💡 Use "status" to see full details!`)
  console.log('   Use "pet" to interact with your companion!\n')
}

function showStatus() {
  const pet = loadPet()
  if (!pet) {
    console.log('\n❌ You don\'t have a companion yet!')
    console.log('   Use "hatch" to get one!\n')
    return
  }
  
  console.log('\n' + '='.repeat(60))
  
  const sprite = renderSprite(pet.bones, 0)
  sprite.forEach(line => console.log('  ' + line))
  
  console.log('\n' + '='.repeat(60))
  console.log(`\n📋 ${pet.name} the ${pet.species}`)
  console.log(`   Rarity: ${pet.rarity.toUpperCase()} ${getRarityEmoji(pet.rarity)}`)
  console.log(`   Eye: ${pet.bones.eye} | Hat: ${pet.bones.hat || 'none'}`)
  
  const age = Math.floor((Date.now() - pet.hatchedAt) / 1000 / 60)
  console.log(`   Age: ${age} minutes`)
  
  console.log(`\n💖 Status:`)
  console.log(`   Happiness: ${pet.happiness}/100 ${'❤️'.repeat(Math.floor(pet.happiness / 20))}`)
  console.log(`   Energy: ${pet.energy}/100 ${'⚡'.repeat(Math.floor(pet.energy / 20))}`)
  console.log(`   Bond: ${pet.bond}/100 ${'✨'.repeat(Math.floor(pet.bond / 20))}`)
  
  console.log(`\n📊 Stats:`)
  for (const [stat, value] of Object.entries(pet.bones.stats)) {
    const bar = '█'.repeat(Math.floor(value / 10))
    const emoji = getStatEmoji(stat)
    console.log(`   ${emoji} ${stat.padEnd(10)}: ${value.toString().padStart(3)} ${bar}`)
  }
  
  console.log('\n' + '='.repeat(60) + '\n')
}

function petCompanion() {
  const pet = loadPet()
  if (!pet) {
    console.log('\n❌ You don\'t have a companion yet!\n')
    return
  }
  
  const timeSinceLastPet = Date.now() - pet.lastPet
  const cooldown = 10000 // 10 seconds
  
  if (timeSinceLastPet < cooldown) {
    const remaining = Math.ceil((cooldown - timeSinceLastPet) / 1000)
    console.log(`\n⏳ ${pet.name} needs a break! Wait ${remaining} more seconds.\n`)
    return
  }
  
  pet.happiness = Math.min(100, pet.happiness + 10)
  pet.bond = Math.min(100, pet.bond + 5)
  pet.lastPet = Date.now()
  savePet(pet)
  
  const reactions = [
    `${pet.name} purrs happily! 😊`,
    `${pet.name} nuzzles your hand! 🥰`,
    `${pet.name} seems very content! ✨`,
    `${pet.name} wags excitedly! 🎉`,
    `${pet.name} makes a happy sound! 🎵`
  ]
  
  console.log(`\n💖 ${reactions[Math.floor(Math.random() * reactions.length)]}`)
  console.log(`   Happiness: ${pet.happiness}/100 | Bond: ${pet.bond}/100\n`)
}

function feedCompanion() {
  const pet = loadPet()
  if (!pet) {
    console.log('\n❌ You don\'t have a companion yet!\n')
    return
  }
  
  if (pet.energy >= 100) {
    console.log(`\n🍽️ ${pet.name} is already full!\n`)
    return
  }
  
  pet.energy = Math.min(100, pet.energy + 30)
  pet.happiness = Math.min(100, pet.happiness + 5)
  savePet(pet)
  
  console.log(`\n🍽️ You fed ${pet.name}!`)
  console.log(`   Energy: ${pet.energy}/100 ⚡\n`)
}

function playWithCompanion() {
  const pet = loadPet()
  if (!pet) {
    console.log('\n❌ You don\'t have a companion yet!\n')
    return
  }
  
  if (pet.energy < 20) {
    console.log(`\n😴 ${pet.name} is too tired to play! Try feeding first.\n`)
    return
  }
  
  pet.energy = Math.max(0, pet.energy - 20)
  pet.happiness = Math.min(100, pet.happiness + 15)
  pet.bond = Math.min(100, pet.bond + 10)
  savePet(pet)
  
  console.log(`\n🎮 You played with ${pet.name}!`)
  console.log(`   Happiness: ${pet.happiness}/100 | Bond: ${pet.bond}/100`)
  console.log(`   Energy: ${pet.energy}/100 ⚡\n`)
}

async function renamePet() {
  const pet = loadPet()
  if (!pet) {
    console.log('\n❌ You don\'t have a companion yet!\n')
    return
  }
  
  console.log(`\nCurrent name: ${pet.name}`)
  process.stdout.write('Enter new name: ')
  
  const newName = await new Promise<string>((resolve) => {
    process.stdin.once('data', (data) => {
      resolve(data.toString().trim())
    })
  })
  
  if (newName && newName.length > 0) {
    pet.name = newName
    savePet(pet)
    console.log(`\n✅ Renamed to ${newName}!\n`)
  } else {
    console.log('\n❌ Invalid name!\n')
  }
}

function releasePet() {
  const pet = loadPet()
  if (!pet) {
    console.log('\n❌ You don\'t have a companion yet!\n')
    return
  }
  
  console.log(`\n💔 You released ${pet.name} the ${pet.species}...`)
  console.log('   They will find a new home. Goodbye! 👋\n')
  
  if (existsSync(PET_FILE)) {
    require('fs').unlinkSync(PET_FILE)
  }
}

// Main CLI
const command = process.argv[2]

console.clear()

switch (command) {
  case 'hatch':
    await hatchPet()
    break
  case 'status':
    showStatus()
    break
  case 'pet':
    petCompanion()
    break
  case 'feed':
    feedCompanion()
    break
  case 'play':
    playWithCompanion()
    break
  case 'rename':
    await renamePet()
    break
  case 'release':
    releasePet()
    break
  case 'help':
  default:
    showHelp()
}

process.exit(0)
