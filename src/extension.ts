// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode'
import HostsProvider from './hosts-provider'
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "hosts-helper" is now active!')
	HostsProvider.register(context)
	let disposable = vscode.commands.registerCommand('hosts-helper.helloWorld', async () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from !')
		const text = await vscode.workspace.fs.readFile(vscode.Uri.parse('/etc/hosts'))
      console.log(text.toString())
      const doc = await vscode.workspace.openTextDocument('/etc/hosts')
      const editor = await vscode.window.showTextDocument(doc, { preview: false })
      const edit = new vscode.WorkspaceEdit()
      // Just replace the entire document every time for this example extension.
      // A more complete extension should compute minimal edits instead.
      edit.replace(editor.document.uri, new vscode.Range(0, 0, editor.document.lineCount, 0), '# Hello')
      // Apply change to file
      await vscode.workspace.applyEdit(edit)
	})

	context.subscriptions.push(disposable)
}

// this method is called when your extension is deactivated
export function deactivate() {}
