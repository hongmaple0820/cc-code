# Claude Code Enhancement 测试指南

## 快速开始

### 1. 运行完整测试套件

```bash
bun run src/test-enhancement.ts
```

### 2. 运行特定模块测试

```bash
# 仅测试核心模块
bun run src/test-enhancement.ts core

# 仅测试 Smart Shell
bun run src/test-enhancement.ts smart

# 仅测试 Kairos
bun run src/test-enhancement.ts kairos

# 仅测试 Buddy AI
bun run src/test-enhancement.ts buddy

# 仅测试 Coordinator
bun run src/test-enhancement.ts coord

# 仅测试特性标志
bun run src/test-enhancement.ts flags
```

## 测试内容

### Core 模块测试
- ✅ DI Container - 依赖注入容器
- ✅ Event Bus - 事件总线系统

### Smart Shell 测试
- ✅ 危险命令检测 (rm -rf, dd, etc.)
- ✅ 高风险命令检测 (git push --force)
- ✅ 安全命令识别
- ✅ 高风险确认机制

### Kairos 测试
- ✅ 初始状态检查
- ✅ 激活/停用功能
- ✅ 观察功能
- ✅ 状态查询

### Buddy AI 测试
- ✅ 初始状态检查
- ✅ 激活/停用功能
- ✅ 情绪检测
- ✅ 生产力指标

### Coordinator 测试
- ✅ 特性标志检查
- ✅ 激活/停用功能
- ✅ 状态管理

### 特性标志测试
- ✅ ULTRAPLAN 启用状态
- ✅ COORDINATOR_MODE 启用状态
- ✅ KAIROS 启用状态
- ✅ BUDDY 启用状态
- ✅ SMART_SHELL 启用状态
- ✅ 列表功能

## 手动测试新命令

### Kairos 主动模式
```bash
/kairos on      # 激活主动模式
/kairos status  # 查看状态
/kairos off     # 关闭主动模式
```

### Buddy AI 增强
```bash
/buddy ai on     # 激活 AI 增强
/buddy ai stats  # 查看生产力统计
/buddy ai break  # 记录休息
/buddy ai off    # 关闭 AI 增强
```

### Coordinator 多智能体
```bash
/coordinator on     # 激活协调模式
/coordinator status # 查看状态
/coordinator off    # 关闭协调模式
```

### Ultraplan 深度规划
```bash
/ultraplan 实现用户认证系统  # 启动 30 分钟深度规划
```

## 环境变量测试

```bash
# 测试 Smart Shell
export CLAUDE_CODE_ENABLE_SMART_SHELL=1
bun run src/test-enhancement.ts smart

# 测试 Kairos
export CLAUDE_CODE_ENABLE_KAIROS=1
bun run src/test-enhancement.ts kairos

# 测试 Buddy
export CLAUDE_CODE_ENABLE_BUDDY=1
bun run src/test-enhancement.ts buddy
```

## 预期输出示例

```
🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉
  Claude Code Enhancement - 完整测试套件
🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉

============================================================
🧪 核心模块测试 (Core Modules)
============================================================

✅ [TEST] DI Container - 基础注册/解析 - 通过
✅ [TEST] DI Container - 单例模式 - 通过
✅ [TEST] Event Bus - 基础事件发布/订阅 - 通过
✅ [TEST] Event Bus - 一次性订阅 - 通过

============================================================
🧪 Smart Shell 测试
============================================================

✅ [TEST] 危险命令检测: "rm -rf /" - 通过
✅ [TEST] 危险命令检测: "sudo rm -rf /home" - 通过
...

============================================================
📊 测试结果统计
============================================================
✅ 通过: 35
❌ 失败: 0
⚠️ 跳过: 0
📈 总计: 35
============================================================

🎉 所有测试通过!
```

## 故障排除

### 导入错误
如果看到类似 `Cannot find module` 的错误，检查：
1. 是否在项目根目录运行
2. 文件路径是否正确

### 特性标志未启用
如果某些测试被跳过，检查 `src/core/featureFlags.ts` 中的 DEFAULT_FEATURES。

### 测试失败
如果测试失败，检查：
1. 模块是否正确导入
2. 环境变量是否设置正确
3. 依赖是否正确安装

## 添加新测试

在 `test-enhancement.ts` 中添加新的测试函数：

```typescript
async function testMyFeature(): Promise<void> {
  console.log('\n' + '='.repeat(60))
  console.log('🧪 我的功能测试')
  console.log('='.repeat(60) + '\n')

  await runTest('我的测试', () => {
    // 测试逻辑
    return true // 或 false
  })
}
```

然后在 `main()` 函数中调用它。
