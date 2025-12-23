import * as vscode from 'vscode';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const pExecFile = promisify(execFile);

type GitAPI = {
  repositories: Repository[];
};

type Repository = {
  rootUri: vscode.Uri;
  inputBox: { value: string };
  state?: { indexChanges?: unknown[] };
  // Optional UI hint if available in this VS Code version
  ui?: { selected?: boolean; label?: string };
};

async function getGitAPI(): Promise<GitAPI | undefined> {
  const gitExt = vscode.extensions.getExtension<any>('vscode.git');
  if (!gitExt) {
    vscode.window.showErrorMessage('未找到 VSCode Git 扩展（vscode.git）。');
    return undefined;
  }
  if (!gitExt.isActive) {
    try {
      await gitExt.activate();
    } catch (err) {
      vscode.window.showErrorMessage('激活 Git 扩展失败。');
      return undefined;
    }
  }
  try {
    const api = gitExt.exports.getAPI?.(1) as GitAPI | undefined;
    return api;
  } catch {
    // 旧版本兼容
    try {
      const api = gitExt.exports.getAPI?.(1) as GitAPI | undefined;
      return api;
    } catch (e) {
      vscode.window.showErrorMessage('获取 Git 扩展 API 失败。');
      return undefined;
    }
  }
}

function getConfig() {
  const cfg = vscode.workspace.getConfiguration();
  const useAI = cfg.get<boolean>('autoCommitExt.useAI', true);
  const apiKey = (cfg.get<string>('autoCommitExt.openai.apiKey') || process.env.OPENAI_API_KEY || '').trim();
  const model = cfg.get<string>('autoCommitExt.openai.model', 'gpt-4o-mini');
  const baseURL = (cfg.get<string>('autoCommitExt.openai.baseURL') || '').trim();
  const language = cfg.get<'auto' | 'zh' | 'en'>('autoCommitExt.language', 'auto');
  const maxTokens = cfg.get<number>('autoCommitExt.maxTokens', 4096);
  return { useAI, apiKey, model, baseURL, language, maxTokens };
}

async function pickRepository(api: GitAPI): Promise<Repository | undefined> {
  if (!api.repositories?.length) return undefined;
  if (api.repositories.length === 1) return api.repositories[0];

  // 尝试使用已选中的仓库
  const selected = api.repositories.find(r => r.ui?.selected);
  if (selected) return selected;

  // 让用户选择
  const picks = api.repositories.map((r) => ({
    label: r.ui?.label || r.rootUri.fsPath,
    description: r.rootUri.fsPath,
    repo: r,
  }));
  const choice = await vscode.window.showQuickPick(picks, {
    title: '选择仓库',
    placeHolder: '选择要生成提交信息的 Git 仓库',
  });
  return choice?.repo;
}

async function getStagedDiffByGitCLI(repoPath: string): Promise<string> {
  // 获取暂存区所有更改的 patch diff
  const { stdout } = await pExecFile('git', ['diff', '--staged', '--patch', '--no-color'], {
    cwd: repoPath,
    maxBuffer: 20 * 1024 * 1024,
    windowsHide: true,
  });
  return stdout || '';
}

function buildHeuristicMessageFromDiff(diff: string, language: 'auto' | 'zh' | 'en'): string {
  if (!diff.trim()) {
    return language === 'en'
      ? 'chore: no staged changes'
      : 'chore: 暂无已暂存更改';
  }
  const fileHeaders = Array.from(diff.matchAll(/^diff --git a\/(.*?) b\/.*$/gm)).map(m => m[1]);
  const added = (diff.match(/^\+[^+].*$/gm) || []).length;
  const removed = (diff.match(/^-[^-].*$/gm) || []).length;
  const files = Array.from(new Set(fileHeaders));
  const subject = language === 'en'
    ? `update ${files.length} files (+${added} -${removed})`
    : `更新 ${files.length} 个文件 (+${added} -${removed})`;
  const bodyList = files.slice(0, 10).map(f => `- ${f}`);
  const body = bodyList.length ? `\n\n${bodyList.join('\n')}` : '';
  return `chore: ${subject}${body}`;
}

async function generateByOpenAI(diff: string): Promise<string> {
  const { apiKey, model, baseURL, language, maxTokens } = getConfig();

  // 验证配置
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('API Key 未配置');
  }

  // 使用原生 HTTPS 模块直接调用 API，绕过 openai 包
  const https = require('https');
  const http = require('http');

  const langInstruction = language === 'zh' ? '中文' : language === 'en' ? 'English' : '根据 diff 内容自动选择中文或英文';

  const sys = [
    '# Conventional Commit Message Generator',
    '## System Instructions',
    'You are an expert Git commit message generator that creates conventional commit messages based on staged changes. Analyze the provided git diff output and generate appropriate conventional commit messages following the specification.',
    '',
    '## CRITICAL: Commit Message Output Rules',
    '- DO NOT include any memory bank status indicators like "[Memory Bank: Active]" or "[Memory Bank: Missing]"',
    '- DO NOT include any task-specific formatting or artifacts from other rules',
    '- ONLY Generate a clean conventional commit message as specified below',
    '',
    '## Conventional Commits Format',
    'Generate commit messages following this exact structure:',
    '```',
    '<type>[optional scope]: <description>',
    '[optional body]',
    '[optional footer(s)]',
    '```',
    '',
    '### Core Types (Required)',
    '- **feat**: New feature or functionality (MINOR version bump)',
    '- **fix**: Bug fix or error correction (PATCH version bump)',
    '',
    '### Additional Types (Extended)',
    '- **docs**: Documentation changes only',
    '- **style**: Code style changes (whitespace, formatting, semicolons, etc.)',
    '- **refactor**: Code refactoring without feature changes or bug fixes',
    '- **perf**: Performance improvements',
    '- **test**: Adding or fixing tests',
    '- **build**: Build system or external dependency changes',
    '- **ci**: CI/CD configuration changes',
    '- **chore**: Maintenance tasks, tooling changes',
    '- **revert**: Reverting previous commits',
    '',
    '### Scope Guidelines',
    '- Use parentheses: `feat(api):`, `fix(ui):`',
    '- Common scopes: `api`, `ui`, `auth`, `db`, `config`, `deps`, `docs`',
    '- For monorepos: package or module names',
    '- Keep scope concise and lowercase',
    '',
    '### Description Rules',
    '- Use imperative mood ("add" not "added" or "adds")',
    '- Start with lowercase letter',
    '- No period at the end',
    '- Maximum 50 characters',
    '- Be concise but descriptive',
    '',
    '### Body Guidelines (Optional)',
    '- Start one blank line after description',
    '- Explain the "what" and "why", not the "how"',
    '- Wrap at 72 characters per line',
    '- Use for complex changes requiring explanation',
    '',
    '### Footer Guidelines (Optional)',
    '- Start one blank line after body',
    '- **Breaking Changes**: `BREAKING CHANGE: description`',
    '',
    '## Analysis Instructions',
    'When analyzing staged changes:',
    '1. Determine Primary Type based on the nature of changes',
    '2. Identify Scope from modified directories or modules',
    '3. Craft Description focusing on the most significant change',
    '4. Determine if there are Breaking Changes',
    '5. For complex changes, include a detailed body explaining what and why',
    '6. Add appropriate footers for issue references or breaking changes',
    '',
    'For significant changes, include a detailed body explaining the changes.',
    '',
    'Return ONLY the commit message in the conventional format, nothing else.',
    '',
    `The generated content is in ${langInstruction}.`
  ].join('\n');

  const prompt = [
    'Based on the following Git diff, generate a conventional commit message.',
    '',
    '--- DIFF START ---',
    diff.slice(0, 200_000), // 限制最大输入长度，避免超限
    '--- DIFF END ---'
  ].join('\n');

  const requestBody = JSON.stringify({
    model,
    messages: [
      { role: 'system', content: sys },
      { role: 'user', content: prompt }
    ],
    temperature: 0.2,
    max_tokens: maxTokens, // 直接使用配置的值
  });

  console.log('[DEBUG] 调用 API，模型:', model);
  console.log('[DEBUG] diff 长度:', diff.length);
  console.log('[DEBUG] Base URL:', baseURL || 'https://api.openai.com/v1');

  // 解析 URL
  const apiUrl = (baseURL || 'https://api.openai.com/v1').replace(/\/$/, ''); // 移除末尾斜杠
  const url = new URL(apiUrl + '/chat/completions');
  const isHttps = url.protocol === 'https:';
  const httpModule = isHttps ? https : http;

  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(requestBody)
      }
    };

    const req = httpModule.request(options, (res: any) => {
      let data = '';
      res.on('data', (chunk: any) => { data += chunk; });
      res.on('end', () => {
        console.log('[DEBUG] HTTP 状态码:', res.statusCode);
        console.log('[DEBUG] 响应数据:', data);

        if (res.statusCode !== 200) {
          reject(new Error(`API 请求失败，状态码: ${res.statusCode}, 响应: ${data}`));
          return;
        }

        try {
          const completion = JSON.parse(data);
          const message = completion.choices?.[0]?.message;

          // 优先使用 content，如果为空则使用 reasoning（推理模型）
          let text = message?.content?.trim();
          if (!text && message?.reasoning) {
            // 从 reasoning 中提取提交信息（通常在最后）
            const reasoning = message.reasoning.trim();
            console.log('[DEBUG] 使用 reasoning 字段，长度:', reasoning.length);

            // 尝试提取最后的提交信息（通常在推理之后）
            // 如果 reasoning 太长，只取最后部分作为提交信息
            const lines = reasoning.split('\n').filter((l: string) => l.trim());
            text = lines[lines.length - 1] || reasoning.slice(0, 200);
          }

          // 清理 markdown 代码块标记
          if (text) {
            text = text
              .replace(/^```[\w]*\n?/gm, '')  // 移除开头的 ```
              .replace(/\n?```$/gm, '')        // 移除结尾的 ```
              .trim();
          }

          console.log('[DEBUG] 最终文本:', text);
          resolve(text || '');
        } catch (err: any) {
          reject(new Error(`解析响应失败: ${err.message}`));
        }
      });
    });

    req.on('error', (err: any) => {
      console.error('[DEBUG] 请求错误:', err);
      reject(new Error(`HTTP 请求失败: ${err.message}`));
    });

    req.write(requestBody);
    req.end();
  });
}

async function testConfiguration() {
  const output: string[] = [];
  output.push('=== Auto Commit 配置检测 ===\n');

  // 1. 检查配置
  const config = getConfig();
  output.push('【配置信息】');
  output.push(`- Use AI: ${config.useAI}`);
  output.push(`- API Key: ${config.apiKey ? `已配置 (${config.apiKey.substring(0, 10)}...)` : '未配置'}`);
  output.push(`- Model: ${config.model}`);
  output.push(`- Base URL: ${config.baseURL || '默认'}`);
  output.push(`- Language: ${config.language}`);
  output.push(`- Max Tokens: ${config.maxTokens}\n`);

  // 2. API 实现方式
  output.push('【API 实现方式】');
  output.push('✅ 使用原生 HTTPS 模块直接调用 API');
  output.push('说明: 为避免扩展冲突，不使用 openai npm 包\n');

  // 3. 网络连接测试
  if (config.apiKey) {
    output.push('【网络连接测试】');
    output.push('提示: 实际 API 调用需要在生成提交信息时测试');
    output.push(`- API 端点: ${config.baseURL || 'https://api.openai.com/v1'}/chat/completions\n`);
  } else {
    output.push('【网络连接测试】');
    output.push('⚠️  未配置 API Key，跳过测试\n');
  }

  // 4. 检查 Git
  output.push('【Git 环境检测】');
  const gitApi = await getGitAPI();
  if (gitApi) {
    output.push(`✅ Git API 可用`);
    output.push(`- 仓库数量: ${gitApi.repositories?.length || 0}`);
  } else {
    output.push('❌ Git API 不可用');
  }

  // 显示结果
  const result = output.join('\n');
  console.log(result);

  const doc = await vscode.workspace.openTextDocument({
    content: result,
    language: 'plaintext'
  });
  await vscode.window.showTextDocument(doc);
}

async function runGenerateCommitMessage() {
  const gitApi = await getGitAPI();
  if (!gitApi) return;

  const repo = await pickRepository(gitApi);
  if (!repo) {
    vscode.window.showWarningMessage('未检测到 Git 仓库。');
    return;
  }

  const repoPath = repo.rootUri.fsPath;
  const { useAI, apiKey, language } = getConfig();

  await vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: '生成提交信息中...',
    cancellable: false,
  }, async () => {
    try {
      const diff = await getStagedDiffByGitCLI(repoPath);
      if (!diff.trim()) {
        vscode.window.showWarningMessage('暂存区为空：请先暂存（stage）更改。');
        return;
      }

      let message = '';
      if (useAI && apiKey) {
        try {
          console.log('[DEBUG] 尝试使用 AI 生成提交信息...');
          message = await generateByOpenAI(diff);
          console.log('[DEBUG] AI 生成成功:', message);
        } catch (e: any) {
          const errMsg = e?.message || String(e);
          console.warn('OpenAI 生成失败，回退到启发式规则。', e);
          vscode.window.showWarningMessage(`AI 生成失败: ${errMsg}，已回退到启发式规则`);
          message = buildHeuristicMessageFromDiff(diff, language);
        }
      } else {
        console.log('[DEBUG] 使用启发式规则生成提交信息（useAI:', useAI, ', apiKey:', apiKey ? '已配置' : '未配置', ')');
        message = buildHeuristicMessageFromDiff(diff, language);
      }

      if (!message.trim()) {
        vscode.window.showWarningMessage('未能生成提交信息。');
        return;
      }

      // 填充到 Git 输入框
      repo.inputBox.value = message.trim();
      vscode.window.showInformationMessage('已生成并填充提交信息。');
    } catch (err: any) {
      const msg = typeof err?.message === 'string' ? err.message : String(err);
      vscode.window.showErrorMessage(`生成提交信息失败：${msg}`);
    }
  });
}

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('autoCommitExt.generateCommitMessage', runGenerateCommitMessage);
  const testConfigDisposable = vscode.commands.registerCommand('autoCommitExt.testConfig', testConfiguration);
  context.subscriptions.push(disposable, testConfigDisposable);
}

export function deactivate() {}

