// Enhanced Modules exports - New feature modules

// Kairos - Proactive Assistant
export {
  KairosEngine,
  kairosEngine,
  KAIROS_ENGINE_TOKEN,
  type KairosConfig,
  type KairosObservation,
  type KairosTask,
  type ObservationType,
  type SuggestedAction,
  type ObservationContext,
  type ConsolidationState,
  type ConsolidationPhase,
  type EmotionState,
} from './kairos/KairosEngine.js'

// Buddy - Enhanced Companion
export {
  BuddyAI,
  buddyAI,
  BUDDY_AI_TOKEN,
  type BuddyAIConfig,
  type EmotionType,
  type ProductivityMetrics,
  type CodeQualityMetrics,
  type BuddyReaction,
  type WorkSession,
} from './buddy/BuddyAI.js'

// Smart Shell - Intelligent CLI
export {
  SmartShell,
  smartShell,
  SMART_SHELL_TOKEN,
  type SmartShellConfig,
  type RiskAssessment,
  type RiskLevel,
  type RiskReason,
  type CommandPrediction,
  type OutputSummary,
  type CommandHistory,
} from './smartshell/SmartShell.js'
