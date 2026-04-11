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

// Long-term Task Engine - Persistent task management
export {
  LongTermTaskEngine,
  longTermTaskEngine,
  LONG_TERM_TASK_ENGINE_TOKEN,
} from './longterm/TaskEngine.js'

export {
  type LongTermTask,
  type TaskState,
  type TaskPriority,
  type TaskQuery,
  type TaskStats,
  type CreateTaskOptions,
  type Checkpoint,
  type TaskStep,
  type TaskMeta,
} from './longterm/types.js'

// Skill Forge - Auto-generate skills from codebase
export {
  SkillForge,
  skillForge,
  SKILL_FORGE_TOKEN,
  type SkillForgeConfig,
  type FileAnalysis,
  type GeneratedSkill,
  type CodePattern,
  type PatternType,
} from './skillforge/SkillForge.js'

// Knowledge Base - Persistent knowledge consolidation
export {
  KnowledgeBase,
  knowledgeBase,
  KNOWLEDGE_BASE_TOKEN,
  type KnowledgeEntry,
  type KnowledgeType,
  type KnowledgeQuery,
  type KnowledgeStats,
  type KnowledgeFeedback,
} from './knowledgebase/KnowledgeBase.js'

// Self-Evolution Engine - Feedback-driven adaptation
export {
  SelfEvolutionEngine,
  selfEvolutionEngine,
  SELF_EVOLUTION_ENGINE_TOKEN,
  type AdaptiveSettings,
  type BehaviorEvent,
  type BehaviorPattern,
  type BehaviorType,
} from './selfevolution/SelfEvolutionEngine.js'
