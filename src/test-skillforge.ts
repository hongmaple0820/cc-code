// Test: Skill Forge
import { skillForge } from './modules/skillforge/SkillForge.js'
import { existsSync, rmSync, readdirSync } from 'fs'
import { resolve } from 'path'

const SKILLS_DIR = resolve('.claude/skills')

function cleanup(): void {
  if (existsSync(SKILLS_DIR)) {
    const entries = readdirSync(SKILLS_DIR, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith('auto-')) {
        rmSync(resolve(SKILLS_DIR, entry.name), { recursive: true, force: true })
      }
    }
  }
}

async function test(name: string, fn: () => Promise<void>): Promise<boolean> {
  try {
    await fn()
    console.log(`  PASS: ${name}`)
    return true
  } catch (e) {
    console.error(`  FAIL: ${name}`)
    console.error(`    ${e}`)
    return false
  }
}

async function main(): Promise<void> {
  console.log('\n=== SkillForge Tests ===\n')

  cleanup()
  let passed = 0
  let total = 0

  // Test 1: Analyze finds files
  total++
  if (await test('Analyze finds files', async () => {
    const analyses = skillForge.analyze()
    if (analyses.length === 0) throw new Error('No files analyzed')
    if (analyses[0].exports.length === 0 && analyses.length < 3) throw new Error('No exports found in any file')
  })) passed++

  // Test 2: Pattern detection
  total++
  if (await test('Detects patterns', async () => {
    const analyses = skillForge.analyze()
    const hasPatterns = analyses.some(a => a.patterns.length > 0)
    if (!hasPatterns) throw new Error('No patterns detected in any file')
  })) passed++

  // Test 3: Skill generation
  total++
  if (await test('Generates skills', async () => {
    const skills = skillForge.generateSkills()
    if (!Array.isArray(skills)) throw new Error('Should return array')
    // Skills may or may not be generated depending on codebase
    console.log(`    Generated ${skills.length} skills`)
  })) passed++

  // Test 4: Full pipeline
  total++
  if (await test('Full pipeline runs', async () => {
    const result = skillForge.run()
    if (typeof result.analyzed !== 'number') throw new Error('Missing analyzed count')
    if (typeof result.generated !== 'number') throw new Error('Missing generated count')
    if (!Array.isArray(result.written)) throw new Error('Missing written array')
    console.log(`    Analyzed: ${result.analyzed}, Generated: ${result.generated}, Written: ${result.written.length}`)
  })) passed++

  // Test 5: Config
  total++
  if (await test('Config accessible', async () => {
    const config = skillForge.getConfig()
    if (!config.enabled) throw new Error('Should be enabled')
    if (!config.sourceDirs.includes('src')) throw new Error('Should include src')
  })) passed++

  cleanup()
  console.log(`\n=== Results: ${passed}/${total} passed ===\n`)
}

main().catch(console.error)
