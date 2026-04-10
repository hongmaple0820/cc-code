// Command Registry - Core command registration and organization
// Split from commands.ts for better modularity

// Import existing commands only
import addDir from './add-dir/index.js'
import autofixPr from './autofix-pr/index.js'
import backfillSessions from './backfill-sessions/index.js'
import btw from './btw/index.js'
import goodClaude from './good-claude/index.js'
import issue from './issue/index.js'
import feedback from './feedback/index.js'
import clear from './clear/index.js'
import color from './color/index.js'
import commit from './commit.js'
import copy from './copy/index.js'
import desktop from './desktop/index.js'
import commitPushPr from './commit-push-pr.js'
import compact from './compact/index.js'
import config from './config/index.js'
import { context, contextNonInteractive } from './context/index.js'
import cost from './cost/index.js'
import diff from './diff/index.js'
import ctx_viz from './ctx_viz/index.js'
import doctor from './doctor/index.js'
import memory from './memory/index.js'
import help from './help/index.js'
import ide from './ide/index.js'
import init from './init.js'
import initVerifiers from './init-verifiers.js'
import keybindings from './keybindings/index.js'
import login from './login/index.js'
import logout from './logout/index.js'
import installGitHubApp from './install-github-app/index.js'
import installSlackApp from './install-slack-app/index.js'
import breakCache from './break-cache/index.js'
import mcp from './mcp/index.js'
import mobile from './mobile/index.js'
import onboarding from './onboarding/index.js'
import pr_comments from './pr_comments/index.js'
import releaseNotes from './release-notes/index.js'
import rename from './rename/index.js'
import resume from './resume/index.js'
import review, { ultrareview } from './review.js'
import session from './session/index.js'
import share from './share/index.js'
import skills from './skills/index.js'
import status from './status/index.js'
import tasks from './tasks/index.js'
import teleport from './teleport/index.js'
import securityReview from './security-review.js'
import bughunter from './bughunter/index.js'
import terminalSetup from './terminalSetup/index.js'
import usage from './usage/index.js'
import theme from './theme/index.js'
import vim from './vim/index.js'
import thinkback from './thinkback/index.js'
import thinkbackPlay from './thinkback-play/index.js'
import permissions from './permissions/index.js'
import plan from './plan/index.js'
import fast from './fast/index.js'
import passes from './passes/index.js'
import privacySettings from './privacy-settings/index.js'
import hooks from './hooks/index.js'
import files from './files/index.js'
import branch from './branch/index.js'
import agents from './agents/index.js'
import plugin from './plugin/index.js'
import reloadPlugins from './reload-plugins/index.js'
import rewind from './rewind/index.js'
import heapDump from './heapdump/index.js'
import mockLimits from './mock-limits/index.js'
import bridgeKick from './bridge-kick.js'
import version from './version.js'
import summary from './summary/index.js'
import {
  resetLimits,
  resetLimitsNonInteractive,
} from './reset-limits/index.js'
import antTrace from './ant-trace/index.js'
import perfIssue from './perf-issue/index.js'
import sandboxToggle from './sandbox-toggle/index.js'
import chrome from './chrome/index.js'
import stickers from './stickers/index.js'
import advisor from './advisor.js'
import env from './env/index.js'
import exit from './exit/index.js'
import exportCommand from './export/index.js'
import model from './model/index.js'
import tag from './tag/index.js'
import outputStyle from './output-style/index.js'
import remoteEnv from './remote-env/index.js'
import upgrade from './upgrade/index.js'
import {
  extraUsage,
  extraUsageNonInteractive,
} from './extra-usage/index.js'
import rateLimitOptions from './rate-limit-options/index.js'
import statusline from './statusline.js'
import effort from './effort/index.js'
import stats from './stats/index.js'
import oauthRefresh from './oauth-refresh/index.js'
import debugToolCall from './debug-tool-call/index.js'
import memoize from 'lodash-es/memoize.js'
import type { Command } from '../types/command.js'
import { feature } from 'bun:bundle'

/* eslint-disable @typescript-eslint/no-require-imports */
// Note: agents-platform and other feature-gated commands loaded dynamically below

// ULTRAPLAN - Check if exists
const ultraplan = (() => {
  try {
    return require('./ultraplan.js').default
  } catch {
    return null
  }
})()

// BUDDY feature - always enabled (file exists)
const buddy = (() => {
  try {
    return (require('./buddy/index.js') as typeof import('./buddy/index.js')).default
  } catch {
    return null
  }
})()

// COORDINATOR - Check if exists
const coordinator = (() => {
  try {
    return require('./coordinator/index.js').default
  } catch {
    return null
  }
})()

// Brief command - check if it exists
const briefCommand = feature('KAIROS') || feature('KAIROS_BRIEF')
  ? (() => {
      try {
        return require('./brief.js').default
      } catch {
        return null
      }
    })()
  : null

// Bridge command - check if it exists
const bridge = feature('BRIDGE_MODE')
  ? (() => {
      try {
        return require('./bridge/index.js').default
      } catch {
        return null
      }
    })()
  : null

/* eslint-enable @typescript-eslint/no-require-imports */

// Insights command with lazy loading
const usageReport: Command = {
  type: 'prompt',
  name: 'insights',
  description: 'Generate a report analyzing your Claude Code sessions',
  contentLength: 0,
  progressMessage: 'analyzing your sessions',
  source: 'builtin',
  async getPromptForCommand(args, context) {
    const real = (await import('./insights.js')).default
    if (real.type !== 'prompt') throw new Error('unreachable')
    return real.getPromptForCommand(args, context)
  },
}

// Commands that get eliminated from the external build
export const INTERNAL_ONLY_COMMANDS = [
  backfillSessions,
  breakCache,
  bughunter,
  commit,
  commitPushPr,
  ctx_viz,
  goodClaude,
  issue,
  initVerifiers,
  mockLimits,
  bridgeKick,
  version,
  ultraplan,
  resetLimits,
  resetLimitsNonInteractive,
  onboarding,
  share,
  summary,
  teleport,
  antTrace,
  perfIssue,
  env,
  oauthRefresh,
  debugToolCall,
  autofixPr,
  coordinator,
].filter(Boolean)

// Core built-in commands
export const CORE_COMMANDS: Command[] = [
  addDir,
  advisor,
  agents,
  branch,
  btw,
  chrome,
  clear,
  color,
  compact,
  config,
  copy,
  desktop,
  context,
  contextNonInteractive,
  cost,
  diff,
  doctor,
  effort,
  exit,
  fast,
  files,
  heapDump,
  help,
  ide,
  init,
  keybindings,
  installGitHubApp,
  installSlackApp,
  mcp,
  memory,
  mobile,
  model,
  outputStyle,
  remoteEnv,
  plugin,
  pr_comments,
  releaseNotes,
  reloadPlugins,
  rename,
  resume,
  session,
  skills,
  stats,
  status,
  statusline,
  stickers,
  tag,
  theme,
  feedback,
  review,
  ultrareview,
  rewind,
  securityReview,
  terminalSetup,
  upgrade,
  extraUsage,
  extraUsageNonInteractive,
  rateLimitOptions,
  usage,
  usageReport,
  vim,
  thinkback,
  thinkbackPlay,
  permissions,
  plan,
  privacySettings,
  hooks,
  exportCommand,
  sandboxToggle,
  passes,
  tasks,
  buddy,
  ultraplan,
  coordinator,
]

// Feature-gated commands - only include if they exist
export const getFeatureGatedCommands = (): Command[] => [
  ...(bridge ? [bridge] : []),
  ...(briefCommand ? [briefCommand] : []),
]

// Get all built-in commands
export const getBuiltInCommands = memoize((): Command[] => [
  ...CORE_COMMANDS,
  ...getFeatureGatedCommands(),
])

// Command name index
export const builtInCommandNames = memoize(
  (): Set<string> =>
    new Set(getBuiltInCommands().flatMap(cmd => [cmd.name, ...(cmd.aliases ?? [])])),
)
