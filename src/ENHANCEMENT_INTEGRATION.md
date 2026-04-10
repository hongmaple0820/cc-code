# Claude Code 增强功能集成指南

## 概述

本文档说明如何将 Phase 1-3 实现的新功能集成到 Claude Code 主应用中。

## 新增功能模块

### 1. Core 微内核架构

**位置:** `src/core/`

- **DI Container** - 依赖注入系统
- **Event Bus** - 事件总线
- **Feature Flags** - 特性标志管理
- **Plugin Manager** - 插件系统
- **Service Registry** - 服务注册表

### 2. 功能模块

**位置:** `src/modules/`

- **Kairos** - 主动助手模式
- **Buddy AI** - 增强宠物系统
- **Smart Shell** - 智能命令行

### 3. 重构的命令系统

**位置:** `src/commands/`

- `registry.ts` - 命令注册中心
- `loader.ts` - 命令加载器
- `filters.ts` - 过滤器
- `safety.ts` - 安全命令
- `utils.ts` - 工具函数
- `coordinator/index.ts` - 协调器命令

## 集成步骤

### 步骤 1: 更新主入口文件

在 `src/main.tsx` 中添加新模块初始化：

```typescript
import { container, serviceRegistry, eventBus } from './core/index.js'
import { kairosEngine, buddyAI, smartShell } from './modules/index.js'
import { FEATURES } from './core/featureFlags.js'

// Initialize core services
async function initializeCore() {
  // Register services
  serviceRegistry.register({
    name: 'kairos',
    service: kairosEngine,
    priority: 10,
    autoStart: FEATURES.KAIROS,
  })

  serviceRegistry.register({
    name: 'buddy',
    service: buddyAI,
    priority: 5,
    autoStart: FEATURES.BUDDY,
  })

  serviceRegistry.register({
    name: 'smartshell',
    service: smartShell,
    priority: 8,
    autoStart: FEATURES.enabled,
  })

  // Start all auto-start services
  await serviceRegistry.startAll()
}
```

### 步骤 2: 启用 Ultraplan

在 `src/commands/ultraplan.tsx` 中，特性标志已更新为默认启用：

```typescript
// 已修改为始终启用
const ultraplan = require('./ultraplan.js').default
```

### 步骤 3: 启用 Coordinator

协调器模式现在通过命令和特性标志启用：

```bash
# 启动时启用
export CLAUDE_CODE_COORDINATOR_MODE=1
claude

# 或使用命令
/coordinator
```

### 步骤 4: 集成 Kairos 主动模式

在 `src/proactive/useProactive.ts` 中替换为新实现：

```typescript
import { kairosEngine, type KairosObservation } from '../modules/kairos/KairosEngine.js'

// 在适当位置调用观察
kairosEngine.observe('code_change', {
  filePath,
  timestamp: Date.now(),
}, 0.7)
```

### 步骤 5: 集成 Buddy AI

在 `src/buddy/companion.ts` 中：

```typescript
import { buddyAI } from '../modules/buddy/BuddyAI.js'

// 监听事件
buddyAI.analyzeUserInput(userInput)

// 获取反应
const reaction = buddyAI.getCelebrationReaction()
```

### 步骤 6: 集成 Smart Shell

在 `src/tools/BashTool` 中：

```typescript
import { smartShell } from '../modules/smartshell/SmartShell.js'

// 执行前检查风险
const risk = smartShell.analyzeRisk(command)
if (risk.requiresConfirmation) {
  // 显示确认提示
  console.log(smartShell.getConfirmationMessage(command))
}

// 输出摘要
const summary = smartShell.summarizeOutput(output, 50)
```

### 步骤 7: 事件系统集成

所有模块通过事件总线通信：

```typescript
import { eventBus, EventTypes } from './core/index.js'

// 监听事件
eventBus.on(EventTypes.TOOL_COMPLETED, (data) => {
  // 更新 UI
})

eventBus.on(EventTypes.KAIROS_SUGGESTION, (data) => {
  // 显示建议
})
```

## 配置选项

### 环境变量

```bash
# 禁用特定功能
export CLAUDE_CODE_DISABLE_ULTRAPLAN=1
export CLAUDE_CODE_DISABLE_COORDINATOR=1

# 启用实验性功能
export CLAUDE_CODE_ENABLE_VOICE=1
export CLAUDE_CODE_ENABLE_DAEMON=1
```

### 运行时配置

```typescript
// 配置 Kairos
kairosEngine.updateConfig({
  tickInterval: 15000,
  enableAutoActions: false,
  briefMode: false,
})

// 配置 Buddy
buddyAI.updateConfig({
  emotionDetection: true,
  breakReminders: true,
  celebrationEnabled: true,
})

// 配置 Smart Shell
smartShell.updateConfig({
  safeMode: true,
  maxSummaryLines: 100,
  dangerousCommandsRequireConfirm: true,
})
```

## API 使用示例

### Kairos 主动模式

```typescript
// 激活
kairosEngine.activate()

// 手动观察
kairosEngine.observe('user_frustration', {
  userInput: 'this is not working',
  timestamp: Date.now(),
}, 0.8)

// 创建任务
const task = kairosEngine.createTask('Refactor auth module', 5)
```

### Buddy AI

```typescript
// 分析用户情绪
const reaction = buddyAI.analyzeUserInput('Finally fixed that bug!')
if (reaction) {
  showAnimation(reaction.animation)
}

// 庆祝成就
const celebration = buddyAI.celebrateAchievement('test_passed')
showAnimation(celebration.animation, celebration.message)

// 检查代码质量
const quality = buddyAI.reflectCodeQuality({
  complexity: 15,
  testCoverage: 30,
  lintErrors: 5,
  typeErrors: 2,
  maintainability: 60,
})
```

### Smart Shell

```typescript
// 分析风险
const risk = smartShell.analyzeRisk('rm -rf /')
if (risk.level === 'critical') {
  console.log('DANGER:', risk.mitigation)
}

// 预测命令
const predictions = smartShell.predictNext()
predictions.forEach(p => {
  console.log(`${p.confidence * 100}%: ${p.command}`)
})

// 摘要输出
const summary = smartShell.summarizeOutput(longOutput, 30)
console.log(summary.summary)
```

## 测试

### 运行测试

```bash
# 单元测试
npm test -- --testPathPattern=core

# 集成测试
npm test -- --testPathPattern=modules

# E2E 测试
npm test -- --testPathPattern=e2e
```

### 手动测试

```bash
# 测试 Kairos
claude
/kairos status

# 测试 Coordinator
claude --coordinator
/coordinator workers

# 测试 Smart Shell
rm -rf test_folder  # 应该显示确认提示
```

## 性能考虑

- **Kairos** - tick 间隔默认为 15 秒，可调节
- **Buddy** - 情绪检测使用简单正则，开销低
- **Smart Shell** - 命令历史限制 1000 条，防止内存泄漏
- **事件总线** - 历史记录限制 1000 条

## 故障排除

### Kairos 未激活

```typescript
console.log(kairosEngine.isActive()) // 应为 true
console.log(kairosEngine.getConfig())
```

### Smart Shell 未拦截命令

```typescript
console.log(smartShell.getConfig())
console.log(smartShell.analyzeRisk('rm -rf /'))
```

### 服务未启动

```typescript
console.log(serviceRegistry.getSystemStatus())
```

## 后续增强

1. **可视化调试器** - 集成到 `src/modules/debugger/`
2. **Agent 市场** - 扩展插件系统
3. **本地模型集成** - 添加到 `src/adapters/llm/`
4. **团队协作** - 扩展 `src/modules/collaboration/`
