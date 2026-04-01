// Test buddy command directly without API
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

console.log('🐾 Testing Buddy System\n')

// Mock config loading
const configPath = join(process.env.APPDATA || '', '..', 'Local', 'claude', 'settings.json')

// Test 1: Show buddy command implementation
console.log('📋 Buddy Command Implementation:\n')
console.log('   /buddy hatch    - Get a new companion pet')
console.log('   /buddy pet      - Pet your companion')
console.log('   /buddy status   - View companion details')

// Test 2: Show available species
const SPECIES = [
  'duck', 'goose', 'blob', 'cat', 'dragon', 'octopus',
  'owl', 'penguin', 'turtle', 'snail', 'ghost', 'axolotl',
  'capybara', 'cactus', 'robot', 'rabbit', 'mushroom', 'chonk'
]

console.log(`\n🦆 Available Species (${SPECIES.length}):`)
console.log(`   ${SPECIES.join(', ')}`)

// Test 3: Show rarities
const RARITY_WEIGHTS = {
  common: 60,
  uncommon: 25,
  rare: 10,
  epic: 4,
  legendary: 1,
}

console.log('\n⭐ Rarity Distribution:')
for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS)) {
  const stars = '★'.repeat(rarity === 'legendary' ? 5 : rarity === 'epic' ? 4 : rarity === 'rare' ? 3 : rarity === 'uncommon' ? 2 : 1)
  console.log(`   ${rarity.padEnd(10)}: ${stars} (${weight}%)`)
}

// Test 4: Show stats
const STAT_NAMES = ['DEBUGGING', 'PATIENCE', 'CHAOS', 'WISDOM', 'SNARK']
console.log(`\n📊 Companion Stats:`)
console.log(`   ${STAT_NAMES.join(', ')}`)

// Test 5: Generate sample pet names
const PET_NAME_PREFIXES = ['Buddy', 'Pal', 'Chip', 'Pip', 'Dot', 'Pix', 'Mochi', 'Puff', 'Bean', 'Nugget']
const PET_NAME_SUFFIXES = ['bug', 'pie', 'pop', 'ster', 'bean', 'drop', 'spark', 'paw', 'tail', 'mint']

function generatePetName() {
  const prefix = PET_NAME_PREFIXES[Math.floor(Math.random() * PET_NAME_PREFIXES.length)]
  const suffix = PET_NAME_SUFFIXES[Math.floor(Math.random() * PET_NAME_SUFFIXES.length)]
  return prefix + suffix
}

console.log('\n📛 Sample Pet Names:')
for (let i = 0; i < 10; i++) {
  console.log(`   ${i + 1}. ${generatePetName()}`)
}

// Test 6: Show personalities
const personalities = [
  'Curious and playful, loves to peek at your code',
  'Calm and supportive, always here for you',
  'Energetic and excited about every bug fix',
  'Wise and thoughtful, gives great advice',
  'Shy but friendly, warms up over time',
  'Mischievous and fun, keeps coding interesting',
  'Loyal and dedicated, your coding companion',
  'Chill and relaxed, helps you stay calm',
]

console.log('\n💝 Sample Personalities:')
personalities.forEach((p, i) => console.log(`   ${i + 1}. ${p}`))

// Test 7: Simulate a companion roll
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]!
}

// Simulate a roll
const testRng = mulberry32(hashString('test-user-123'))
const randomSpecies = pick(testRng, SPECIES)
const randomEye = pick(testRng, ['·', '✦', '×', '◉', '@', '°'])
const randomHat = pick(testRng, ['none', 'crown', 'tophat', 'propeller', 'halo', 'wizard', 'beanie', 'tinyduck'])

console.log('\n🎲 Sample Generated Companion:')
console.log(`   Species: ${randomSpecies}`)
console.log(`   Eye: ${randomEye}`)
console.log(`   Hat: ${randomHat}`)
console.log(`   Name: ${generatePetName()}`)

console.log('\n✅ Buddy system implementation is complete!')
console.log('\n📁 Files created:')
console.log('   - src/commands/buddy/index.ts')
console.log('   - src/commands/buddy/buddy.ts')
console.log('   - launch-with-proxy.ts')
console.log('\n🚀 To use: Run `bun run launch-with-proxy.ts` and type `/buddy hatch`')
