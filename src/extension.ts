import vscode = require('vscode');
import path = require('path');
import fs = require('fs');

const PIXI_LIB = 'pixi.min.js';
const SPINE_LIB = 'pixi-spine.min.js';

// Only the first few KB are read: a Spine export declares "skeleton" or "bones"
// up front, so an unrelated file such as package.json never reaches the loader.
const SKELETON_PROBE_BYTES = 4096;
const SKELETON_KEY_PATTERN = /"(?:skeleton|bones)"\s*:/;

type SpineEntry = { name: string; uri: string };

async function isSkeletonJson(filePath: string): Promise<boolean> {
  let handle: fs.promises.FileHandle | undefined;
  try {
    handle = await fs.promises.open(filePath, 'r');
    const buffer = Buffer.alloc(SKELETON_PROBE_BYTES);
    const { bytesRead } = await handle.read(buffer, 0, SKELETON_PROBE_BYTES, 0);
    return SKELETON_KEY_PATTERN.test(buffer.subarray(0, bytesRead).toString('utf8'));
  } catch {
    return false;
  } finally {
    await handle?.close();
  }
}

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
    webviewPanel.webview.html = await this.getHtmlForWebview(webviewPanel.webview, atlasUri, document.uri.fsPath);
  }

  private libUri(webview: vscode.Webview, lib: string): string {
    return webview.asWebviewUri(vscode.Uri.file(path.join(this.basePath, 'libs', lib))).toString();
  }

  private async collectSpines(webview: vscode.Webview, directory: string): Promise<SpineEntry[]> {
    let entries: fs.Dirent[];
    try {
      entries = await fs.promises.readdir(directory, { withFileTypes: true });
    } catch {
      return [];
    }

    const candidates = entries.filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.json'));
    const probed = await Promise.all(
      candidates.map(async (e) => {
        const filePath = path.join(directory, e.name);
        return {
          name: e.name,
          uri: webview.asWebviewUri(vscode.Uri.file(filePath)).toString(),
          isSkeleton: await isSkeletonJson(filePath),
        };
      }),
    );

    return probed.filter((p) => p.isSkeleton).map(({ name, uri }) => ({ name, uri }));
  }

  private async getHtmlForWebview(
    webview: vscode.Webview,
    atlasUri: vscode.Uri,
    documentPath: string,
  ): Promise<string> {
    const spines = await this.collectSpines(webview, path.dirname(documentPath));
    const webviewScript = webview.asWebviewUri(vscode.Uri.file(path.join(this.basePath, 'out', 'webview', 'app.js')));

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="${this.libUri(webview, PIXI_LIB)}"></script>
    <script src="${this.libUri(webview, SPINE_LIB)}"></script>
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
