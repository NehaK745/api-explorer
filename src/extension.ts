import * as vscode from 'vscode';
import { ResourceProvider, ResourceNode, TOKEN_KEY } from './resourceProvider';
import { DetailPanel } from './detailPanel';


export function activate(context: vscode.ExtensionContext) {
  // Status bar (Stage 2)
  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBar.command = 'api-explorer.setBaseUrl';
  const updateStatusBar = () => {
    const url = vscode.workspace.getConfiguration('apiExplorer').get<string>('baseUrl');
    statusBar.text = `$(globe) ${url}`;
    statusBar.tooltip = 'Click to change the API base URL';
    statusBar.show();
  };
  updateStatusBar();

  // Tree view (Stage 3)
  const provider = new ResourceProvider(context.secrets);
  const treeView = vscode.window.createTreeView('apiExplorer.resources', {
    treeDataProvider: provider
  });

  const commands = [
    vscode.commands.registerCommand('api-explorer.setToken', async () => {
      const token = await vscode.window.showInputBox({
        prompt: 'Enter your API token (stored securely in your OS keychain)',
        password: true,
        ignoreFocusOut: true
      });
      if (token) {
        await context.secrets.store(TOKEN_KEY, token);
        vscode.window.showInformationMessage('API Explorer: token saved.');
      }
    }),

    vscode.commands.registerCommand('api-explorer.clearToken', async () => {
      await context.secrets.delete(TOKEN_KEY);
      vscode.window.showInformationMessage('API Explorer: token cleared.');
    }),
    vscode.commands.registerCommand('api-explorer.helloWorld', () => {
      vscode.window.showInformationMessage('Hello World from api-explorer!');
    }),

    vscode.commands.registerCommand('api-explorer.shout', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('No active editor');
        return;
      }
      await editor.edit(edit => {
        for (const sel of editor.selections) {
          edit.replace(sel, editor.document.getText(sel).toUpperCase());
        }
      });
    }),

    vscode.commands.registerCommand('api-explorer.setBaseUrl', async () => {
      const config = vscode.workspace.getConfiguration('apiExplorer');
      const value = await vscode.window.showInputBox({
        prompt: 'Enter the API base URL',
        value: config.get<string>('baseUrl'),
        validateInput: text =>
          /^https?:\/\/.+/.test(text) ? undefined : 'Must start with http:// or https://'
      });
      if (value) {
        await config.update('baseUrl', value, vscode.ConfigurationTarget.Global);
      }
    }),

    vscode.commands.registerCommand('api-explorer.refresh', () => provider.refresh()),
    vscode.commands.registerCommand('api-explorer.openItem', (node: ResourceNode) => {
      if (node.data) {
        DetailPanel.show(`${node.resource} ${node.data.id !== undefined ? '#' + node.data.id : ''}`, node.data);
      }
    })
  ];

  // Refresh the UI when the setting changes
  const onConfigChange = vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('apiExplorer')) {
      updateStatusBar();
      provider.refresh();
    }
  });
  const onSecretChange = context.secrets.onDidChange(e => {
  if (e.key === TOKEN_KEY) {
    provider.refresh();
  }
});
 context.subscriptions.push(statusBar, treeView, onConfigChange, onSecretChange, ...commands);
}

export function deactivate() { }