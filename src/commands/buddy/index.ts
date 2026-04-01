/**
 * Buddy command - manage your companion pet
 */
import type { Command } from '../../commands.js'
import { buddyCall } from './buddy.js'

const buddy = {
  type: 'local',
  name: 'buddy',
  description: 'Interact with your companion pet',
  aliases: ['pet', 'companion'],
  supportsNonInteractive: false,
  load: () => Promise.resolve({ call: buddyCall }),
} satisfies Command

export default buddy
