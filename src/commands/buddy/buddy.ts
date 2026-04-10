/**
 * Buddy command implementation
 * Allows users to interact with their companion pet and AI features
 */
import type { Command, LocalCommandCall } from '../../types/command.js'
import { getGlobalConfig, saveGlobalConfig } from '../../utils/config.js'
import { roll, companionUserId } from '../../buddy/companion.js'
import type { StoredCompanion } from '../../buddy/types.js'
import { activateBuddy, deactivateBuddy, isBuddyActive, getBuddyStatus, recordBuddyBreak } from '../../integrations/buddy/BuddyIntegration.js'
import { isFeatureEnabled } from '../../core/featureFlags.js'

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
  saveGlobalConfig(current => ({
    ...current,
    companion: storedCompanion,
  }))

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

// AI Enhanced features
const aiEnhancedCall: LocalCommandCall = async (args, _context) => {
  const trimmedArgs = args?.trim() || ''
  const parts = trimmedArgs.split(' ')
  const subcommand = parts[0]?.toLowerCase()

  // Check if AI feature is enabled
  if (!isFeatureEnabled('BUDDY')) {
    return {
      type: 'text',
      value: '❌ Buddy AI feature is disabled. Set CLAUDE_CODE_ENABLE_BUDDY=1 to enable.',
    }
  }

  switch (subcommand) {
    case 'on':
    case 'enable': {
      if (isBuddyActive()) {
        return { type: 'text', value: 'Buddy AI is already active.' }
      }
      activateBuddy()
      return {
        type: 'text',
        value: '✅ Buddy AI enhanced mode activated! I\'ll celebrate your wins and track your progress.',
      }
    }

    case 'off':
    case 'disable': {
      if (!isBuddyActive()) {
        return { type: 'text', value: 'Buddy AI is already inactive.' }
      }
      deactivateBuddy()
      return { type: 'text', value: '✅ Buddy AI enhanced mode deactivated.' }
    }

    case 'stats': {
      const status = getBuddyStatus()
      return {
        type: 'text',
        value: `📊 Productivity Stats:\n` +
          `Current emotion: ${status.emotion}\n` +
          `Files modified: ${status.metrics.filesModified}\n` +
          `Tests run: ${status.metrics.testsRun}\n` +
          `Session duration: ${Math.round(status.metrics.sessionDuration / 60000)} min`,
      }
    }

    case 'break': {
      recordBuddyBreak()
      return { type: 'text', value: '☕ Break recorded. Take a moment to stretch!' }
    }

    default: {
      // Toggle
      const isActive = isBuddyActive()
      if (isActive) {
        deactivateBuddy()
        return { type: 'text', value: '✅ Buddy AI enhanced mode deactivated.' }
      } else {
        activateBuddy()
        return {
          type: 'text',
          value: '✅ Buddy AI enhanced mode activated! I\'ll celebrate your wins and track your progress.',
        }
      }
    }
  }
}

const buddyCall: LocalCommandCall = async (args, _context) => {
  const trimmedArgs = args?.trim() || ''

  // If no args, show help
  if (!trimmedArgs) {
    return {
      type: 'text',
      value: 'Buddy commands:\n' +
        '  /buddy hatch - Get a new companion\n' +
        '  /buddy pet - Pet your companion\n' +
        '  /buddy status - View companion details\n' +
        '  /buddy ai - Toggle AI enhanced mode\n' +
        '  /buddy ai stats - View productivity stats\n' +
        '  /buddy ai break - Record a break',
    }
  }

  // Parse subcommand
  const parts = trimmedArgs.split(' ')
  const subcommand = parts[0]

  // Handle AI enhanced commands
  if (subcommand === 'ai') {
    return aiEnhancedCall(parts.slice(1).join(' '), _context)
  }

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
        value: `Unknown subcommand "${subcommand}". Available: hatch, pet, status, ai`,
      }
  }
}

const buddy = {
  type: 'local',
  name: 'buddy',
  description: 'Interact with your companion pet and AI features',
  aliases: ['pet', 'companion'],
  supportsNonInteractive: false,
  call: buddyCall,
  isEnabled: () => true,
} satisfies Command

export default buddy
export { hatchCompanion, petCompanion, showStatus, buddyCall }
