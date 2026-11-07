import * as vscode from 'vscode';
import { randomBytes } from 'crypto';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export class DetailPanel {
  private static current: DetailPanel | undefined;

  static show(title: string, data: Record<string, unknown>): void {
    if (DetailPanel.current) {
      // Reuse the open panel instead of stacking new ones
      DetailPanel.current.panel.reveal(vscode.ViewColumn.Beside, true);
      DetailPanel.current.update(title, data);
      return;
    }
    const panel = vscode.window.createWebviewPanel(
      'apiExplorer.detail',
      title,
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
      { enableScripts: true }
    );
    DetailPanel.current = new DetailPanel(panel);
    DetailPanel.current.update(title, data);
  }

  private constructor(private readonly panel: vscode.WebviewPanel) {
    panel.onDidDispose(() => {
      DetailPanel.current = undefined;
    });
    // Messages coming FROM the webview
    panel.webview.onDidReceiveMessage(async msg => {
      if (msg.type === 'copy' && typeof msg.text === 'string') {
        await vscode.env.clipboard.writeText(msg.text);
        vscode.window.showInformationMessage('JSON copied to clipboard');
      }
    });
  }

  private update(title: string, data: Record<string, unknown>): void {
    this.panel.title = title;
    this.panel.webview.html = this.render(data);
  }

  private render(data: Record<string, unknown>): string {
    const nonce = randomBytes(16).toString('hex');
    const json = escapeHtml(JSON.stringify(data, null, 2));
    const rows = Object.entries(data)
      .map(([key, value]) => {
        const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
        return `<tr><th>${escapeHtml(key)}</th><td>${escapeHtml(text)}</td></tr>`;
      })
      .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <style nonce="${nonce}">
    body { font-family: var(--vscode-font-family); padding: 16px; color: var(--vscode-foreground); }
    table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
    th, td { text-align: left; padding: 6px 10px; border-bottom: 1px solid var(--vscode-panel-border); vertical-align: top; }
    th { width: 120px; color: var(--vscode-descriptionForeground); }
    pre { background: var(--vscode-textCodeBlock-background); padding: 12px; overflow: auto; }
    button { background: var(--vscode-button-background); color: var(--vscode-button-foreground);
             border: none; padding: 6px 14px; cursor: pointer; }
    button:hover { background: var(--vscode-button-hoverBackground); }
  </style>
</head>
<body>
  <table>${rows}</table>
  <button id="copy">Copy JSON</button>
  <pre id="json">${json}</pre>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    document.getElementById('copy').addEventListener('click', () => {
      vscode.postMessage({ type: 'copy', text: document.getElementById('json').textContent });
    });
  </script>
</body>
</html>`;
  }
}