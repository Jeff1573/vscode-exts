# Check Balance Droid

实时查看 Factory AI 余额使用情况的 VSCode 扩展。

## 功能特性

- ✅ **状态栏显示**：实时显示 Factory AI 余额使用比例
- ✅ **详细统计**：查看 Standard 和 Premium 计划的完整用量信息
- ✅ **自动刷新**：可配置自动刷新间隔（1-60 分钟）
- ✅ **快捷设置**：便捷的 API Key 配置流程
- ✅ **用量分析**：显示用户使用、组织总用、超额使用等详细数据

## 使用方法

### 首次使用

1. **设置 API Key**
   - 打开命令面板 (`Ctrl+Shift+P`)
   - 输入 "Set Factory AI API Key"
   - 输入从 [Factory AI](https://app.factory.ai) 获取的 API Key

2. **查看余额**
   - 点击右下角状态栏的余额图标 `$(database) XX%`
   - 或运行命令 "Check Balance"

### 状态栏图标说明

- `$(database) XX%`: 显示当前余额使用比例
- `$(warning) Factory AI - 未设置 Key`: 未配置 API Key
- `$(error) Factory AI - 获取失败`: 获取余额失败

## 配置说明

打开设置（`Ctrl+,`），搜索 "Check Balance Droid"：

### 配置项

- **API Key**: Factory AI API 密钥
  - 从 [Factory AI 控制台](https://app.factory.ai) 获取
  - 建议使用设置命令安全输入（不显示明文）

- **Refresh Interval**: 自动刷新间隔
  - 范围：1-60 分钟
  - 默认：5 分钟
  - 设置为较小值会增加 API 调用频率

### 示例配置

```json
{
  "checkBalanceDroid.apiKey": "your-api-key-here",
  "checkBalanceDroid.refreshInterval": 5
}
```

## 余额详情说明

点击状态栏图标后会展示详细的用量统计：

### Standard 计划
- **用户使用**: 当前用户消耗的 tokens
- **组织总用**: 整个组织消耗的 tokens
- **超额使用**: 超出基础额度的部分
- **基础额度**: 计划包含的基础 tokens 额度
- **总额度**: 基础额度 + 超额限制
- **超额限制**: 允许的最大超额使用量
- **使用比例**: 当前使用量占总额度的百分比

### Premium 计划
显示字段与 Standard 计划相同

### 时间范围
显示当前统计周期的起止日期

## 目录结构

```
check-balance-droid/
├── .vscode/                # VSCode 调试配置
│   ├── launch.json        # 启动调试配置
│   └── tasks.json         # 任务配置
├── src/                   # 源代码目录
│   └── extension.ts       # 扩展主入口文件
├── out/                   # 编译输出目录
├── node_modules/          # npm 依赖包
├── .gitignore            # Git 忽略文件配置
├── package.json          # 扩展清单和依赖配置
├── package-lock.json     # npm 依赖锁定文件
├── tsconfig.json         # TypeScript 编译配置
├── README.md             # 项目说明文档
└── check-balance-droid-0.0.1.vsix  # 打包后的扩展文件
```

## 开发说明

### 技术栈

- TypeScript
- VSCode Extension API
- Axios（HTTP 客户端）

### 开发命令

```bash
# 安装依赖
npm install

# 编译
npm run compile

# 监听模式（开发时使用）
npm run watch

# 代码检查
npm run lint

# 打包扩展
vsce package
```

### 调试

1. 在 VSCode 中打开项目
2. 按 `F5` 启动扩展开发宿主
3. 在新窗口中测试扩展功能

## API 说明

扩展使用 Factory AI 官方 API：

- **端点**: `https://app.factory.ai/api/organization/members/chat-usage`
- **认证**: Bearer Token
- **响应**: JSON 格式的用量统计数据

## 注意事项

- API Key 存储在 VSCode 全局配置中
- 建议定期检查余额避免服务中断
- 网络异常时会显示错误提示
- API Key 无效时会提示重新设置

## 许可证

MIT
