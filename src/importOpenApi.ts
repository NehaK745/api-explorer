import * as vscode from 'vscode';
import { loadSpec, ParsedSpec } from './openapi';

export async function importFromOpenApi(): Promise<void> {
  const specUrl = await vscode.window.showInputBox({
    prompt: 'URL of an OpenAPI 3 or Swagger 2 JSON document',
    placeHolder: 'https://petstore3.swagger.io/api/v3/openapi.json',
    ignoreFocusOut: true,
    validateInput: text =>
      /^https?:\/\/.+/.test(text) ? undefined : 'Must start with http:// or https://'
  });
  if (!specUrl) {
    return;
  }

  let spec: ParsedSpec;
  try {
    spec = await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'Reading API spec...' },
      () => loadSpec(specUrl)
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(`API Explorer: could not import the spec. ${message}`);
    return;
  }

  if (spec.endpoints.length === 0) {
    vscode.window.showWarningMessage('API Explorer: no simple GET endpoints found in this spec.');
    return;
  }

  const picks = await vscode.window.showQuickPick(
    spec.endpoints.map(e => ({ label: e.path, description: e.summary })),
    {
      canPickMany: true,
      title: `Endpoints from "${spec.title}"`,
      placeHolder: 'Select the ones to show in the tree'
    }
  );
  if (!picks || picks.length === 0) {
    return;
  }

  const config = vscode.workspace.getConfiguration('apiExplorer');
  if (spec.baseUrl && spec.baseUrl !== config.get<string>('baseUrl')) {
    const answer = await vscode.window.showInformationMessage(
      `Also set the base URL to ${spec.baseUrl}? Your saved token is sent to this address.`,
      { modal: true },
      'Set base URL'
    );
    if (answer === 'Set base URL') {
      await config.update('baseUrl', spec.baseUrl, vscode.ConfigurationTarget.Global);
    }
  }
  await config.update('resources', picks.map(p => p.label), vscode.ConfigurationTarget.Global);
  vscode.window.showInformationMessage(`API Explorer: imported ${picks.length} endpoint(s).`);
}