import pkg from '../package.json'
import { existsSync, readdirSync, readFileSync } from 'fs'
import { dirname, extname, join, resolve } from 'path'

// TTY check: Interactive mode requires a TTY terminal
// On Windows, running through certain parent processes (VSCode terminal, etc.)
// causes process.stdin.isTTY to be false, which makes Ink hang instead of exiting
const ttyCheckArgs = process.argv.slice(2)
const isNonInteractiveFlag = ttyCheckArgs.includes('--version') ||
  ttyCheckArgs.includes('--help') ||
  ttyCheckArgs.includes('--print') ||
  ttyCheckArgs.includes('-p') ||
  ttyCheckArgs.includes('doctor') ||
  ttyCheckArgs.includes('update') ||
  ttyCheckArgs.includes('version')

// Skip TTY check in development - let the app try to run anyway
// The Ink renderer will handle non-TTY gracefully
console.log(`[dev-entry.ts] stdin.isTTY: ${process.stdin.isTTY}, stdout.isTTY: ${process.stdout.isTTY}`)
if (!process.stdin.isTTY && !process.stdout.isTTY && !isNonInteractiveFlag) {
  console.log('[dev-entry.ts] WARNING: No TTY detected, continuing anyway in dev mode')
}

// Set up git-bash path for Windows if not already set
if (process.platform === 'win32' && !process.env.CLAUDE_CODE_GIT_BASH_PATH) {
  const possiblePaths = [
    'D:\\Program Files\\Git\\usr\\bin\\bash.exe',
    'C:\\Program Files\\Git\\usr\\bin\\bash.exe',
    'C:\\msys64\\usr\\bin\\bash.exe',
  ]
  for (const path of possiblePaths) {
    if (existsSync(path)) {
      process.env.CLAUDE_CODE_GIT_BASH_PATH = path
      console.log(`[dev-entry.ts] Set CLAUDE_CODE_GIT_BASH_PATH=${path}`)
      break
    }
  }
}

// Enable all enhancement feature flags for restored build
if (!process.env.CLAUDE_INTERNAL_FC_OVERRIDES) {
  process.env.CLAUDE_INTERNAL_FC_OVERRIDES = JSON.stringify({
    'BUDDY': true,
    'KAIROS': true,
    'PROACTIVE': true,
    'COORDINATOR_MODE': true,
    'SMART_SHELL': true,
    'ULTRAPLAN': true,
    'BRIDGE_MODE': true,
    'WORKFLOW_SCRIPTS': true,
    'MCP_SKILLS': true,
    'HISTORY_SNIP': true,
    'EXPERIMENTAL_SKILL_SEARCH': true,
    'TORCH': true,
    'UDS_INBOX': true,
    'FORK_SUBAGENT': true,
    'CCR_REMOTE_SETUP': true,
    'KAIROS_GITHUB_WEBHOOKS': true,
    'AGENT_TRIGGERS': true,
    'MONITOR_TOOL': true,
  })
  console.log('[dev-entry.ts] Enabled all enhancement feature flags')
} else {
  // Merge with existing overrides
  const existing = JSON.parse(process.env.CLAUDE_INTERNAL_FC_OVERRIDES)
  const merged = {
    ...existing,
    'KAIROS': true,
    'PROACTIVE': true,
    'COORDINATOR_MODE': true,
    'SMART_SHELL': true,
    'ULTRAPLAN': true,
    'BRIDGE_MODE': true,
    'WORKFLOW_SCRIPTS': true,
    'MCP_SKILLS': true,
    'HISTORY_SNIP': true,
    'EXPERIMENTAL_SKILL_SEARCH': true,
    'TORCH': true,
    'UDS_INBOX': true,
    'FORK_SUBAGENT': true,
    'CCR_REMOTE_SETUP': true,
    'KAIROS_GITHUB_WEBHOOKS': true,
    'AGENT_TRIGGERS': true,
    'MONITOR_TOOL': true,
  }
  process.env.CLAUDE_INTERNAL_FC_OVERRIDES = JSON.stringify(merged)
  console.log('[dev-entry.ts] Merged enhancement feature flags with existing overrides')
}

// Force interactive mode for dev - bypass non-interactive detection
if (!process.env.FORCE_INTERACTIVE) {
  process.env.FORCE_INTERACTIVE = '1'
  console.log('[dev-entry.ts] Set FORCE_INTERACTIVE=1 to enable interactive mode')
}

// Enable fullscreen mode for pet sprite display
if (!process.env.ENABLE_FULLSCREEN) {
  process.env.ENABLE_FULLSCREEN = '1'
  console.log('[dev-entry.ts] Enabled fullscreen mode for pet sprite display')
}

// Fake TTY for Windows + Bun: Ink requires process.stdin.isTTY to be true
// and setRawMode to exist. On Windows+Bun these are missing.
if (process.platform === 'win32' && !process.stdin.isTTY) {
  ;(process.stdin as any).isTTY = true
  if (typeof (process.stdin as any).setRawMode !== 'function') {
    ;(process.stdin as any).setRawMode = (mode: boolean) => process.stdin
  }
  console.log('[dev-entry.ts] Faked stdin TTY support for Windows+Bun')
}

type MacroConfig = {
  VERSION: string
  BUILD_TIME: string
  PACKAGE_URL: string
  NATIVE_PACKAGE_URL: string
  VERSION_CHANGELOG: string
  ISSUES_EXPLAINER: string
  FEEDBACK_CHANNEL: string
}

const defaultMacro: MacroConfig = {
  VERSION: pkg.version,
  BUILD_TIME: '',
  PACKAGE_URL: pkg.name,
  NATIVE_PACKAGE_URL: pkg.name,
  VERSION_CHANGELOG: '',
  ISSUES_EXPLAINER:
    'file an issue at https://github.com/anthropics/claude-code/issues',
  FEEDBACK_CHANNEL: 'github',
}

if (!('MACRO' in globalThis)) {
  ;(globalThis as typeof globalThis & { MACRO: MacroConfig }).MACRO =
    defaultMacro
}

type MissingImport = {
  importer: string
  specifier: string
}

function scanFiles(dir: string, out: string[]): void {
  if (!existsSync(dir)) return
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      scanFiles(fullPath, out)
      continue
    }
    if (['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'].includes(extname(entry.name))) {
      out.push(fullPath)
    }
  }
}

function hasResolvableTarget(basePath: string): boolean {
  const withoutJs = basePath.replace(/\.js$/u, '')
  const candidates = [
    withoutJs,
    `${withoutJs}.ts`,
    `${withoutJs}.tsx`,
    `${withoutJs}.js`,
    `${withoutJs}.jsx`,
    `${withoutJs}.mjs`,
    `${withoutJs}.cjs`,
    join(withoutJs, 'index.ts'),
    join(withoutJs, 'index.tsx'),
    join(withoutJs, 'index.js'),
  ]
  return candidates.some(candidate => existsSync(candidate))
}

function collectMissingRelativeImports(): MissingImport[] {
  const files: string[] = []
  scanFiles(resolve('src'), files)
  scanFiles(resolve('vendor'), files)
  const missing: MissingImport[] = []
  const seen = new Set<string>()
  const pattern =
    /(?:import|export)\s+[\s\S]*?from\s+['"](\.\.?\/[^'"]+)['"]|require\(\s*['"](\.\.?\/[^'"]+)['"]\s*\)/g

  for (const file of files) {
    const text = readFileSync(file, 'utf8')
    for (const match of text.matchAll(pattern)) {
      const specifier = match[1] ?? match[2]
      if (!specifier) continue
      const target = resolve(dirname(file), specifier)
      if (hasResolvableTarget(target)) continue
      const key = `${file} -> ${specifier}`
      if (seen.has(key)) continue
      seen.add(key)
      missing.push({
        importer: file,
        specifier,
      })
    }
  }

  return missing.sort((a, b) =>
    `${a.importer}:${a.specifier}`.localeCompare(`${b.importer}:${b.specifier}`),
  )
}

const args = process.argv.slice(2)
const missingImports = collectMissingRelativeImports()

if (args.includes('--version')) {
  if (missingImports.length > 0) {
    console.log(`${pkg.version} (restored dev workspace)`)
    console.log(`missing_relative_imports=${missingImports.length}`)
    process.exit(0)
  }
  console.log(pkg.version)
  process.exit(0)
}

if (args.includes('--help')) {
  if (missingImports.length > 0) {
    console.log('Claude Code restored development workspace')
    console.log(`version: ${pkg.version}`)
    console.log(`missing relative imports: ${missingImports.length}`)
    process.exit(0)
  }
  console.log('Usage: claude [options] [prompt]')
  console.log('')
  console.log('Basic restored commands:')
  console.log('  --help       Show this help')
  console.log('  --version    Show version')
  console.log('')
  console.log('Interactive REPL startup is routed to src/main.tsx when run without these flags.')
  process.exit(0)
}

if (missingImports.length > 0) {
  console.log('Claude Code restored development workspace')
  console.log(`version: ${pkg.version}`)
  console.log(`missing relative imports: ${missingImports.length}`)
  console.log('')
  console.log('Top missing modules:')
  for (const item of missingImports.slice(0, 20)) {
    console.log(`- ${item.importer.replace(`${process.cwd()}/`, '')} -> ${item.specifier}`)
  }
  console.log('')
  console.log('The original app entry is still blocked by missing restored sources.')
  console.log('Use this workspace to continue restoration; once missing imports reach 0, this launcher will forward to src/main.tsx automatically.')
  process.exit(0)
}

// Route through the original CLI bootstrap so the exported `main()` is
// actually invoked. Importing `main.tsx` directly only evaluates the module.
console.log('[dev-entry.ts] Importing entrypoints/cli.tsx...')

try {
  const cli = await import('./entrypoints/cli.tsx')
  console.log('[dev-entry.ts] cli.tsx imported successfully')

  // Wait for the main process to complete (the Ink REPL keeps it alive)
  await new Promise((_resolve, _reject) => {
    // Never resolve - keep process alive so Ink REPL can run
    // The process will exit naturally when the user types /quit or Ctrl+C
  })
} catch (err) {
  console.error('[dev-entry.ts] Failed to import cli.tsx:', err)
  process.exit(1)
}
