import * as vscode from 'vscode';

export type ResourceName = 'posts' | 'users' | 'todos';
const RESOURCES: ResourceName[] = ['posts', 'users', 'todos'];

export class ResourceNode extends vscode.TreeItem {
  constructor(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly resource: ResourceName,
    public readonly data?: Record<string, unknown>
  ) {
    super(label, collapsibleState);
    if (data) {
      // Leaf node: clicking it runs this command with the node as argument
      this.command = {
        command: 'api-explorer.openItem',
        title: 'Open Item',
        arguments: [this]
      };
      this.iconPath = new vscode.ThemeIcon('symbol-field');
      this.tooltip = `${resource} #${data.id}`;
    } else {
      this.iconPath = new vscode.ThemeIcon('folder');
    }
  }
}

export class ResourceProvider implements vscode.TreeDataProvider<ResourceNode> {
  private readonly _onDidChange = new vscode.EventEmitter<ResourceNode | undefined>();
  readonly onDidChangeTreeData = this._onDidChange.event;

  refresh(): void {
    this._onDidChange.fire(undefined); // undefined = refresh the whole tree
  }

  getTreeItem(element: ResourceNode): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: ResourceNode): Promise<ResourceNode[]> {
    // Root level: the three resource folders
    if (!element) {
      return RESOURCES.map(
        r => new ResourceNode(r, vscode.TreeItemCollapsibleState.Collapsed, r)
      );
    }
    // Child level: fetch items for this resource
    if (!element.data) {
      return this.fetchItems(element.resource);
    }
    return [];
  }

  private async fetchItems(resource: ResourceName): Promise<ResourceNode[]> {
    const baseUrl = vscode.workspace
      .getConfiguration('apiExplorer')
      .get<string>('baseUrl', '')
      .replace(/\/+$/, '');

    try {
      const res = await fetch(`${baseUrl}/${resource}?_limit=20`, {
        signal: AbortSignal.timeout(10_000)
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
      const items = (await res.json()) as Record<string, unknown>[];
      return items.map(item => {
        const label = String(item.title ?? item.name ?? `#${item.id}`);
        return new ResourceNode(
          label,
          vscode.TreeItemCollapsibleState.None,
          resource,
          item
        );
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      vscode.window.showErrorMessage(`API Explorer: could not load ${resource}. ${message}`);
      return [];
    }
  }
}