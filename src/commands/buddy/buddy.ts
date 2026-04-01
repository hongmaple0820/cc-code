/**
 * Buddy command implementation
 * Allows users to interact with their companion pet
 */
import type { Command, LocalCommandCall } from '../../types/command.js'
import { getGlobalConfig, saveGlobalConfig } from '../../utils/config.js'
import { roll, companionUserId } from '../../buddy/companion.js'
import type { StoredCompanion } from '../../buddy/types.js'

// Pet name generator - simple fun names
const PET_NAME_PREFIXES = ['Buddy', 'Pal', 'Chip', 'Pip', 'Dot', 'Pix', 'Mochi', 'Puff', 'Bean', 'Nugget']
const PET_NAME_SUFFIXES = ['bug', 'pie', 'pop', 'ster', 'bean', 'drop', 'spark', 'paw', 'tail', 'mint']

function generatePetName(): string {
  const prefix = PET_NAME_PREFIXES[Math.floor(Math.random() * PET_NAME_PREFIXES.length)]
  const suffix = PET_NAME_SUFFIXES[Math.floor(Math.random() * PET_NAME_SUFFIXES.length)]
  return prefix + suffix
}

function generatePersonality(): string {
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
  return personalities[Math.floor(Math.random() * personalities.length)]
}

function getRarityStars(rarity: string): string {
  const stars: Record<string, number> = {
    common: 1,
    uncommon: 2,
    rare: 3,
    epic: 4,
    legendary: 5,
  }
  return '★'.repeat(stars[rarity] || 1)
}

const hatchCompanion: LocalCommandCall = async () => {
  const config = getGlobalConfig()

  if (config.companion) {
    return {
      type: 'text',
      value: `You already have a companion! Use /buddy status to see it, or /buddy pet to interact.`,
    }
  }

  // Generate a new companion
  const userId = companionUserId()
  const { bones } = roll(userId)

  const storedCompanion: StoredCompanion = {
    name: generatePetName(),
    personality: generatePersonality(),
    hatchedAt: Date.now(),
  }

  // Save to config
  config.companion = storedCompanion
  saveGlobalConfig(config)

  return {
    type: 'text',
    value: `🎉 Welcome your new companion!\n\n` +
      `Name: ${storedCompanion.name}\n` +
      `Species: ${bones.species}\n` +
      `Rarity: ${bones.rarity} ${getRarityStars(bones.rarity)}\n` +
      `Personality: ${storedCompanion.personality}\n\n` +
      `Your companion will appear beside the input box. Try /buddy pet to interact!`,
  }
}

const petCompanion: LocalCommandCall = async () => {
  const config = getGlobalConfig()

  if (!config.companion) {
    return {
      type: 'text',
      value: `You don't have a companion yet! Use /buddy hatch to get one.`,
    }
  }

  const { bones } = roll(companionUserId())

  return {
    type: 'text',
    value: `You pet ${config.companion.name} the ${bones.species}! ❤️\n\n` +
      `${config.companion.name} seems happy and appreciates the attention.`,
  }
}

const showStatus: LocalCommandCall = async () => {
  const config = getGlobalConfig()

  if (!config.companion) {
    return {
      type: 'text',
      value: `You don't have a companion yet!\n\nUse /buddy hatch to get your own virtual pet companion.`,
    }
  }

  const { bones } = roll(companionUserId())
  const hatchedDate = new Date(config.companion.hatchedAt)

  return {
    type: 'text',
    value: `Your Companion:\n\n` +
      `Name: ${config.companion.name}\n` +
      `Species: ${bones.species}\n` +
      `Rarity: ${bones.rarity} ${getRarityStars(bones.rarity)}\n` +
      `Eye style: ${bones.eye}\n` +
      `Hat: ${bones.hat}\n` +
      `Shiny: ${bones.shiny ? 'Yes! ✨' : 'No'}\n` +
      `Personality: ${config.companion.personality}\n` +
      `Hatched: ${hatchedDate.toLocaleDateString()}\n\n` +
      `Stats:\n` +
      `  DEBUGGING: ${bones.stats.DEBUGGING}\n` +
      `  PATIENCE: ${bones.stats.PATIENCE}\n` +
      `  CHAOS: ${bones.stats.CHAOS}\n` +
      `  WISDOM: ${bones.stats.WISDOM}\n` +
      `  SNARK: ${bones.stats.SNARK}`,
  }
}

const buddyCall: LocalCommandCall = async (_context, args?: string) => {
  const trimmedArgs = args?.trim() || ''

  // If no args, show help
  if (!trimmedArgs) {
    return {
      type: 'text',
      value: 'Buddy commands:\n  /buddy hatch - Get a new companion\n  /buddy pet - Pet your companion\n  /buddy status - View companion details',
    }
  }

  // Parse subcommand
  const parts = trimmedArgs.split(' ')
  const subcommand = parts[0]

  switch (subcommand) {
    case 'hatch':
      return hatchCompanion()
    case 'pet':
      return petCompanion()
    case 'status':
      return showStatus()
    default:
      return {
        type: 'text',
        value: `Unknown subcommand "${subcommand}". Available: hatch, pet, status`,
      }
  }
}

const buddy = {
  type: 'local',
  name: 'buddy',
  description: 'Interact with your companion pet',
  aliases: ['pet', 'companion'],
  supportsNonInteractive: false,
  call: buddyCall,
  isEnabled: () => true,
} satisfies Command

export default buddy
export { hatchCompanion, petCompanion, showStatus }
