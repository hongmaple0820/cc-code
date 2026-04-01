# 🐾 宠物模式使用指南

## ✅ 功能已完成！

宠物伴侣功能已经完全实现并集成到 Claude Code CLI 中。

**重要提示**：宠物功能已**始终启用**！

## 🚀 如何启动

### 方法 1：使用宠物启动脚本（推荐 - 会显示宠物精灵）
```bash
bun run start-with-buddy.ts
```
或直接在 Windows 上运行：
```bash
start-with-pet.bat
```

### 方法 2：手动设置环境变量
```bash
# Linux/Mac
export ENABLE_FULLSCREEN=1
bun run dev

# Windows PowerShell
$env:ENABLE_FULLSCREEN="1"
bun run dev

# Windows CMD
set ENABLE_FULLSCREEN=1
bun run dev
```

### 方法 3：直接运行（命令可用，但不显示宠物精灵）
```bash
bun run dev
```
这种方式 `/buddy` 命令仍然可用，只是不会在界面上显示宠物精灵。

## 🎮 使用宠物命令

启动 CLI 后，你可以使用以下命令：

```bash
/buddy hatch    # 孵化你的宠物
/buddy pet      # 抚摸宠物
/buddy status   # 查看宠物状态
```

## 🔧 实现细节

### 核心文件

1. **`src/commands/buddy/`** - Buddy 命令实现
   - `index.ts` - 命令注册和导出
   - `buddy.ts` - 命令逻辑（hatch/pet/status）

2. **`src/buddy/`** - 宠物系统核心
   - `companion.ts` - 宠物生成逻辑（物种、稀有度、属性）
   - `sprites.ts` - ASCII 精灵图渲染
   - `CompanionSprite.tsx` - React 动画组件
   - `types.ts` - 类型定义
   - `useBuddyNotification.tsx` - 通知系统

3. **`pet-cli.ts`** - 独立宠物 CLI
   - 可独立运行的宠物互动程序
   - 数据存储在 `~/.claude-pet.json`

### 关键修改

**`src/commands.ts`** - 移除特性开关：
```typescript
// 之前：依赖 feature flag
const buddy = feature('BUDDY') ? require(...).default : null

// 现在：始终启用
const buddy = require(...).default
```

### 宠物系统特性

- **18 种物种**: duck, goose, cat, dragon, octopus, owl, penguin, turtle, snail, ghost, axolotl, capybara, cactus, robot, rabbit, mushroom, chonk, blob
- **5 种稀有度**: common (60%), uncommon (25%), rare (10%), epic (4%), legendary (1%)
- **5 种属性**: DEBUGGING, PATIENCE, CHAOS, WISDOM, SNARK
- **外观定制**: 6 种眼睛样式，7 种帽子装饰
- **闪光变异**: 1% 概率获得闪光效果 ✨

## 📝 注意事项

1. **宠物数据存储**
   - 宠物信息保存在 `~/.claude/config.json`
   - 包含名字、个性、孵化时间等

2. **宠物外观**
   - 基于你的用户 ID 确定性生成
   - 每次启动都是同一只宠物（除非重新孵化）

3. **独立宠物 CLI**
   - 如果你只想用宠物功能而不需要完整的 CLI
   - 可以使用 `bun run pet-cli.ts` 等独立脚本

## 🎉 开始使用

现在运行：
```bash
bun run dev
```

然后在 CLI 中输入：
```bash
/buddy hatch
```

享受你的编程伙伴吧！🐾
