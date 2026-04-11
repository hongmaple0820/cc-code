// Skill Forge - Auto-generate skills from codebase analysis
// Analyzes code files, extracts patterns, generates executable skill definitions

import { eventBus } from '../../core/events/eventBus.js'
import { container, createToken } from '../../core/di/container.js'
import {
  existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, statSync,
} from 'fs'
import { join, extname, relative, dirname } from 'path'

// Analysis types
export interface FileAnalysis {
  filePath: string
  fileName: string
  language: string
  exports: ExportInfo[]
  imports: string[]
  patterns: CodePattern[]
  complexity: number
  linesOfCode: number
  dependencies: string[]
}

export interface ExportInfo {
  name: string
  kind: 'function' | 'class' | 'interface' | 'type' | 'const' | 'enum'
  parameters?: string[]
  description?: string
}

export interface CodePattern {
  type: PatternType
  confidence: number
  evidence: string
  description: string
}

export type PatternType =
  | 'api_endpoint'
  | 'utility_function'
  | 'data_transformer'
  | 'state_manager'
  | 'event_handler'
  | 'middleware'
  | 'validator'
  | 'factory'
  | 'strategy'
  | 'observer'
  | 'command'
  | 'plugin_hook'

// Skill template
export interface GeneratedSkill {
  name: string
  description: string
  category: string
  sourceFiles: string[]
  patterns: CodePattern[]
  content: string
  skillPath: string
}

// Config
export interface SkillForgeConfig {
  enabled: boolean
  sourceDirs: string[]
  outputDir: string
  languages: string[]
  minConfidence: number
  maxFilesToAnalyze: number
  includePatterns: string[]
  excludePatterns: string[]
}

const DEFAULT_CONFIG: SkillForgeConfig = {
  enabled: true,
  sourceDirs: ['src'],
  outputDir: '.claude/skills',
  languages: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.py'],
  minConfidence: 0.6,
  maxFilesToAnalyze: 50,
  includePatterns: ['**/*.ts', '**/*.tsx'],
  excludePatterns: ['**/node_modules/**', '**/dist/**', '**/*.test.ts', '**/*.spec.ts'],
}

// Pattern detection rules
const PATTERN_RULES: Array<{
  type: PatternType
  keywords: RegExp[]
  weight: number
}> = [
  {
    type: 'api_endpoint',
    keywords: [/router\./, /app\.(get|post|put|delete|patch)/, /@Get\(/, /@Post\(/, /fetch\(/, /endpoint/i],
    weight: 0.8,
  },
  {
    type: 'utility_function',
    keywords: [/export\s+(function|const)\s+\w+/, /util/i, /helper/i, /format/i, /parse/i],
    weight: 0.5,
  },
  {
    type: 'data_transformer',
    keywords: [/map\(/, /transform/i, /convert/i, /serialize/, /deserialize/, /adapter/i],
    weight: 0.7,
  },
  {
    type: 'state_manager',
    keywords: [/useState/, /reducer/i, /store/i, /createStore/, /zustand/, /redux/i],
    weight: 0.7,
  },
  {
    type: 'event_handler',
    keywords: [/on[A-Z]/, /handle[A-Z]/, /addEventListener/, /emit\(/, /eventBus/, /EventEmitter/],
    weight: 0.7,
  },
  {
    type: 'middleware',
    keywords: [/middleware/i, /use\(/, /next\(\)/, /interceptor/i, /before.*after/],
    weight: 0.8,
  },
  {
    type: 'validator',
    keywords: [/validate/, /schema/i, /z\./, /yup\./, /is[A-Z]/, /check/i, /assert/],
    weight: 0.7,
  },
  {
    type: 'factory',
    keywords: [/create[A-Z]/, /factory/i, /make[A-Z]/, /build[A-Z]/, /generate/],
    weight: 0.7,
  },
  {
    type: 'strategy',
    keywords: [/strategy/i, /interface.*{.*execute/, /abstract class/, /implements/],
    weight: 0.6,
  },
  {
    type: 'observer',
    keywords: [/subscribe/, /unsubscribe/, /observer/i, /Observable/, /subject/i],
    weight: 0.8,
  },
  {
    type: 'command',
    keywords: [/Command/, /execute.*args/, /command.*handler/, /slash.*command/],
    weight: 0.7,
  },
  {
    type: 'plugin_hook',
    keywords: [/hook/i, /plugin/i, /before[A-Z]/, /after[A-Z]/, /onMount/, /onUnmount/],
    weight: 0.7,
  },
]

// Extract exports from file content
function extractExports(content: string, filePath: string): ExportInfo[] {
  const exports: ExportInfo[] = []

  // Named function exports
  const funcRegex = /export\s+(?:async\s+)?function\s+(\w+)(?:\s*\(([^)]*)\))?/g
  let match
  while ((match = funcRegex.exec(content)) !== null) {
    exports.push({
      name: match[1],
      kind: 'function',
      parameters: match[2]?.split(',').map(p => p.trim().split(':')[0].trim()).filter(Boolean),
    })
  }

  // Export const/let
  const constRegex = /export\s+(?:const|let|var)\s+(\w+)(?:\s*=\s*(async\s+)?(?:\([^)]*\)|[^=]*))/g
  while ((match = constRegex.exec(content)) !== null) {
    exports.push({
      name: match[1],
      kind: 'const',
    })
  }

  // Export class
  const classRegex = /export\s+class\s+(\w+)/g
  while ((match = classRegex.exec(content)) !== null) {
    exports.push({ name: match[1], kind: 'class' })
  }

  // Export interface
  const interfaceRegex = /export\s+interface\s+(\w+)/g
  while ((match = interfaceRegex.exec(content)) !== null) {
    exports.push({ name: match[1], kind: 'interface' })
  }

  // Export type
  const typeRegex = /export\s+type\s+(\w+)/g
  while ((match = typeRegex.exec(content)) !== null) {
    exports.push({ name: match[1], kind: 'type' })
  }

  // Default export
  const defaultRegex = /export\s+default\s+(?:class\s+)?(\w+)/g
  while ((match = defaultRegex.exec(content)) !== null) {
    exports.push({ name: match[1], kind: 'function' })
  }

  return exports
}

// Extract imports
function extractImports(content: string): string[] {
  const imports: string[] = []
  const importRegex = /from\s+['"]([^'"]+)['"]/g
  let match
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1])
  }
  return imports
}

// Detect patterns in file content
function detectPatterns(content: string, exports: ExportInfo[]): CodePattern[] {
  const patterns: CodePattern[] = []

  for (const rule of PATTERN_RULES) {
    let score = 0
    let evidence = ''
    for (const keyword of rule.keywords) {
      const matches = content.match(keyword)
      if (matches) {
        score += matches.length
        if (!evidence) evidence = matches[0]
      }
    }

    if (score > 0) {
      const confidence = Math.min(1, (score * rule.weight) / 10)
      if (confidence >= 0.3) {
        patterns.push({
          type: rule.type,
          confidence,
          evidence,
          description: describePattern(rule.type, exports),
        })
      }
    }
  }

  return patterns.sort((a, b) => b.confidence - a.confidence)
}

function describePattern(type: PatternType, exports: ExportInfo[]): string {
  const names = exports.slice(0, 3).map(e => e.name).join(', ')
  const descriptions: Record<PatternType, string> = {
    api_endpoint: `API endpoint handling with exports: ${names}`,
    utility_function: `Utility functions: ${names}`,
    data_transformer: `Data transformation logic: ${names}`,
    state_manager: `State management: ${names}`,
    event_handler: `Event handling: ${names}`,
    middleware: `Middleware/interceptor pattern: ${names}`,
    validator: `Validation logic: ${names}`,
    factory: `Factory/creator pattern: ${names}`,
    strategy: `Strategy pattern implementation: ${names}`,
    observer: `Observer/pub-sub pattern: ${names}`,
    command: `Command pattern: ${names}`,
    plugin_hook: `Plugin hooks: ${names}`,
  }
  return descriptions[type]
}

function detectLanguage(filePath: string): string {
  const ext = extname(filePath).toLowerCase()
  const langMap: Record<string, string> = {
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript (React)',
    '.js': 'JavaScript',
    '.jsx': 'JavaScript (React)',
    '.mjs': 'JavaScript (Module)',
    '.py': 'Python',
  }
  return langMap[ext] || ext || 'unknown'
}

function analyzeFile(filePath: string): FileAnalysis | null {
  try {
    const content = readFileSync(filePath, 'utf-8')
    const lines = content.split('\n').length
    const imports = extractImports(content)
    const exports_ = extractExports(content, filePath)
    const patterns = detectPatterns(content, exports_)

    return {
      filePath,
      fileName: filePath.split('/').pop() || filePath,
      language: detectLanguage(filePath),
      exports: exports_,
      imports,
      patterns,
      complexity: estimateComplexity(content),
      linesOfCode: lines,
      dependencies: imports.filter(i => !i.startsWith('.')).slice(0, 10),
    }
  } catch {
    return null
  }
}

function estimateComplexity(content: string): number {
  let score = 1
  // Nesting depth
  const maxNesting = (content.match(/\{\s*\{/g) || []).length
  score += Math.min(5, maxNesting / 3)
  // Conditionals
  score += (content.match(/\bif\b|\belse\b|\bswitch\b|\bcase\b/g) || []).length * 0.2
  // Loops
  score += (content.match(/\bfor\b|\bwhile\b|\bforEach\b|\bmap\b|\breduce\b/g) || []).length * 0.1
  return Math.round(score * 10) / 10
}

// Collect files to analyze
function collectFiles(sourceDirs: string[], languages: string[], excludePatterns: string[], maxFiles: number): string[] {
  const files: string[] = []

  for (const dir of sourceDirs) {
    if (!existsSync(dir)) continue
    walkDirectory(dir, files, languages, excludePatterns)
    if (files.length >= maxFiles) break
  }

  return files.slice(0, maxFiles)
}

function walkDirectory(dir: string, files: string[], languages: string[], excludePatterns: string[]): void {
  try {
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue
        walkDirectory(fullPath, files, languages, excludePatterns)
      } else if (entry.isFile()) {
        const ext = extname(entry.name)
        if (languages.includes(ext)) {
          files.push(fullPath)
        }
      }
    }
  } catch {
    // skip
  }
}

// Generate skill content from analysis
function generateSkillContent(analyses: FileAnalysis[], patternType: PatternType): string {
  const patternAnalyses = analyses
    .filter(a => a.patterns.some(p => p.type === patternType && p.confidence >= 0.5))
    .sort((a, b) => {
      const aScore = a.patterns.find(p => p.type === patternType)?.confidence ?? 0
      const bScore = b.patterns.find(p => p.type === patternType)?.confidence ?? 0
      return bScore - aScore
    })
    .slice(0, 5)

  if (patternAnalyses.length === 0) return ''

  const exportList = patternAnalyses.flatMap(a =>
    a.exports.map(e => `  - \`${e.name}\` (${e.kind}) — ${e.description || patternAnalyses.find(pa => pa === a)?.patterns.find(p => p.type === patternType)?.description || ''}`)
  ).join('\n')

  const fileList = patternAnalyses.map(a => `  - \`${relative(process.cwd(), a.filePath)}\``).join('\n')

  return `# Auto-generated Skill: ${patternTypeToTitle(patternType)}

## Purpose

Automatically detected ${patternTypeToTitle(patternType)} patterns in the codebase.
This skill provides assistance with ${patternType.replace(/_/g, ' ')} operations.

## Detected Exports

${exportList || '  No significant exports detected'}

## Source Files

${fileList || '  No files detected'}

## Usage

Invoke this skill when working with ${patternType.replace(/_/g, ' ')} patterns
in the codebase. The model will use the detected patterns to provide contextual assistance.

## Notes

- This skill was auto-generated by SkillForge
- Review and refine the content as needed
- Source files: ${patternAnalyses.length} files analyzed
`
}

function patternTypeToTitle(type: PatternType): string {
  const titles: Record<PatternType, string> = {
    api_endpoint: 'API Endpoints',
    utility_function: 'Utility Functions',
    data_transformer: 'Data Transformers',
    state_manager: 'State Management',
    event_handler: 'Event Handlers',
    middleware: 'Middleware',
    validator: 'Validators',
    factory: 'Factory Pattern',
    strategy: 'Strategy Pattern',
    observer: 'Observer Pattern',
    command: 'Command Pattern',
    plugin_hook: 'Plugin Hooks',
  }
  return titles[type] || type
}

// Main SkillForge engine
export class SkillForge {
  private config: SkillForgeConfig

  constructor(config: Partial<SkillForgeConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  // Analyze codebase
  analyze(): FileAnalysis[] {
    const files = collectFiles(
      this.config.sourceDirs,
      this.config.languages,
      this.config.excludePatterns,
      this.config.maxFilesToAnalyze,
    )

    const analyses: FileAnalysis[] = []
    for (const file of files) {
      const analysis = analyzeFile(file)
      if (analysis) analyses.push(analysis)
    }

    return analyses
  }

  // Generate skills from analysis
  generateSkills(analyses?: FileAnalysis[]): GeneratedSkill[] {
    const files = analyses ?? this.analyze()
    if (files.length === 0) return []

    // Group files by dominant pattern
    const patternGroups = new Map<PatternType, FileAnalysis[]>()
    for (const file of files) {
      const topPattern = file.patterns[0]
      if (topPattern) {
        const group = patternGroups.get(topPattern.type) ?? []
        group.push(file)
        patternGroups.set(topPattern.type, group)
      }
    }

    const skills: GeneratedSkill[] = []
    const outputDir = this.config.outputDir

    for (const [patternType, analyses_] of patternGroups) {
      if (analyses_.length < 2) continue  // Skip single-file patterns

      const skillContent = generateSkillContent(analyses_, patternType)
      if (!skillContent) continue

      const skillName = `auto-${patternType.replace(/_/g, '-')}`
      const skillDir = join(outputDir, skillName)
      const skillPath = join(skillDir, 'SKILL.md')

      skills.push({
        name: skillName,
        description: `Auto-detected ${patternTypeToTitle(patternType)} patterns (${analyses_.length} files)`,
        category: 'auto-generated',
        sourceFiles: analyses_.map(a => a.filePath),
        patterns: analyses_.flatMap(a => a.patterns.filter(p => p.type === patternType)),
        content: skillContent,
        skillPath,
      })
    }

    return skills
  }

  // Write skills to disk
  writeSkills(skills: GeneratedSkill[]): string[] {
    const written: string[] = []

    for (const skill of skills) {
      try {
        const skillDir = dirname(skill.skillPath)
        if (!existsSync(skillDir)) {
          mkdirSync(skillDir, { recursive: true })
        }
        writeFileSync(skill.skillPath, skill.content, 'utf-8')
        written.push(skill.skillPath)
        eventBus.emit('skillforge:skill:written', { name: skill.name, path: skill.skillPath })
      } catch (e) {
        eventBus.emit('skillforge:skill:failed', { name: skill.name, error: String(e) })
      }
    }

    return written
  }

  // Full pipeline: analyze -> generate -> write
  run(): { analyzed: number; generated: number; written: string[] } {
    const analyses = this.analyze()
    const skills = this.generateSkills(analyses)
    const written = this.writeSkills(skills)

    return {
      analyzed: analyses.length,
      generated: skills.length,
      written,
    }
  }

  getConfig(): SkillForgeConfig {
    return { ...this.config }
  }

  updateConfig(updates: Partial<SkillForgeConfig>): void {
    this.config = { ...this.config, ...updates }
  }
}

// Export singleton
export const skillForge = new SkillForge()

// DI registration
export const SKILL_FORGE_TOKEN = createToken<SkillForge>('SkillForge')
container.registerValue(SKILL_FORGE_TOKEN, skillForge)
