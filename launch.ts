// Simple launcher for development - sets up MACRO and routes to CLI
import pkg from './package.json' with { type: 'json' };
import { existsSync } from 'fs';
import { join } from 'path';

// Set up git-bash path for Windows if not already set
if (process.platform === 'win32' && !process.env.CLAUDE_CODE_GIT_BASH_PATH) {
  const possiblePaths = [
    'D:\\Program Files\\Git\\usr\\bin\\bash.exe',
    'C:\\Program Files\\Git\\usr\\bin\\bash.exe',
    'C:\\msys64\\usr\\bin\\bash.exe',
  ];
  for (const path of possiblePaths) {
    if (existsSync(path)) {
      process.env.CLAUDE_CODE_GIT_BASH_PATH = path;
      console.log(`[launch.ts] Set CLAUDE_CODE_GIT_BASH_PATH=${path}`);
      break;
    }
  }
}

// Enable BUDDY feature flag for pet mode
if (!process.env.CLAUDE_INTERNAL_FC_OVERRIDES) {
  process.env.CLAUDE_INTERNAL_FC_OVERRIDES = JSON.stringify({
    'BUDDY': true,
  });
  console.log('[launch.ts] Enabled BUDDY feature flag');
}

// Enable fullscreen mode for pet sprite display
if (!process.env.ENABLE_FULLSCREEN) {
  process.env.ENABLE_FULLSCREEN = '1';
  console.log('[launch.ts] Enabled fullscreen mode for pet sprite display');
}

// Set up MACRO global like the real app would
type MacroConfig = {
  VERSION: string;
  BUILD_TIME: string;
  PACKAGE_URL: string;
  NATIVE_PACKAGE_URL: string;
  VERSION_CHANGELOG: string;
  ISSUES_EXPLAINER: string;
  FEEDBACK_CHANNEL: string;
};

const defaultMacro: MacroConfig = {
  VERSION: pkg.version,
  BUILD_TIME: '',
  PACKAGE_URL: pkg.name,
  NATIVE_PACKAGE_URL: pkg.name,
  VERSION_CHANGELOG: '',
  ISSUES_EXPLAINER: 'file an issue at https://github.com/anthropics/claude-code/issues',
  FEEDBACK_CHANNEL: 'github',
};

(globalThis as typeof globalThis & { MACRO: MacroConfig }).MACRO = defaultMacro;

// Check for missing imports
const missingImports: Array<{ importer: string; specifier: string }> = [];
const checked = new Set<string>();

function hasResolvableTarget(basePath: string): boolean {
  const withoutJs = basePath.replace(/\.js$/u, '');
  const candidates = [
    withoutJs,
    `${withoutJs}.ts`,
    `${withoutJs}.tsx`,
    `${withoutJs}.js`,
    join(withoutJs, 'index.ts'),
    join(withoutJs, 'index.tsx'),
  ];
  return candidates.some(candidate => existsSync(candidate));
}

async function scanFile(file: string): Promise<void> {
  const text = await Bun.file(file).text();
  const pattern = /(?:import|export)\s+[\s\S]*?from\s+['"](\.\.?\/[^'"]+)['"]/g;
  for (const match of text.matchAll(pattern)) {
    const specifier = match[1];
    if (!specifier) continue;
    const target = join(process.cwd(), 'src', specifier);
    if (hasResolvableTarget(target)) continue;
    const key = `${file} -> ${specifier}`;
    if (checked.has(key)) continue;
    checked.add(key);
    missingImports.push({ importer: file, specifier });
  }
}

// Quick scan of main.tsx for missing imports
const mainPath = join(process.cwd(), 'src', 'main.tsx');
if (existsSync(mainPath)) {
  await scanFile(mainPath);
}

if (missingImports.length > 0) {
  console.log('Missing imports detected:');
  for (const item of missingImports.slice(0, 10)) {
    console.log(`  ${item.importer} -> ${item.specifier}`);
  }
  console.log('');
  console.log('Continuing anyway...');
  console.log('');
}

// Route to CLI
await import('./src/entrypoints/cli.tsx');
