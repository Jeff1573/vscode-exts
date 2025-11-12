# Auto Commit Message

基于暂存区更改自动生成并填充 Git 提交信息的 VSCode 扩展。

## 功能特性

- ✅ **AI 智能生成**：使用 OpenAI API 生成高质量的 Conventional Commits 格式提交信息
- ✅ **启发式规则**：无需配置 API Key 也能使用基于规则的提交信息生成
- ✅ **双模式支持**：AI 模式失败时自动降级到启发式规则
- ✅ **一键填充**：点击魔法棒图标或运行命令即可自动填充提交信息
- ✅ **多语言支持**：支持中文、英文或自动检测
- ✅ **自定义配置**：支持自定义 API 端点、模型、语言等

## 使用方法

### 方式 1：使用图标按钮
1. 在源代码管理面板暂存更改
2. 点击源代码管理标题栏的 **魔法棒图标** ✨
3. 提交信息自动填充到输入框

### 方式 2：使用命令
1. 按 `Ctrl+Shift+P` 打开命令面板
2. 输入 "Auto Commit: 生成提交信息"
3. 提交信息自动填充

## 配置说明

### AI 模式配置

打开设置（`Ctrl+,`），搜索 "Auto Commit"：

- **Use AI**: 是否启用 AI 生成（默认：true）
- **OpenAI API Key**: OpenAI API 密钥
- **OpenAI Model**: 使用的模型（默认：gpt-4o-mini）
- **OpenAI Base URL**: 自定义 API 端点（支持 OpenRouter 等代理）
- **Language**: 提交信息语言（auto/zh/en）
- **Max Tokens**: 生成最大 tokens（默认：4096，推理模型建议 2048 以上）

### 示例配置（使用 OpenRouter）

```json
{
  "autoCommitExt.useAI": true,
  "autoCommitExt.openai.apiKey": "sk-or-v1-...",
  "autoCommitExt.openai.baseURL": "https://openrouter.ai/api/v1",
  "autoCommitExt.openai.model": "minimax/minimax-m2:free",
  "autoCommitExt.language": "auto",
  "autoCommitExt.maxTokens": 4096
}
```

## 提交信息格式

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型

- `feat`: 新功能
- `fix`: 缺陷修复
- `refactor`: 重构
- `perf`: 性能优化
- `docs`: 文档更新
- `test`: 测试相关
- `build`: 构建系统
- `ci`: CI 配置
- `chore`: 其他杂项

## 诊断工具

运行命令 "Auto Commit: 检测配置" 可以查看：
- 当前配置信息
- API 实现方式
- 网络连接状态
- Git 环境状态

## 目录结构

```
auto-commit-ext/
├── .vscode/                # VSCode 调试配置
│   ├── launch.json        # 启动调试配置
│   └── tasks.json         # 任务配置
├── src/                   # 源代码目录
│   └── extension.ts       # 扩展主入口文件
├── out/                   # 编译输出目录（TypeScript 编译后的 JavaScript 文件）
├── node_modules/          # npm 依赖包
├── .gitignore            # Git 忽略文件配置
├── .vscodeignore         # VSCode 打包时忽略的文件配置
├── package.json          # 扩展清单和依赖配置
├── package-lock.json     # npm 依赖锁定文件
├── tsconfig.json         # TypeScript 编译配置
├── README.md             # 项目说明文档
└── auto-commit-ext-0.0.1.vsix  # 打包后的扩展文件
```

### 核心文件说明

- **[src/extension.ts](src/extension.ts)**: 扩展的主要逻辑，包含 AI 生成、启发式规则、Git 操作等功能
- **[package.json](package.json)**: 定义扩展的命令、配置项、激活事件等元数据
- **[tsconfig.json](tsconfig.json)**: TypeScript 编译器配置，控制编译行为和输出
- **[.vscode/launch.json](.vscode/launch.json)**: 用于在扩展开发宿主中调试扩展

## 许可证

MIT

