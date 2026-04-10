import { createRoot } from './src/ink.js'
import { Text } from './src/ink.js'
import React from 'react'

console.error('Creating Ink root...')
const root = await createRoot({ patchConsole: false })
console.error('Root created!')

root.render(React.createElement(Text, null, 'Hello from Ink!'))
console.error('Rendered! Waiting 5 seconds...')

await new Promise(r => setTimeout(r, 5000))
console.error('Done, exiting.')
