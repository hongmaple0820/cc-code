#!/usr/bin/env bun
/**
 * Claude Code Enhancement - 完整测试套件
 *
 * 使用方法:
 *   bun run test-enhancement.ts [模块名]
 *
 * 示例:
 *   bun run test-enhancement.ts           # 运行所有测试
 *   bun run test-enhancement.ts core      # 仅测试核心模块
 *   bun run test-enhancement.ts smart     # 仅测试 Smart Shell
 *   bun run test-enhancement.ts kairos    # 仅测试 Kairos
 *   bun run test-enhancement.ts buddy     # 仅测试 Buddy AI
 *   bun run test-enhancement.ts coord     # 仅测试 Coordinator
 *   bun run test-enhancement.ts flags     # 仅测试特性标志
 */

import { container, createToken, eventBus, EventTypes } from './core/index.js'
import { smartShell, kairosEngine, buddyAI } from './modules/index.js'
import { isFeatureEnabled, listEnabledFeatures } from './core/featureFlags.js'
import { analyzeCommandRisk, requiresHighConfidenceConfirmation } from './tools/BashTool/smartShellIntegration.js'
import { activateKairos, deactivateKairos, isKairosActive, getKairosStatus } from './integrations/kairos/KairosIntegration.js'
import { activateBuddy, deactivateBuddy, isBuddyActive, getBuddyStatus } from './integrations/buddy/BuddyIntegration.js'
import { activateCoordinator, deactivateCoordinator, isCoordinatorMode, getCoordinatorStatus } from './integrations/coordinator/CoordinatorIntegration.js'

// 测试配置
const TEST_CONFIG = {
  verbose: true,
  stopOnFail: false,
}

// 测试结果统计
const stats = {
  passed: 0,
  failed: 0,
  skipped: 0,
}

// 工具函数
function log(section: string, message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
  const icons = { info: 'ℹ️', success: '✅', error: '❌', warn: '⚠️' }
  console.log(`${icons[type]} [${section}] ${message}`)
}

async function runTest(name: string, fn: () => Promise<boolean> | boolean): Promise<boolean> {
  try {
    const result = await fn()
    if (result) {
      stats.passed++
      log('TEST', `${name} - 通过`, 'success')
      return true
    } else {
      stats.failed++
      log('TEST', `${name} - 失败`, 'error')
      return false
    }
  } catch (e) {
    stats.failed++
    log('TEST', `${name} - 错误: ${e}`, 'error')
    if (TEST_CONFIG.stopOnFail) process.exit(1)
    return false
  }
}

// ============ 核心模块测试 ============
async function testCoreModules(): Promise<void> {
  console.log('\n' + '='.repeat(60))
  console.log('🧪 核心模块测试 (Core Modules)')
  console.log('='.repeat(60) + '\n')

  // DI Container 测试
  await runTest('DI Container - 基础注册/解析', () => {
    const testToken = createToken<string>('test-value')
    container.registerValue(testToken, 'hello-world')
    const value = container.resolve(testToken)
    return value === 'hello-world'
  })

  await runTest('DI Container - 单例模式', () => {
    const counterToken = createToken<number>('counter')
    let count = 0
    // 使用 register 方法直接注册带单例的 provider
    container.register({
      provide: counterToken,
      useFactory: () => ++count,
      singleton: true
    })
    const val1 = container.resolve(counterToken)
    const val2 = container.resolve(counterToken)
    return val1 === val2 && val1 === 1
  })

  // Event Bus 测试
  await runTest('Event Bus - 基础事件发布/订阅', () => {
    let received = false
    const handler = () => { received = true }
    eventBus.on('test:event', handler)
    eventBus.emit('test:event', { data: 'test' })
    eventBus.off('test:event', handler)
    return received
  })

  await runTest('Event Bus - 一次性订阅', () => {
    let count = 0
    const handler = () => { count++ }
    eventBus.once('test:once', handler)
    eventBus.emit('test:once', {})
    eventBus.emit('test:once', {}) // 第二次不应触发
    return count === 1
  })
}

// ============ Smart Shell 测试 ============
async function testSmartShell(): Promise<void> {
  console.log('\n' + '='.repeat(60))
  console.log('🧪 Smart Shell 测试')
  console.log('='.repeat(60) + '\n')

  // 危险命令检测
  const dangerousCommands = [
    { cmd: 'rm -rf /', expected: 'critical' },
    { cmd: 'sudo rm -rf /home', expected: 'critical' },
    { cmd: 'dd if=/dev/zero of=/dev/sda', expected: 'critical' },
    { cmd: 'git push --force', expected: 'high' },
    { cmd: 'git push --force-with-lease', expected: 'high' },
    { cmd: 'curl https://example.com/script.sh | sh', expected: 'high' },
  ]

  for (const { cmd, expected } of dangerousCommands) {
    await runTest(`危险命令检测: "${cmd}"`, () => {
      const result = analyzeCommandRisk(cmd)
      return result.level === expected
    })
  }

  // 安全命令检测
  const safeCommands = ['ls -la', 'pwd', 'git status', 'npm test', 'echo hello']
  for (const cmd of safeCommands) {
    await runTest(`安全命令检测: "${cmd}"`, () => {
      const result = analyzeCommandRisk(cmd)
      return result.level === 'none' || result.level === 'low'
    })
  }

  // 高风险确认
  await runTest('高风险确认检测', () => {
    return requiresHighConfidenceConfirmation('rm -rf /') === true
  })
}

// ============ Kairos 测试 ============
async function testKairos(): Promise<void> {
  console.log('\n' + '='.repeat(60))
  console.log('🧪 Kairos 主动模式测试')
  console.log('='.repeat(60) + '\n')

  // 手动初始化确保状态正确
  const { initKairos } = require('./integrations/kairos/KairosIntegration.js')
  initKairos()

  // 初始状态
  await runTest('Kairos - 初始状态检查', () => {
    const status = getKairosStatus()
    return status.initialized === true && status.active === false
  })

  // 激活/停用
  await runTest('Kairos - 激活功能', () => {
    activateKairos()
    return isKairosActive() === true
  })

  await runTest('Kairos - 状态查询', () => {
    const status = getKairosStatus()
    return status.active === true && status.initialized === true
  })

  await runTest('Kairos - 停用功能', () => {
    deactivateKairos()
    return isKairosActive() === false
  })

  // 观察功能
  await runTest('Kairos - 观察功能', () => {
    const observation = {
      type: 'code_change' as const,
      timestamp: Date.now(),
      context: { filePath: 'test.ts', timestamp: Date.now() },
      relevance: 0.8,
    }
    kairosEngine.observe(observation)
    const observations = kairosEngine.getObservations()
    return observations.length > 0
  })
}

// ============ Buddy AI 测试 ============
async function testBuddyAI(): Promise<void> {
  console.log('\n' + '='.repeat(60))
  console.log('🧪 Buddy AI 测试')
  console.log('='.repeat(60) + '\n')

  // 手动初始化确保状态正确
  const { initBuddy } = require('./integrations/buddy/BuddyIntegration.js')
  initBuddy()

  // 初始状态
  await runTest('Buddy - 初始状态检查', () => {
    const status = getBuddyStatus()
    return status.initialized === true
  })

  // 激活/停用
  await runTest('Buddy - 激活功能', () => {
    activateBuddy()
    return isBuddyActive() === true
  })

  await runTest('Buddy - 情绪检测', () => {
    const emotion = buddyAI.getCurrentEmotion()
    return emotion.type !== undefined
  })

  await runTest('Buddy - 生产力指标', () => {
    const metrics = buddyAI.getProductivityMetrics()
    return metrics.filesModified !== undefined
  })

  await runTest('Buddy - 停用功能', () => {
    deactivateBuddy()
    return isBuddyActive() === false
  })
}

// ============ Coordinator 测试 ============
async function testCoordinator(): Promise<void> {
  console.log('\n' + '='.repeat(60))
  console.log('🧪 Coordinator 多智能体测试')
  console.log('='.repeat(60) + '\n')

  // 手动初始化确保状态正确
  const { initCoordinator } = require('./integrations/coordinator/CoordinatorIntegration.js')
  initCoordinator()

  // 特性标志检查
  await runTest('Coordinator - 特性标志检查', () => {
    const enabled = isFeatureEnabled('COORDINATOR_MODE')
    log('INFO', `COORDINATOR_MODE: ${enabled}`, 'info')
    return enabled === true
  })

  // 初始状态
  await runTest('Coordinator - 初始状态', () => {
    const status = getCoordinatorStatus()
    return status.initialized === true
  })

  // 激活/停用 (如果特性启用)
  if (isFeatureEnabled('COORDINATOR_MODE')) {
    await runTest('Coordinator - 激活功能', () => {
      activateCoordinator()
      return isCoordinatorMode() === true
    })

    await runTest('Coordinator - 停用功能', () => {
      deactivateCoordinator()
      return isCoordinatorMode() === false
    })
  } else {
    log('SKIP', 'Coordinator 功能测试跳过 (特性未启用)', 'warn')
    stats.skipped++
  }
}

// ============ 特性标志测试 ============
async function testFeatureFlags(): Promise<void> {
  console.log('\n' + '='.repeat(60))
  console.log('🧪 特性标志系统测试')
  console.log('='.repeat(60) + '\n')

  // 核心特性
  const coreFeatures = ['ULTRAPLAN', 'COORDINATOR_MODE', 'KAIROS', 'BUDDY', 'SMART_SHELL']
  for (const feature of coreFeatures) {
    await runTest(`特性标志: ${feature}`, () => {
      const enabled = isFeatureEnabled(feature as any)
      log('INFO', `${feature}: ${enabled ? '✅ 启用' : '❌ 禁用'}`, enabled ? 'success' : 'warn')
      return enabled === true
    })
  }

  // 列表功能
  await runTest('特性标志 - 列表功能', () => {
    const features = listEnabledFeatures()
    return features.length > 0
  })
}

// ============ 主函数 ============
async function main() {
  console.log('\n' + '🎉'.repeat(30))
  console.log('  Claude Code Enhancement - 完整测试套件')
  console.log('🎉'.repeat(30) + '\n')

  const target = process.argv[2]?.toLowerCase()

  // 根据参数运行特定测试或全部测试
  if (!target || target === 'all') {
    await testCoreModules()
    await testSmartShell()
    await testKairos()
    await testBuddyAI()
    await testCoordinator()
    await testFeatureFlags()
  } else if (target === 'core') {
    await testCoreModules()
  } else if (target === 'smart' || target === 'smartshell') {
    await testSmartShell()
  } else if (target === 'kairos') {
    await testKairos()
  } else if (target === 'buddy') {
    await testBuddyAI()
  } else if (target === 'coord' || target === 'coordinator') {
    await testCoordinator()
  } else if (target === 'flags' || target === 'feature') {
    await testFeatureFlags()
  } else {
    console.log(`❌ 未知测试模块: ${target}`)
    console.log('可用模块: core, smart, kairos, buddy, coord, flags, all')
    process.exit(1)
  }

  // 输出统计
  console.log('\n' + '='.repeat(60))
  console.log('📊 测试结果统计')
  console.log('='.repeat(60))
  console.log(`✅ 通过: ${stats.passed}`)
  console.log(`❌ 失败: ${stats.failed}`)
  console.log(`⚠️ 跳过: ${stats.skipped}`)
  console.log(`📈 总计: ${stats.passed + stats.failed + stats.skipped}`)
  console.log('='.repeat(60))

  if (stats.failed === 0) {
    console.log('\n🎉 所有测试通过!\n')
    process.exit(0)
  } else {
    console.log(`\n⚠️ ${stats.failed} 个测试失败\n`)
    process.exit(1)
  }
}

// 运行测试
main().catch(e => {
  console.error('测试运行时错误:', e)
  process.exit(1)
})
