import {
  Disposable,
  ExtensionContext,
  TextDocument,
  Uri,
  ViewColumn,
  WebviewPanel,
  window,
  commands,
  Webview,
} from "vscode";
import { CONTEXT_PREVIEW_ACTIVE } from "./constants";
import { AslParser } from "./parser";

/**
 * Constants for zoom and interval.
 */
const ZOOM_SCALE_STEP = 0.1;
const ZOOM_SCALE_MAX = 2.0;
const ZOOM_SCALE_MIN = 0.5;

const COMMAND_WEBVIEW_ZOOM = "zoom";
const COMMAND_WEBVIEW_TOGGLE_RAW = "toggleRaw";

/* Single instance of PanelView */
let singlePreviewPanel: PanelView | undefined;

/**
 * PanelView to display State Machine diagram.
 */
export class PanelView extends Disposable {
  protected _disposables: Disposable[] = [];
  private zoomScale: number = 1.0;
  private parser: AslParser = new AslParser();
  
  constructor(
    private context: ExtensionContext,
    private webviewPanel: WebviewPanel
  ) {
    super(() => this.dispose());

    webviewPanel.onDidDispose(() => {
      this.dispose();
    }, this._disposables);

    webviewPanel.onDidChangeViewState(e => {
      commands.executeCommand('setContext', CONTEXT_PREVIEW_ACTIVE, e.webviewPanel.active);
    });
  }

  zoomIn() {
    this.zoom(this.zoomScale + ZOOM_SCALE_STEP);
  }

  zoomOut() {
    this.zoom(this.zoomScale - ZOOM_SCALE_STEP);
  }

  zoom(scale: number) {
    let newScale = scale;
    if (newScale > ZOOM_SCALE_MAX || newScale < ZOOM_SCALE_MIN) {
      return;
    }
    this.zoomScale = newScale;

    this.webviewPanel.webview.postMessage({
      command: COMMAND_WEBVIEW_ZOOM,
      value: this.zoomScale,
    });
  }

  toggleRaw() {
    this.webviewPanel.webview.postMessage({
      command: COMMAND_WEBVIEW_TOGGLE_RAW
    });
  }

  /**
   * Loads and renders content by parsing document.
   *
   * @param doc
   */
  loadContent(text: string) {
    if (text === undefined) {
      return;
    }

    let content = undefined;
    content = this.parser.parse(text);
    
    if (content === undefined) {
      throw new Error(`Not a valid asl doc`);
    } else {
      this.webviewPanel.webview.html = this.renderContent(content);
    }
  }

  /**
   * Render content.
   *
   * @param content
   * @returns
   */
  renderContent(content: string) {
    const webview = this.webviewPanel.webview;

    // script files are stored in media
    const genScriptPath = (filename: string) =>
      webview.asWebviewUri(
        Uri.joinPath(this.context.extensionUri, "media", filename)
      );

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <style>
          #content {
            position: absolute;
            z-index: 9;
            text-align: center;
            margin: auto;
            width: 80%;
          }
          #content-header {
            padding: 10px;
            cursor: move;
            z-index: 10;
            color: #fff;
          }
          div.mermaid {
            /* font-family: 'trebuchet ms', verdana, arial; */
            font-family: 'Courier New', Courier, monospace !important;
          }
          .succeed {
            fill: #00FF00
          }
          .fail {
            fill: #FF0000
          }
        </style>
        <title>Sfn Previewer</title>
      </head>
      <body>
        <div id="raw" class="raw" style="display: none;">
          <pre>
            ${content}
          </pre>
        </div>
        <div id="content" style="align: center; max-height: 500px;">
          <div id="content-header" class="mermaid">
            ${content}
          </div>
        </div>
        <script src="${genScriptPath("mermaid.min.js")}"></script>
        <script>
          mermaid.initialize({
            logLevel: 'error',
            securityLevel: 'loose',
            theme: 'dark',
            startOnLoad:true
          });
        </script>
        <script src="${genScriptPath("main.js")}"></script>
      </body>
      </html>
    `;
  }

  /**
   * Disposes the preview panel resources.
   */
  dispose() {
    // dispose related resources
    this.webviewPanel.dispose();
    while (this._disposables.length) {
      const item = this._disposables.pop();
      if (item) {
        item.dispose();
      }
    }
    singlePreviewPanel = undefined;
  }

  /**
   * Returns preview panel visibility status.
   */
  get visible(): boolean {
    return this.webviewPanel.visible;
  }

  /**
   * Returns the underlying webview instance for this preview panel.
   */
  get webview(): Webview {
    return this.webviewPanel.webview;
  }
}

/**
 * Factory function to create PanelView.
 *
 * @param context
 * @param doc
 * @param displayColumn
 * @returns
 */
export function createPreviewPanel(
  context: ExtensionContext,
  displayColumn: ViewColumn
): PanelView {
  if (singlePreviewPanel) {
    return singlePreviewPanel;
  }
  const panelTitle = `Sfn Preview Panel`;
  // create new webview panel
  const webviewPanel = window.createWebviewPanel(
    'sfnPreview',
    panelTitle,
    displayColumn,
    {
      enableScripts: true,
      localResourceRoots: [context.extensionUri],
    }
  );
  // create PanelView
  singlePreviewPanel = new PanelView(context, webviewPanel);
  return singlePreviewPanel;
}
