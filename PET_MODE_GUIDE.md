# 宠物模式体验指南

## 项目当前状态

这是一个**恢复的 Claude Code 源码项目**，主要用于：
- 代码恢复和研究
- 功能分析和学习
- 不是完整可运行的生产环境

## 为什么无法正常体验宠物模式

1. **需要 API 配置**：项目需要连接 Anthropic API 或兼容的代理服务
2. **Feature Flag 控制**：宠物模式由 `BUDDY` feature flag 控制
3. **缺少运行时环境**：某些原生模块只在 macOS 上工作

## 宠物模式代码分析

### 核心文件

```
src/buddy/
├── companion.ts          # 宠物数据生成逻辑
├── CompanionSprite.tsx   # 宠物渲染组件
├── sprites.ts            # 精灵图绘制
├── types.ts              # 类型定义
└── useBuddyNotification.tsx  # 通知系统
```

### 宠物种类 (18 种)
- duck, goose, blob, cat, dragon, octopus
- owl, penguin, turtle, snail, ghost, axolotl
- capybara, cactus, robot, rabbit, mushroom, chonk

### 稀有度
| 稀有度 | 概率 | 颜色 |
|--------|------|------|
| common | 60% | inactive |
| uncommon | 25% | success |
| rare | 10% | permission |
| epic | 4% | autoAccept |
| legendary | 1% | warning |

### 互动命令
- `/buddy pet` - 抚摸宠物（会显示爱心动画）
- 直接称呼宠物名字 - 宠物会在气泡中回应
- 配置静音 - `companionMuted: true`

## 如何真正体验宠物模式

### 选项 1：使用官方 Claude Code（推荐）
```bash
npm install -g @anthropic-ai/claude-code
claude
```

宠物功能会在满足条件时自动启用（feature flag 控制）。

### 选项 2：修复本项目继续开发

需要完成的工作：
1. 配置有效的 API 端点
2. 启用 BUDDY feature flag
3. 创建 companion 配置

## 本项目已实现的功能

✅ 版本命令 (`bun run launch.ts --version`)
✅ 帮助命令 (`bun run launch.ts --help`)
✅ 宠物系统完整代码
✅ shims 原生模块兼容层

## 下一步

如果你想继续修复这个项目以体验宠物模式，需要：
1. 配置有效的 API 密钥或服务
2. 修改 feature flag 设置
3. 添加 companion 孵化逻辑
