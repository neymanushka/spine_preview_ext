import vscode = require('vscode');
import path = require('path');
import fs = require('fs');

const PIXI_LIB = 'pixi.min.js';
const SPINE_LIB = 'pixi-spine.min.js';
const PREACT_LIB = 'preact.umd.js';
const PREACT_HOOKS_LIB = 'preact.hooks.umd.js';
const HTM_LIB = 'htm.umd.js';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(Provider.register(context));
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'spinePreview.copyAnimationName',
      (ctx: { webviewSection: string; animationName: string }) => {
        if (ctx?.animationName) {
          vscode.env.clipboard.writeText(ctx.animationName);
        }
      },
    ),
  );
}

export class Provider implements vscode.CustomTextEditorProvider {
  private basePath: string;

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new Provider(context);
    return vscode.window.registerCustomEditorProvider(Provider.viewType, provider);
  }

  private static readonly viewType = 'spinePreview.preview';

  constructor(private readonly context: vscode.ExtensionContext) {
    this.basePath = context.extensionUri.fsPath;
  }

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
  ): Promise<void> {
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.file(path.dirname(document.uri.fsPath)), vscode.Uri.file(this.basePath)],
    };
    const atlasUri = webviewPanel.webview.asWebviewUri(document.uri);
    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview, atlasUri, document.uri.fsPath);
  }

  private libUri(webview: vscode.Webview, lib: string): string {
    return webview.asWebviewUri(vscode.Uri.file(path.join(this.basePath, 'libs', lib))).toString();
  }

  private getHtmlForWebview(webview: vscode.Webview, atlasUri: vscode.Uri, documentPath: string): string {
    const directory = path.dirname(documentPath);
    const spines = fs
      .readdirSync(directory)
      .filter((f) => f.endsWith('.json'))
      .map((f) => ({
        name: f,
        uri: webview.asWebviewUri(vscode.Uri.file(path.join(directory, f))).toString(),
      }));

    const webviewScript = webview.asWebviewUri(vscode.Uri.file(path.join(this.basePath, 'out', 'webview', 'app.js')));

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="${this.libUri(webview, PIXI_LIB)}"></script>
    <script src="${this.libUri(webview, SPINE_LIB)}"></script>
    <script src="${this.libUri(webview, PREACT_LIB)}"></script>
    <script src="${this.libUri(webview, PREACT_HOOKS_LIB)}"></script>
    <script src="${this.libUri(webview, HTM_LIB)}"></script>
</head>
<body>
    <div id="canvas-container"></div>
    <div id="app"></div>
    <script>
    var SPINES = ${JSON.stringify(spines)};
    var ATLAS_URI = '${atlasUri.toString()}';
    </script>
    <script src="${webviewScript}"></script>
</body>
</html>`;
  }
}
