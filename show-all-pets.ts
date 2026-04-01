// Show all pet species with their sprites
import { rollWithSeed } from './src/buddy/companion.js'
import { renderSprite } from './src/buddy/sprites.js'

const species = [
  'duck', 'goose', 'blob', 'cat', 'dragon', 'octopus', 
  'owl', 'penguin', 'turtle', 'snail', 'ghost', 'axolotl',
  'capybara', 'cactus', 'robot', 'rabbit', 'mushroom', 'chonk'
]

console.log('🐾 Claude Code Pet Gallery\n')
console.log('='.repeat(60))

for (const sp of species) {
  // Generate a companion with this species
  let bones
  let attempts = 0
  do {
    const roll = rollWithSeed(`show-${sp}-${attempts}`)
    bones = roll.bones
    attempts++
  } while (bones.species !== sp && attempts < 1000)
  
  if (bones.species === sp) {
    console.log(`\n${sp.toUpperCase()} (${bones.rarity})`)
    const sprite = renderSprite(bones, 0)
    sprite.forEach(line => console.log('  ' + line))
    console.log(`  Stats: DEBUGGING=${bones.stats.DEBUGGING}, PATIENCE=${bones.stats.PATIENCE}, CHAOS=${bones.stats.CHAOS}`)
  }
}

console.log('\n' + '='.repeat(60))
console.log('✨ All 18 species shown!\n')
