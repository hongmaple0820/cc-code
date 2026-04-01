# 🐾 宠物在 CLI 中的样子

## 界面布局

```
┌─────────────────────────────────────────────────────────────┐
│ Claude Code CLI                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ > You: 帮我写一个排序函数                                    │
│                                                             │
│ Claude: 好的，我来帮你写一个快速排序...                      │
│                                                             │
│ [代码输出区域]                                               │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────┐                                  │
│  │ 加油！你能搞定的！    │  ← 宠物说话气泡                   │
│  └─────┬────────────────┘                                  │
│        │                                                    │
│      __│__                                                  │
│    <(◉ )___   ← 你的宠物精灵（会动画）                       │
│     (  ._>                                                  │
│      `--´                                                   │
│                                                             │
│ > 输入你的问题...                                           │
└─────────────────────────────────────────────────────────────┘
```

## 互动示例

### 1. 孵化宠物
```bash
> /buddy hatch

🎉 Welcome your new companion!

Name: Chipbug
Species: duck
Rarity: uncommon ★★
Personality: Curious and playful, loves to peek at your code

Your companion will appear beside the input box. Try /buddy pet to interact!
```

### 2. 抚摸宠物
```bash
> /buddy pet

You pet Chipbug the duck! ❤️

Chipbug seems happy and appreciates the attention.

[宠物精灵上方会飘出爱心动画]
   ❤️    ❤️   
  ❤️  ❤️   ❤️  
 ❤️   ❤️  ❤️   
```

### 3. 查看状态
```bash
> /buddy status

Your Companion:

Name: Chipbug
Species: duck
Rarity: uncommon ★★
Eye style: ◉
Hat: propeller
Shiny: No
Personality: Curious and playful, loves to peek at your code
Hatched: 2024-01-15

Stats:
  DEBUGGING: 65
  PATIENCE: 30
  CHAOS: 45
  WISDOM: 20
  SNARK: 80
```

## 宠物行为

### 空闲动画序列
- 大部分时间：静止（frame 0）
- 偶尔：摆动/眨眼（frame 1-2）
- 随机：特殊动作

### 说话时机
- 你提问时
- 代码执行完成时
- 遇到错误时
- 随机闲聊

### 说话内容（基于属性）

**DEBUGGING 高的宠物：**
- "我注意到这里可能有个 bug..."
- "要不要检查一下边界条件？"
- "这个变量名有点混乱哦"

**PATIENCE 高的宠物：**
- "慢慢来，不着急"
- "深呼吸，一步一步来"
- "休息一下也不错"

**CHAOS 高的宠物：**
- "试试这个疯狂的想法！"
- "打破常规！"
- "来点刺激的！"

**WISDOM 高的宠物：**
- "考虑一下长远影响..."
- "这个设计模式可能更合适"
- "记住，简单就是美"

**SNARK 高的宠物：**
- "又是这个 bug？真有你的 😏"
- "这代码...嗯...很有创意"
- "我就静静看你表演"

## 特殊效果

### 稀有度颜色
- Common (普通): 白色 ⚪
- Uncommon (不常见): 绿色 🟢
- Rare (稀有): 蓝色 🔵
- Epic (史诗): 紫色 🟣
- Legendary (传说): 金色 🟡

### 闪光效果
- 稀有宠物可能是 Shiny（闪光）
- 闪光宠物有特殊视觉效果 ✨

### 帽子装饰
- propeller (螺旋桨)
- tophat (礼帽)
- wizard (巫师帽)
- tinyduck (小鸭子)
- crown (皇冠)
- 等等...

## 如何启用

在完整的 Claude Code CLI 中，宠物功能需要：

1. **启动 CLI**
   ```bash
   bun run launch-with-proxy.ts
   ```

2. **配置 API**（如果需要完整功能）
   ```bash
   export ANTHROPIC_API_KEY=your_key_here
   ```

3. **孵化宠物**
   ```bash
   /buddy hatch
   ```

4. **开始互动！**
   - 宠物会自动出现
   - 边写代码边和它聊天
   - 它会根据你的编程活动做出反应

## 宠物数据存储

宠物信息保存在：
- `~/.claude/config.json` 中的 `companion` 字段
- 包含：名字、个性、孵化时间
- 宠物外观由你的用户 ID 决定（确定性生成）

## 趣味事实

- 每个用户的宠物外观是唯一的（基于用户 ID）
- 传说级宠物只有 1% 概率
- 宠物的属性会影响它的"建议"
- 你可以给宠物改名（通过配置文件）
- 宠物会记住孵化时间，显示"年龄"
