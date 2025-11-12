import * as vscode from 'vscode';
import axios from 'axios';

interface UsageData {
  usage: {
    startDate: number;
    endDate: number;
    standard: {
      userTokens: number;
      orgTotalTokensUsed: number;
      orgOverageUsed: number;
      basicAllowance: number;
      totalAllowance: number;
      orgOverageLimit: number;
      usedRatio: number;
    };
    premium: {
      userTokens: number;
      orgTotalTokensUsed: number;
      orgOverageUsed: number;
      basicAllowance: number;
      totalAllowance: number;
      orgOverageLimit: number;
      usedRatio: number;
    };
  };
}

let statusBarItem: vscode.StatusBarItem;
let globalContext: vscode.ExtensionContext;

export function activate(context: vscode.ExtensionContext) {
  globalContext = context;

  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );

  statusBarItem.command = 'check-balance-droid.checkBalance';
  statusBarItem.text = '$(database) Factory AI';
  statusBarItem.tooltip = '点击查看余额';
  statusBarItem.show();

  const checkBalanceCommand = vscode.commands.registerCommand(
    'check-balance-droid.checkBalance',
    async () => {
      await checkBalance();
    }
  );

  const setApiKeyCommand = vscode.commands.registerCommand(
    'check-balance-droid.setApiKey',
    async () => {
      const apiKey = await vscode.window.showInputBox({
        prompt: '请输入 Factory AI API Key',
        password: true,
        placeHolder: 'API Key',
        ignoreFocusOut: true
      });

      if (apiKey) {
        const config = vscode.workspace.getConfiguration('checkBalanceDroid');
        await config.update('apiKey', apiKey, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage('API Key 已保存');
        await updateStatusBar();
      }
    }
  );

  context.subscriptions.push(statusBarItem, checkBalanceCommand, setApiKeyCommand);

  context.globalState.setKeysForSync(['cachedUsageData', 'lastUpdateTimestamp']);

  updateStatusBar();

  let intervalId: NodeJS.Timeout;
  let syncCheckIntervalId: NodeJS.Timeout;

  const startRefreshInterval = () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
    const config = vscode.workspace.getConfiguration('checkBalanceDroid');
    const refreshInterval = config.get<number>('refreshInterval') || 1;
    intervalId = setInterval(() => {
      updateStatusBar();
    }, refreshInterval * 60 * 1000);
  };

  const startSyncCheckInterval = () => {
    if (syncCheckIntervalId) {
      clearInterval(syncCheckIntervalId);
    }

    let lastKnownTimestamp = context.globalState.get<number>('lastUpdateTimestamp', 0);

    syncCheckIntervalId = setInterval(() => {
      const currentTimestamp = context.globalState.get<number>('lastUpdateTimestamp', 0);
      if (currentTimestamp > lastKnownTimestamp) {
        lastKnownTimestamp = currentTimestamp;
        updateStatusBarFromCache();
      }
    }, 1000);
  };

  startRefreshInterval();
  startSyncCheckInterval();

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('checkBalanceDroid.refreshInterval')) {
        startRefreshInterval();
      }
      if (e.affectsConfiguration('checkBalanceDroid.apiKey')) {
        updateStatusBar();
      }
    }),
    {
      dispose: () => {
        if (intervalId) {
          clearInterval(intervalId);
        }
        if (syncCheckIntervalId) {
          clearInterval(syncCheckIntervalId);
        }
      }
    }
  );
}

async function getApiKey(): Promise<string | undefined> {
  const config = vscode.workspace.getConfiguration('checkBalanceDroid');
  const apiKey = config.get<string>('apiKey');

  if (!apiKey) {
    const choice = await vscode.window.showWarningMessage(
      '未设置 API Key',
      '立即设置'
    );

    if (choice === '立即设置') {
      await vscode.commands.executeCommand('check-balance-droid.setApiKey');
      return config.get<string>('apiKey');
    }

    return undefined;
  }

  return apiKey;
}

async function fetchUsageData(apiKey: string): Promise<UsageData | null> {
  try {
    const response = await axios.get<UsageData>(
      'https://app.factory.ai/api/organization/members/chat-usage',
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        },
        timeout: 10000
      }
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        vscode.window.showErrorMessage('API Key 无效，请重新设置');
      } else {
        vscode.window.showErrorMessage(`获取余额失败: ${error.message}`);
      }
    } else {
      vscode.window.showErrorMessage('获取余额失败');
    }
    return null;
  }
}

async function updateStatusBar() {
  const apiKey = await getApiKey();

  if (!apiKey) {
    statusBarItem.text = '$(warning) Factory AI - 未设置 Key';
    statusBarItem.tooltip = '点击设置 API Key';
    return;
  }

  const data = await fetchUsageData(apiKey);

  if (!data) {
    statusBarItem.text = '$(error) Factory AI - 获取失败';
    statusBarItem.tooltip = '点击重试';
    return;
  }

  await globalContext.globalState.update('cachedUsageData', data);
  await globalContext.globalState.update('lastUpdateTimestamp', Date.now());
  updateStatusBarFromData(data);
}

function updateStatusBarFromCache() {
  const cachedData = globalContext.globalState.get<UsageData>('cachedUsageData');

  if (!cachedData) {
    return;
  }

  updateStatusBarFromData(cachedData);
}

function updateStatusBarFromData(data: UsageData) {
  const { standard } = data.usage;
  const usedPercent = (standard.usedRatio * 100).toFixed(2);
  const usedTokens = formatNumber(standard.orgTotalTokensUsed);
  const totalTokens = formatNumber(standard.totalAllowance);

  statusBarItem.text = `$(database) ${usedPercent}%`;
  statusBarItem.tooltip = `Factory AI 余额\n已用: ${usedTokens} / ${totalTokens} tokens\n点击查看详情`;
}

async function checkBalance() {
  const apiKey = await getApiKey();

  if (!apiKey) {
    return;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: '正在获取余额信息...',
      cancellable: false
    },
    async () => {
      const data = await fetchUsageData(apiKey);

      if (!data) {
        return;
      }

      await updateStatusBar();

      const { usage } = data;
      const { standard, premium } = usage;

      const startDate = new Date(usage.startDate).toLocaleDateString('zh-CN');
      const endDate = new Date(usage.endDate).toLocaleDateString('zh-CN');

      const message = `
**Factory AI 使用情况**

**时间范围:** ${startDate} - ${endDate}

**Standard 计划:**
- 用户使用: ${formatNumber(standard.userTokens)} tokens
- 组织总用: ${formatNumber(standard.orgTotalTokensUsed)} tokens
- 超额使用: ${formatNumber(standard.orgOverageUsed)} tokens
- 基础额度: ${formatNumber(standard.basicAllowance)} tokens
- 总额度: ${formatNumber(standard.totalAllowance)} tokens
- 超额限制: ${formatNumber(standard.orgOverageLimit)} tokens
- 使用比例: ${(standard.usedRatio * 100).toFixed(2)}%

**Premium 计划:**
- 用户使用: ${formatNumber(premium.userTokens)} tokens
- 组织总用: ${formatNumber(premium.orgTotalTokensUsed)} tokens
- 超额使用: ${formatNumber(premium.orgOverageUsed)} tokens
- 基础额度: ${formatNumber(premium.basicAllowance)} tokens
- 总额度: ${formatNumber(premium.totalAllowance)} tokens
- 超额限制: ${formatNumber(premium.orgOverageLimit)} tokens
- 使用比例: ${(premium.usedRatio * 100).toFixed(2)}%
      `.trim();

      const panel = vscode.window.createWebviewPanel(
        'balanceDetails',
        'Factory AI 余额详情',
        vscode.ViewColumn.One,
        {}
      );

      panel.webview.html = getWebviewContent(message);
    }
  );
}

function formatNumber(num: number): string {
  return num.toLocaleString('zh-CN');
}

function getWebviewContent(markdown: string): string {
  const html = markdown
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');

  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Factory AI 余额详情</title>
    <style>
        body {
            padding: 20px;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            line-height: 1.6;
        }
        strong {
            color: var(--vscode-textLink-foreground);
        }
    </style>
</head>
<body>
    ${html}
</body>
</html>
  `;
}

export function deactivate() {}
