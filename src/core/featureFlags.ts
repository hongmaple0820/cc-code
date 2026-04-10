// Feature Flags - Centralized feature flag management
// Enables fine-grained control over experimental and enhanced features

// Note: bun:bundle feature flags are disabled for testing
// import { feature as bundleFeature } from 'bun:bundle'

// Feature flag definitions
export interface FeatureFlags {
  // Core hidden features (now enabled by default)
  ULTRAPLAN: boolean          // 30-minute deep planning mode
  COORDINATOR_MODE: boolean   // Multi-agent orchestration
  KAIROS: boolean             // Proactive assistant mode
  BUDDY: boolean              // Companion pet system

  // Experimental features
  PROACTIVE: boolean          // Proactive suggestions
  BRIDGE_MODE: boolean        // Remote control bridge
  VOICE_MODE: boolean         // Voice interaction
  DAEMON: boolean             // Background daemon mode
  WORKFLOW_SCRIPTS: boolean   // Workflow automation
  MCP_SKILLS: boolean         // MCP-provided skills
  HISTORY_SNIP: boolean       // History compression
  EXPERIMENTAL_SKILL_SEARCH: boolean // Skill search
  SMART_SHELL: boolean        // Intelligent shell risk analysis

  // Enhanced build features
  TORCH: boolean              // Performance profiling
  UDS_INBOX: boolean          // Inter-session communication
  FORK_SUBAGENT: boolean      // Subagent forking
  CCR_REMOTE_SETUP: boolean   // Remote setup via CCR
  KAIROS_GITHUB_WEBHOOKS: boolean // GitHub webhook integration
  AGENT_TRIGGERS: boolean     // Agent trigger system
  MONITOR_TOOL: boolean       // Monitoring tools
}

// Default feature configuration for enhanced build
const DEFAULT_FEATURES: FeatureFlags = {
  // Core features - always enabled
  ULTRAPLAN: true,
  COORDINATOR_MODE: true,
  KAIROS: true,
  BUDDY: true,

  // Experimental - enabled for testing
  PROACTIVE: true,
  BRIDGE_MODE: true,
  VOICE_MODE: false,  // Requires hardware support
  DAEMON: false,      // Requires background process support
  WORKFLOW_SCRIPTS: true,
  MCP_SKILLS: true,
  HISTORY_SNIP: true,
  EXPERIMENTAL_SKILL_SEARCH: true,
  SMART_SHELL: true,        // Enabled by default for testing

  // Enhanced features
  TORCH: true,
  UDS_INBOX: true,
  FORK_SUBAGENT: true,
  CCR_REMOTE_SETUP: true,
  KAIROS_GITHUB_WEBHOOKS: true,
  AGENT_TRIGGERS: true,
  MONITOR_TOOL: true,
}

// Environment variable overrides
function getEnvOverrides(): Partial<FeatureFlags> {
  const overrides: Partial<FeatureFlags> = {}

  if (process.env.CLAUDE_CODE_DISABLE_ULTRAPLAN === '1') {
    overrides.ULTRAPLAN = false
  }
  if (process.env.CLAUDE_CODE_DISABLE_COORDINATOR === '1') {
    overrides.COORDINATOR_MODE = false
  }
  if (process.env.CLAUDE_CODE_ENABLE_VOICE === '1') {
    overrides.VOICE_MODE = true
  }
  if (process.env.CLAUDE_CODE_ENABLE_DAEMON === '1') {
    overrides.DAEMON = true
  }
  if (process.env.CLAUDE_CODE_DISABLE_SMART_SHELL === '1') {
    overrides.SMART_SHELL = false
  }
  if (process.env.CLAUDE_CODE_ENABLE_SMART_SHELL === '1') {
    overrides.SMART_SHELL = true
  }

  return overrides
}

// Computed features
export const FEATURES: FeatureFlags = {
  ...DEFAULT_FEATURES,
  ...getEnvOverrides(),
}

// Feature check function (compatible with bun:bundle)
export function isFeatureEnabled(featureName: keyof FeatureFlags): boolean {
  // First check environment override
  const envOverride = getEnvOverrides()[featureName]
  if (envOverride !== undefined) {
    return envOverride
  }

  // Return default feature value
  // Note: bundleFeature disabled for testing - would enable dead code elimination
  return DEFAULT_FEATURES[featureName] ?? false
}

// Legacy compatibility
export const feature = isFeatureEnabled

// Feature descriptions for documentation
export const FEATURE_DESCRIPTIONS: Record<keyof FeatureFlags, string> = {
  ULTRAPLAN: 'Advanced 30-minute planning mode with Opus model for complex task decomposition',
  COORDINATOR_MODE: 'Multi-agent orchestration for parallel task execution',
  KAIROS: 'Proactive assistant that observes and acts autonomously',
  BUDDY: 'Interactive companion pet with productivity features',
  PROACTIVE: 'Context-aware proactive suggestions',
  BRIDGE_MODE: 'Remote control via WebSocket bridge',
  VOICE_MODE: 'Voice input and output support',
  DAEMON: 'Background daemon for persistent sessions',
  WORKFLOW_SCRIPTS: 'Automated workflow scripting',
  MCP_SKILLS: 'Skills provided by MCP servers',
  HISTORY_SNIP: 'Intelligent history compression',
  EXPERIMENTAL_SKILL_SEARCH: 'Local skill search and discovery',
  SMART_SHELL: 'Intelligent shell command risk analysis and prediction',
  TORCH: 'Performance profiling and optimization',
  UDS_INBOX: 'Inter-session communication via UDS',
  FORK_SUBAGENT: 'Fork subagents for isolated tasks',
  CCR_REMOTE_SETUP: 'Remote setup via Claude Code on Web',
  KAIROS_GITHUB_WEBHOOKS: 'GitHub webhook integration for Kairos',
  AGENT_TRIGGERS: 'Automated agent triggering system',
  MONITOR_TOOL: 'System monitoring and observability tools',
}

// Feature dependencies
export const FEATURE_DEPENDENCIES: Partial<Record<keyof FeatureFlags, (keyof FeatureFlags)[]>> = {
  DAEMON: ['BRIDGE_MODE'],
  KAIROS_GITHUB_WEBHOOKS: ['KAIROS'],
}

// Validate feature dependencies
export function validateFeatureDependencies(): string[] {
  const errors: string[] = []

  for (const [feature, deps] of Object.entries(FEATURE_DEPENDENCIES)) {
    if (isFeatureEnabled(feature as keyof FeatureFlags)) {
      for (const dep of deps!) {
        if (!isFeatureEnabled(dep)) {
          errors.push(`${feature} requires ${dep} to be enabled`)
        }
      }
    }
  }

  return errors
}

// List enabled features
export function listEnabledFeatures(): string[] {
  return Object.entries(FEATURES)
    .filter(([, enabled]) => enabled)
    .map(([name]) => name)
}

// Get feature status report
export function getFeatureStatus(): {
  enabled: string[]
  disabled: string[]
  errors: string[]
} {
  const allFeatures = Object.keys(FEATURES) as (keyof FeatureFlags)[]

  return {
    enabled: allFeatures.filter(f => isFeatureEnabled(f)),
    disabled: allFeatures.filter(f => !isFeatureEnabled(f)),
    errors: validateFeatureDependencies(),
  }
}
