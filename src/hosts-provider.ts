import * as vscode from 'vscode'

const HOSTS_VIEWID = 'hosts-tree-view'

const register = (context: vscode.ExtensionContext) => {
  const provider = new HostsProvider(context)
  context.subscriptions.push(vscode.window.registerTreeDataProvider(HOSTS_VIEWID, provider))

  context.subscriptions.push(vscode.commands.registerCommand('bench.connection-refresh', async () => {
    let value = await context.secrets.get('demo')
    console.log('hello', value, context.globalState.keys)
    if (value) {
      value = Date.now().toString()
    } else {
      value = '123456'
    }
    await context.secrets.store('demo', value)
    provider.refresh()
  }))

  return provider
}

class Item extends vscode.TreeItem {
  constructor (label: string) {
    super(label)
    this.iconPath = '$(server)'
  }
}

class HostsProvider implements vscode.TreeDataProvider<Item> {
  static register = register

  constructor (readonly context: vscode.ExtensionContext) {
  }

  private _event: vscode.EventEmitter<Item | undefined | null | void> = new vscode.EventEmitter<Item>()
  onDidChangeTreeData: vscode.Event<Item | undefined | null | void> = this._event.event

  getTreeItem (e: Item) {
    return e
  }

  async getChildren (e: Item) {
    return [
      new Item('System'),
      new Item('Dev'),
      new Item('Test'),
      new Item('Prod')
    ]
  }

  refresh () {
    this._event.fire()
  }
}

export default HostsProvider
