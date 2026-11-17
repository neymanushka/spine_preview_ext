import vscode = require('vscode');
import path = require('path');
import fs = require('fs');
import crypto = require('crypto');

type SpineEntry = { name: string; uri: string };

const toScriptLiteral = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');

function isSpineDocument(document: vscode.TextDocument): boolean {
  try {
    const data = JSON.parse(document.getText());
    return (
      data !== null && typeof data === 'object' && typeof data.skeleton?.spine === 'string' && Array.isArray(data.bones)
    );
  } catch {
    // Invalid JSON must remain available in the text editor for repair.
    return false;
  }
}

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(Provider.register(context));
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'spinePreview.copyAnimationName',
      async (ctx: { webviewSection: string; animationName: string }) => {
        if (ctx?.animationName) {
          await vscode.env.clipboard.writeText(ctx.animationName);
        }
      },
    ),
  );
}

export class Provider implements vscode.CustomReadonlyEditorProvider {
  private basePath: string;

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new Provider(context);
    return vscode.window.registerCustomEditorProvider(Provider.viewType, provider);
  }

  private static readonly viewType = 'spinePreview.preview';

  constructor(context: vscode.ExtensionContext) {
    this.basePath = context.extensionUri.fsPath;
  }

  public openCustomDocument(uri: vscode.Uri): vscode.CustomDocument {
    return { uri, dispose() {} };
  }

  public async resolveCustomEditor(document: vscode.CustomDocument, webviewPanel: vscode.WebviewPanel): Promise<void> {
    const extension = path.extname(document.uri.fsPath).toLowerCase();
    const isSkeleton =
      extension === '.skel' ||
      (extension === '.json' && isSpineDocument(await vscode.workspace.openTextDocument(document.uri)));
    // Also reject stale user associations that still send .atlas files here.
    if (!isSkeleton) {
      const tab = vscode.window.tabGroups.all
        .flatMap((group) => group.tabs)
        .find(
          ({ input, group }) =>
            group.viewColumn === webviewPanel.viewColumn &&
            input instanceof vscode.TabInputCustom &&
            input.viewType === Provider.viewType &&
            input.uri.toString() === document.uri.toString(),
        );
      await vscode.commands.executeCommand('vscode.openWith', document.uri, 'default', {
        viewColumn: webviewPanel.viewColumn,
        preserveFocus: tab ? !tab.group.isActive : !webviewPanel.active,
        preview: tab?.isPreview ?? true,
      });
      if (tab) {
        // Close only the original custom-editor tab and preserve the active group.
        if (tab.group.tabs.includes(tab)) await vscode.window.tabGroups.close(tab, true);
      } else {
        webviewPanel.dispose();
      }
      return;
    }

    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.file(path.dirname(document.uri.fsPath)), vscode.Uri.file(this.basePath)],
    };
    try {
      const atlasPath = await this.findAtlas(document.uri.fsPath);
      const atlasUri = webviewPanel.webview.asWebviewUri(vscode.Uri.file(atlasPath));
      const spines = [
        {
          name: path.basename(document.uri.fsPath),
          uri: webviewPanel.webview.asWebviewUri(document.uri).toString(),
        },
      ];
      webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview, atlasUri, spines);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      // Render the error as text, never interpolate filenames as HTML.
      const escaped = message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      webviewPanel.webview.html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'"></head><body><h2>Could not open Spine preview</h2><p>${escaped}</p><p>Use Reopen Editor With… → Text Editor to view or edit the JSON.</p></body></html>`;
    }
  }

  private async findAtlas(documentPath: string): Promise<string> {
    const directory = path.dirname(documentPath);
    const entries = await fs.promises.readdir(directory, { withFileTypes: true });
    const atlases = entries.filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === '.atlas');
    const matchingName = `${path.basename(documentPath, path.extname(documentPath))}.atlas`;
    const match = atlases.find((entry) => entry.name.toLowerCase() === matchingName.toLowerCase());
    if (match) return path.join(directory, match.name);
    if (atlases.length === 1) return path.join(directory, atlases[0].name);
    if (atlases.length === 0) {
      throw new Error(
        'No .atlas file next to this Spine skeleton. Export the atlas and textures into the same folder.',
      );
    }
    throw new Error(
      `Several atlases found: ${atlases.map(({ name }) => name).join(', ')}. Give the matching atlas the same base name as the skeleton.`,
    );
  }

  private getHtmlForWebview(webview: vscode.Webview, atlasUri: vscode.Uri, spines: SpineEntry[]): string {
    const webviewScript = webview.asWebviewUri(vscode.Uri.file(path.join(this.basePath, 'out', 'webview', 'app.js')));
    const nonce = crypto.randomBytes(32).toString('base64');
    const csp = [
      "default-src 'none'",
      "base-uri 'none'",
      "form-action 'none'",
      `script-src 'nonce-${nonce}'`,
      `style-src 'nonce-${nonce}'`,
      `img-src ${webview.cspSource} blob: data:`,
      `connect-src ${webview.cspSource}`,
    ].join('; ');

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="${csp}">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style id="app-styles" nonce="${nonce}"></style>
</head>
<body>
    <div id="canvas-container"></div>
    <div id="app"></div>
    <script nonce="${nonce}">
    var SPINES = ${toScriptLiteral(spines)};
    var ATLAS_URI = ${toScriptLiteral(atlasUri.toString())};
    </script>
    <script nonce="${nonce}" src="${webviewScript}"></script>
</body>
</html>`;
  }
}
