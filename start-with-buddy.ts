#!/usr/bin/env bun
/**
 * Start Claude Code CLI with BUDDY (pet) feature enabled
 *
 * Note: The BUDDY feature is now always enabled in this restored build.
 * This script is provided for convenience and backwards compatibility.
 */

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
