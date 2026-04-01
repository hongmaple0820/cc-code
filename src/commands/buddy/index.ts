/**
 * Buddy command - manage your companion pet
 */
import type { Command } from '../../commands.js'

const buddy = {
  type: 'local',
  name: 'buddy',
  description: 'Interact with your companion pet',
  aliases: ['pet', 'companion'],
  supportsNonInteractive: false,
  load: () => import('./buddy.js'),
} satisfies Command

export default buddy
