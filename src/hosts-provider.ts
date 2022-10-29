import * as vscode from 'vscode'
import { homedir } from 'os'
import { mkdir, writeFile, stat, rm, readdir } from 'fs'
import { resolve } from 'path'
import { promisify } from 'util'

const HOSTS_VIEWID = 'hosts-tree-view'
const HOSTS_DIR = resolve(homedir(), '.hosts-helper')

const fsstat = async (filename: string) => {
  try {
    return await promisify(stat)(filename)
  } catch (err) {
    return false
  }
}

const initHostsDir = async () => {
  await promisify(mkdir)(HOSTS_DIR, { recursive: true })
}

const getSystemHosts = async () => {
  return process.platform === 'win32'
    ? `${process.env.windir || 'C:\\WINDOWS'}\\system32\\drivers\\etc\\hosts`
    : '/etc/hosts'
}

const getHostsFiles = async () => {
  await initHostsDir()
  const list = await promisify(readdir)(HOSTS_DIR)
  const hostsFiles = []
  for (const i in list) {
    const name = list[i]
    const filename = resolve(HOSTS_DIR, name)
    const stat = await fsstat(filename)
    if (!stat || !stat.isFile()) {
      continue
    }
    const result = /(.*)\.hosts/.exec(list[i])
    if (result) {
      hostsFiles.push({ name: result[1], filename, isSystem: false })
    }
  }
  const arr = hostsFiles.sort((a, b) => {
    return a.name > b.name ? 1 : -1
  })
  // system hosts topping
  arr.unshift({ name: 'System Hosts', filename: await getSystemHosts(), isSystem: true })
  return arr
}

const addHostsFile = async (name: string) => {
  await initHostsDir()
  const filename = resolve(HOSTS_DIR, `${name}.hosts`)
  const stat = await fsstat(filename)
  if (stat) {
    throw new Error('Already exists!')
  }
  await promisify(writeFile)(filename, `# hosts:${name}\n`)
  return filename
}

const removeFile = async (filename: string) => {
  await promisify(rm)(filename)
}

const register = (context: vscode.ExtensionContext) => {
  const provider = new HostsProvider(context)
  context.subscriptions.push(vscode.window.registerTreeDataProvider(HOSTS_VIEWID, provider))

  context.subscriptions.push(vscode.commands.registerCommand('hosts-helper.refresh-hosts-file', async () => {
    provider.refresh()
  }))

  context.subscriptions.push(vscode.commands.registerCommand('hosts-helper.new-hosts-file', async () => {
    const name = await vscode.window.showInputBox({
      title: 'Hosts Title',
      placeHolder: 'Hosts Title',
      validateInput: async (v) => {
        if (!/^[\w_\-\u4e00-\u9fa5]+ ?[\w_\-\u4e00-\u9fa5]+$/.test(v)) {
          return 'Invalid name'
        }

        if (v.length > 20) {
          return 'Exceeds the 20 character limit!'
        }
      }
    })

    if (!name) {
      return
    }
    const filename = await addHostsFile(name)
    vscode.commands.executeCommand('vscode.open', vscode.Uri.file(filename))
    provider.refresh()
  }))

  context.subscriptions.push(vscode.commands.registerCommand('hosts-helper.remove-hosts-file', async (e: Item) => {
    if (e && !e.isSystem) {
      const result = await vscode.window.showInformationMessage(`Are you sure delete \`${e.label}\`?`, { modal: true }, 'Confirm')
      if (!result) return
      await removeFile(e.filename)
      provider.refresh()
    }
  }))

  context.subscriptions.push(vscode.commands.registerCommand('hosts-helper.apply-hosts-file', async (e: Item) => {
    if (!e) return
    const file = await vscode.workspace.fs.readFile(vscode.Uri.parse(e.filename))
    const doc = await vscode.workspace.openTextDocument(await getSystemHosts())
    const editor = await vscode.window.showTextDocument(doc, { preview: false })
    const edit = new vscode.WorkspaceEdit()
    // Just replace the entire document every time for this example extension.
    // A more complete extension should compute minimal edits instead.
    edit.replace(editor.document.uri, new vscode.Range(0, 0, editor.document.lineCount, 0), file.toString())
    // Apply change to file
    await vscode.workspace.applyEdit(edit)
  }))

  context.subscriptions.push(vscode.commands.registerCommand('hosts-helper.append-apply-hosts-file', async (e: Item) => {
    if (!e) return
    const file = await vscode.workspace.fs.readFile(vscode.Uri.parse(e.filename))
    const doc = await vscode.workspace.openTextDocument(await getSystemHosts())
    const editor = await vscode.window.showTextDocument(doc, { preview: false })
    const edit = new vscode.WorkspaceEdit()
    // Just replace the entire document every time for this example extension.
    // A more complete extension should compute minimal edits instead.
    const text = file.toString()
    const lineCnt = text.split(/\r|\n/).length
    edit.replace(editor.document.uri, new vscode.Range(editor.document.lineCount, 0, editor.document.lineCount + lineCnt, 0), text)
    // Apply change to file
    await vscode.workspace.applyEdit(edit)
  }))
  return provider
}

class Item extends vscode.TreeItem {
  constructor (label: string, readonly filename: string, readonly isSystem: boolean) {
    super(label)
    this.iconPath = isSystem
      ? new vscode.ThemeIcon('device-desktop')
      : new vscode.ThemeIcon('book')
    this.contextValue = isSystem ? 'is-system' : 'is-user'
    this.description = isSystem ? 'System' : 'User'
    this.command = {
      title: 'Open File',
      command: 'vscode.open',
      arguments: [vscode.Uri.file(this.filename)]
    }
  }
}

class HostsProvider implements vscode.TreeDataProvider<Item> {
  static register = register

  constructor (readonly context: vscode.ExtensionContext) {}

  private _event: vscode.EventEmitter<Item | undefined | null | void> = new vscode.EventEmitter<Item>()
  onDidChangeTreeData: vscode.Event<Item | undefined | null | void> = this._event.event

  getTreeItem (e: Item) {
    return e
  }

  async getChildren (e: Item) {
    const files = await getHostsFiles()
    return files.map(e => new Item(e.name, e.filename, e.isSystem))
  }

  refresh () {
    this._event.fire()
  }
}

export default HostsProvider
