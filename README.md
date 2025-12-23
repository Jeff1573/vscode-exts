# Auto Commit Message

基于暂存区更改自动生成并填充 Git 提交信息的 VSCode 扩展。

## 核心功能

- AI 智能生成 Conventional Commits 格式提交信息
- 启发式规则生成（无需 API Key）
- 支持 OpenAI / OpenRouter 等多种 AI 服务
- 一键填充提交信息到源代码管理面板

## 安装

1. 下载 `.vsix` 文件
2. 在 VSCode 中按 `Ctrl+Shift+P`，输入 `Install from VSIX`
3. 选择下载的 `.vsix` 文件

## 配置

在 VSCode 设置中搜索 `Auto Commit Ext`：

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `autoCommitExt.useAI` | 是否使用 AI 生成提交信息 | `true` |
| `autoCommitExt.openai.apiKey` | OpenAI API Key | 空（读取环境变量） |
| `autoCommitExt.openai.model` | 模型名称 | `gpt-4o-mini` |
| `autoCommitExt.openai.baseURL` | 自定义 Base URL | 空 |
| `autoCommitExt.language` | 语言偏好（auto/zh/en） | `auto` |
| `autoCommitExt.maxTokens` | 生成最大 tokens | `4096` |

## 使用方法

1. 在源代码管理面板暂存更改
2. 点击源代码管理标题栏的魔法棒图标，或执行命令 `Auto Commit: 生成提交信息`
3. 等待生成完成，提交信息将自动填充到输入框

## 开发

```bash
# 安装依赖
npm install

# 编译
npm run compile

# 监听文件变化
npm run watch

# 打包扩展
npm run package
```

## 许可证

MIT
