# Claude Code CLI

基于 TypeScript 的 AI 辅助开发命令行工具，提供智能代码编辑、任务管理、多 Agent 协作等功能。

## 项目概述

Claude Code 是一个功能完整的 CLI 工具，集成了 AI 能力、终端 UI、工具系统和插件架构，支持本地和远程开发场景。

**技术栈**
- TypeScript + React (Ink 终端渲染)
- Bun 运行时
- MCP (Model Context Protocol) 集成
- 1,987+ 源文件，模块化架构

## 环境要求

- Bun ≥ 1.3.5
- Node.js ≥ 24

## 快速开始

```bash
# 1. 安装依赖
bun install

# 2. 启动 CLI
bun run dev

# 3. 验证安装
bun run version
```

## 项目架构

### 目录结构

```
├── src/                    # 核心源码
│   ├── main.tsx            # CLI 主入口
│   ├── dev-entry.ts        # 开发入口
│   ├── commands/           # 命令实现 (100+)
│   ├── tools/              # 工具系统 (50+)
│   ├── components/         # 终端 UI 组件 (React + Ink)
│   ├── services/           # 核心服务 (API/MCP/分析)
│   ├── hooks/              # React Hooks
│   ├── utils/              # 工具函数
│   ├── coordinator/        # 多 Agent 协调
│   ├── plugins/            # 插件系统
│   └── bridge/             # 远程桥接
├── shims/                  # 兼容性模块
└── vendor/                 # 原生绑定
```

### 启动流程

```
CLI 入口 (entrypoints/cli.tsx)
    ↓
主程序 (main.tsx)
    ↓
初始化 (auth/MCP/settings)
    ↓
REPL 渲染 (终端交互界面)
```

## 核心功能

### 🐾 宠物伴侣系统 (Buddy System)

项目内置了一个有趣的宠物伴侣系统，可以在 CLI 中陪伴你编程。

**测试宠物系统（无需 API）**
```bash
bun run test-buddy-full.ts
```

**在 CLI 中使用**
```bash
# 启动带宠物功能的 CLI
bun run launch-with-proxy.ts

# 在 CLI 中使用命令
/buddy hatch    # 孵化获取宠物
/buddy pet      # 抚摸宠物
/buddy status   # 查看宠物状态
```

**宠物特性**
- 18 种物种：duck, goose, blob, cat, dragon, octopus, owl, penguin, turtle, snail, ghost, axolotl, capybara, cactus, robot, rabbit, mushroom, chonk
- 5 种稀有度：
  - common (60%)
  - uncommon (25%)
  - rare (10%)
  - epic (4%)
  - legendary (1%)
- 随机属性：DEBUGGING, PATIENCE, CHAOS, WISDOM, SNARK
- 个性化：随机名字、性格、眼睛样式、帽子配饰

### 1. 工具系统 (50+ 工具)

**文件操作**
- 文件读写、编辑、搜索 (FileReadTool, FileWriteTool, GrepTool)
- 全局文件匹配 (GlobTool)

**代码执行**
- 多 Shell 支持 (BashTool, PowerShellTool)
- REPL 交互 (REPLTool)
- Notebook 编辑 (NotebookEditTool)

**网络功能**
- Web 抓取与搜索 (WebFetchTool, WebSearchTool)
- 浏览器自动化 (WebBrowserTool)

**AI 协作**
- 多 Agent 协调 (AgentTool, TeamCreateTool)
- 消息传递 (SendMessageTool)

**任务管理**
- 任务 CRUD (TaskCreateTool, TaskListTool, TaskUpdateTool)
- 任务控制 (TaskStopTool)

**MCP 集成**
- MCP 工具调用 (MCPTool)
- 资源管理 (ListMcpResourcesTool, ReadMcpResourceTool)
- 认证 (McpAuthTool)

**工作流**
- 计划模式 (EnterPlanModeTool, ExitPlanModeTool)
- Worktree 管理 (EnterWorktreeTool, ExitWorktreeTool)
- 定时任务 (ScheduleCronTool)

### 2. 服务层

**API 服务** (`src/services/api/`)
- Anthropic API 客户端
- 请求重试与速率限制
- 用量追踪

**MCP 服务** (`src/services/mcp/`)
- MCP 客户端/服务端
- OAuth 认证
- 通道管理

**分析服务** (`src/services/analytics/`)
- 特性开关 (GrowthBook)
- 事件日志 (Datadog)

**会话管理** (`src/services/compact/`)
- 自动压缩策略
- 上下文优化

### 3. UI 系统

**终端渲染** (`src/ink/`)
- 自定义 Ink 渲染引擎
- 布局与焦点管理
- ANSI 渲染
- 虚拟滚动

**组件库** (`src/components/`, 148 文件)
- 消息显示
- 输入框
- Diff 视图
- 权限对话框
- 状态栏

**交互模式**
- Vim 键绑定 (`src/vim/`)
- 快捷键系统 (`src/keybindings/`)

### 4. 扩展能力

- **插件系统** (`src/plugins/`) - 可扩展功能模块
- **技能系统** (`src/skills/`) - 预定义能力集
- **语音交互** (`src/voice/`) - 语音输入输出
- **远程会话** (`src/remote/`) - 远程开发支持
- **IDE 集成** (`src/server/`) - 编辑器直连

## 开发指南

### API 配置

项目支持多种 API 认证方式（按优先级排序）：

1. **环境变量** `ANTHROPIC_API_KEY`
   ```bash
   export ANTHROPIC_API_KEY=your_api_key_here
   bun run dev
   ```

2. **配置文件** `~/.claude/settings.json`
   ```json
   {
     "apiKeyHelper": "/path/to/your/api_key_script.sh"
   }
   ```

3. **OAuth 认证** - 通过 `CLAUDE_CODE_OAUTH_TOKEN` 环境变量

4. **macOS Keychain** - 自动从系统钥匙串读取

配置目录默认为 `~/.claude/`，可通过 `CLAUDE_CONFIG_DIR` 环境变量自定义。

### 开发命令

```bash
# 安装依赖
bun install

# 启动开发模式
bun run dev

# 验证版本
bun run version
```

### 代码规范

- TypeScript + ESM 模块
- 命名约定：
  - camelCase: 变量和函数
  - PascalCase: React 组件和类
  - kebab-case: 命令文件夹
- 单引号，部分文件省略分号
- 小而专注的模块设计

### 测试方法

项目暂无统一测试套件，建议：
1. 运行 `bun run dev` 验证 CLI 启动
2. 运行 `bun run version` 验证版本输出
3. 针对修改的功能进行手动测试

### 技术说明

本项目为重构版本，部分原生模块使用 `shims/` 目录中的兼容实现替代。开发时请注意兼容性处理。

### 所有权/隶属关系免责声明
本仓库不声称拥有 Claude Code 原始源代码的所有权。
本仓库与 Anthropic 公司没有任何关联，也未获得其认可或维护。