import * as vscode from 'vscode';

export class ResourceNode extends vscode.TreeItem {
  constructor(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly resource: string,
    public readonly data?: Record<string, unknown>
  ) {
    super(label, collapsibleState);
    if (data) {
      this.command = {
        command: 'api-explorer.openItem',
        title: 'Open Item',
        arguments: [this]
      };
      this.iconPath = new vscode.ThemeIcon('symbol-field');
      this.tooltip = `${resource} ${data.id !== undefined ? '#' + data.id : ''}`;
    } else {
      this.iconPath = new vscode.ThemeIcon('folder');
    }
  }
}

// APIs return different shapes: [..], or { products: [..] }, or a single object.
function toList(json: unknown): unknown[] {
  if (Array.isArray(json)) {
    return json;
  }
  if (json && typeof json === 'object') {
    const firstArray = Object.values(json).find(Array.isArray);
    return firstArray ?? [json];
  }
  return [json];
}

export class ResourceProvider implements vscode.TreeDataProvider<ResourceNode> {
  private readonly _onDidChange = new vscode.EventEmitter<ResourceNode | undefined>();
  readonly onDidChangeTreeData = this._onDidChange.event;

  refresh(): void {
    this._onDidChange.fire(undefined);
  }

  getTreeItem(element: ResourceNode): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: ResourceNode): Promise<ResourceNode[]> {
    if (!element) {
      const resources = vscode.workspace
        .getConfiguration('apiExplorer')
        .get<string[]>('resources', []);
      return resources.map(
        r => new ResourceNode(r, vscode.TreeItemCollapsibleState.Collapsed, r)
      );
    }
    if (!element.data) {
      return this.fetchItems(element.resource);
    }
    return [];
  }

  private async fetchItems(resource: string): Promise<ResourceNode[]> {
    const config = vscode.workspace.getConfiguration('apiExplorer');
    const baseUrl = config.get<string>('baseUrl', '').replace(/\/+$/, '');
    const query = config.get<string>('queryString', '').replace(/^\?/, '');
    const path = resource.replace(/^\/+/, '');
    const url = `${baseUrl}/${path}${query ? `?${query}` : ''}`;

    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
      const items = toList(await res.json());
      return items.map((item, index) => {
        const record: Record<string, unknown> =
          item !== null && typeof item === 'object'
            ? (item as Record<string, unknown>)
            : { value: item };
        const label = String(
          record.title ?? record.name ?? record.id ?? `item ${index + 1}`
        );
        return new ResourceNode(
          label,
          vscode.TreeItemCollapsibleState.None,
          resource,
          record
        );
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      vscode.window.showErrorMessage(`API Explorer: could not load ${resource}. ${message}`);
      return [];
    }
  }
}