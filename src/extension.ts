import * as vscode from "vscode";

const PIXI_CDN_URL = `https://cdnjs.cloudflare.com/ajax/libs/pixi.js/6.5.8/browser/pixi.js`;
const SPINE_CDN_URL = `https://cdn.jsdelivr.net/npm/pixi-spine@3.1.2/dist/pixi-spine.umd.js`;

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(Provider.register(context));
}

export class Provider implements vscode.CustomTextEditorProvider {
    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        const provider = new Provider(context);
        const providerRegistration = vscode.window.registerCustomEditorProvider(Provider.viewType, provider);
        return providerRegistration;
    }

    private static readonly viewType = "spinePreview.preview";

    constructor(private readonly context: vscode.ExtensionContext) {}

    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {
        webviewPanel.webview.options = {
            enableScripts: true,
        };
        const uri = webviewPanel.webview.asWebviewUri(document.uri);
        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview, uri);
    }

    private getHtmlForWebview(webview: vscode.Webview, uri: vscode.Uri): string {
        return `<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<script src="${PIXI_CDN_URL}"></script>
			<script src="${SPINE_CDN_URL}"></script>
		</head>
		<style>
			body {
				position: relative;
				overflow: hidden;
				width: 100%;
				height: 100%;
				margin: 0;
				padding: 0;
			}
			.list-container {
				position:absolute;
				cursor:pointer;
				left: 0;
				top: 0;
				user-select:none;
				height: 100%;
				overflow-y: auto;
			}
			.list-item {
				background-color: transparent;
				color: black;
			}
			.list-item:hover {
				background-color: black;
				color: white;
			}
		</style>
		<body>
			<div class="list-container"></div>
			<script>

				const width = window.innerWidth;
				const height = window.innerHeight;
				const app = new PIXI.Application({ backgroundColor: 0x1099bb, width, height, resizeTo: window });
				document.body.appendChild(app.view);
				const listContainer = document.querySelector('.list-container');
		    	PIXI.Loader.shared.add({ name: "spine", url:"${uri.toString().replace(/\.[^.]+$/, ".json")}"  });
				PIXI.Loader.shared.load((loader,res) => {

				const createDiv = (className,content) => {
					const div = document.createElement('div');
					div.innerText = content;
					div.className = className;
					return div;
				}

				const animation = new PIXI.spine.Spine(res.spine.spineData);
				app.stage.addChild(animation);
				const animations = animation.spineData.animations;
				animation.state.setAnimation(0, animations[0].name, true);

				const div = createDiv('version',${"`spine version: ${animation.spineData.version}`"});
				listContainer.appendChild(div);

				animations.map(a=>{
					const div = createDiv('list-item',${"`${a.name}   [${a.duration}]`"});
					listContainer.appendChild(div);
					div.onclick = () =>	{
						console.log('click',a.name);
						animation.state.setAnimation(0,a.name,true);
					};
				});

				const resize = () => {
					animation.x = window.innerWidth * 0.5;
					animation.y = window.innerHeight * 0.5;
				}
				resize();
				window.onresize = () => resize();

			  	})
		  	</script>
		</body>
		</html>`;
    }
}
