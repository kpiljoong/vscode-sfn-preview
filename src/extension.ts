import path = require("path");
import fs = require("fs");
import * as vscode from "vscode";
import {
  CONTEXT_PREVIEW_ENABLED,
  CONTEXT_PREVIEW_ACTIVE,
  COMMAND_ZOOM_IN,
  COMMAND_ZOOM_OUT,
  COMMAND_PREVIEW_TO_SIDE,
	COMMAND_TOGGLE_RAW
} from "./constants";
import { getLogger } from "./logger";
import { createPreviewPanel, PanelView } from "./previewPanel";
import { initializeStatusBarItem } from "./statusBarItem";

/** Panel view */
let panelView: PanelView;

/**
 * Function to register command.
 */
const registerCommand = (
  context: vscode.ExtensionContext,
  command: string,
  fn: (...args: any[]) => void
) => {
  context.subscriptions.push(vscode.commands.registerCommand(command, fn));
};

export async function activate(context: vscode.ExtensionContext) {
  console.log(`The extension "sfn-vscode" is now active!`);

  try {
    await initializeStatusBarItem(context);

    registerCommand(context, COMMAND_PREVIEW_TO_SIDE, async (args) => {
      try {
        if (args instanceof vscode.Uri) {
          const text = await readSfnFileFrom(args);
          panelView = createPreviewPanel(context, vscode.ViewColumn.Beside);
          panelView.loadContent(text);
          getLogger().i("Parsed");
        } else {
          throw new Error('Unsupported args');
        }
      } catch (e) {
        await handleError(e, "sfn-preview", "Failed to load document");
      }
    });
  
    // Register commands.
    registerCommand(context, COMMAND_ZOOM_IN, () => {
      panelView.zoomIn();
    });
  
    registerCommand(context, COMMAND_ZOOM_OUT, () => {
      panelView.zoomOut();
    });
  
    registerCommand(context, COMMAND_TOGGLE_RAW, () => {
      panelView.toggleRaw();
    });
  
    // The panel view is automatically updated on saving the sfn file.
    vscode.workspace.onDidSaveTextDocument(async (e) => {
      const text = await readSfnFileFrom();
      panelView.loadContent(text);
    });
  
    vscode.workspace.onDidOpenTextDocument(async (e) => {
      const text = await readSfnFileFrom();
      panelView.loadContent(text);
    });
  
    // Determines if Preview is enabled or disabled.
    vscode.commands.executeCommand("setContext", CONTEXT_PREVIEW_ENABLED, true);
  } catch (error) {
    const stacktrace = (error as Error).stack?.split('\n');
    if (stacktrace !== undefined && stacktrace.length > 50) {
      stacktrace.length = 50;
    }
    getLogger().e(`Error activating extension: ${(error as Error).message}`);
    throw error;
  }
}

async function readSfnFileFrom(uri: vscode.Uri | undefined = undefined) {
  if (uri) {
    const filePath = uri.fsPath;
    if (['.yaml', '.yml', '.asl.yaml'].some(x => x === path.extname(filePath))) {
      const content = await vscode.workspace.fs.readFile(uri);
      return content.toString();
    } else {
      throw new Error("Unsupported file");
    }
  } else {
    if (['asl-yaml', 'sfn'].some(x => x === vscode.window.activeTextEditor?.document.languageId)) {
      return vscode.window.activeTextEditor!.document.getText();
    } else {
      throw new Error("Unsupported file");
    }
  }
}

async function handleError(error: unknown, topic: string, message: string) {
  const item = 'View Logs...';
  await vscode.window.showErrorMessage(message, item).then(async resp => {
  })
}

function dispose() {
  vscode.commands.executeCommand("setContext", CONTEXT_PREVIEW_ENABLED, false);
  vscode.commands.executeCommand("setContext", CONTEXT_PREVIEW_ACTIVE, false);
}

/**
 * Deactivates the extension in VS Code.
 */
export function deactivate() {
  dispose();
}
