#!/usr/bin/env bun
/**
 * Start Claude Code CLI with pet companion feature enabled
 *
 * Sets ENABLE_FULLSCREEN=1 to show the pet sprite in the terminal.
 */

// Enable fullscreen mode for pet sprite display
process.env.ENABLE_FULLSCREEN = '1'

console.log('🐾 Starting Claude Code with Pet Mode enabled...\n')
console.log('✨ Buddy commands are now always available!')
console.log('')
console.log('Available commands:')
console.log('  /buddy hatch   - Get a new companion pet')
console.log('  /buddy pet     - Pet your companion')
console.log('  /buddy status  - View companion details')
console.log('')

// Import and run the CLI
await import('./src/entrypoints/cli.tsx')
