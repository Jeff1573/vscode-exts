# VSCode Extensions Collection

这是一个 VSCode 扩展集合项目，包含多个实用的开发工具扩展。

## 项目列表

### 1. [Auto Commit Extension](auto-commit-ext/)
基于暂存区更改自动生成并填充 Git 提交信息的 VSCode 扩展。

**核心功能**：
- AI 智能生成 Conventional Commits 格式提交信息
- 启发式规则生成（无需 API Key）
- 支持 OpenAI / OpenRouter 等多种 AI 服务
- 一键填充提交信息到源代码管理面板

📖 [查看详细文档](auto-commit-ext/README.md)

---

### 2. Check Balance Droid
查看 Factory AI 余额使用情况的 VSCode 扩展。

**核心功能**：
- 实时查询 Factory AI API 余额
- 状态栏显示余额信息
- 可配置自动刷新间隔
- 快速设置 API Key

---

## 开发说明

每个子项目都是独立的 VSCode 扩展，具有各自的：
- 源代码目录 (`src/`)
- 配置文件 (`package.json`, `tsconfig.json`)
- 打包文件 (`.vsix`)

### 通用开发命令

```bash
# 安装依赖
npm install

# 编译 TypeScript
npm run compile

# 监听文件变化并自动编译
npm run watch

# 打包扩展
vsce package
```

## 许可证

MIT
