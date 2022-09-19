import * as vscode from 'vscode';

export async function initializeStatusBarItem(
  context: vscode.ExtensionContext
): Promise<void> {
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left,
    1);
  statusBarItem.command = 'sfn';
  statusBarItem.show();
  
  context.subscriptions.push(statusBarItem);
}