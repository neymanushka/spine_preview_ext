import * as vscode from "vscode";
import path = require("path");

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(Provider.register(context));
}

export class Provider implements vscode.CustomTextEditorProvider {
    private basePath: string;
    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        const provider = new Provider(context);
        const providerRegistration = vscode.window.registerCustomEditorProvider(Provider.viewType, provider);
        return providerRegistration;
    }

    private static readonly viewType = "spinePreview.preview";

    constructor(private readonly context: vscode.ExtensionContext) {
        this.basePath = context.extensionUri.fsPath;
    }

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
        const pixiUri = webview.asWebviewUri(vscode.Uri.file(path.join(this.basePath, "libs", "pixi.min.js")));
        const spineUri = webview.asWebviewUri(vscode.Uri.file(path.join(this.basePath, "libs", "pixi-spine.umd.js")));

        return `<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<script src="${pixiUri}"></script>
			<script src="${spineUri}"></script>
		</head>
		<style>
			body {
				margin: 0;
				padding: 0;
			}
			.title-container {
				display: flex;
				position: fixed;
				top: 0;
				left: 0;
				right: 0;
				height: 50px;
			  	user-select:none;
			}
			.title-container-version {
				width: 200px;
			}
			.title-container-buttons {
				width: 200px;
			}
			.title-container-time {
				flex: 1;
			}
			.list-container {
				position: fixed;
				cursor: pointer;
				right: 0;
				left: 0;
				bottom: 0;
				height: calc(100% - 50px);
				user-select:none;
				overflow-y: auto;
				padding: 10px;
			}
			.list-item {
				display: flex;
				background-color: transparent;
				color: black;
			}
			.list-item-left {
				width: 20px;
				cursor: grab;
			}
			.list-item-right {
				flex: 1;
			}
			.list-item:hover {
				background-color: black;
				color: white;
			}
			.icon::after {
				content: "\\1F4CB";
				margin-right: 10px;
			}
		</style>
		<body>
			<div class="title-container">
				<div class="title-container-version"></div>
				<div class="title-container-buttons"></div>
				<div class="title-container-time"></div>
			</div>
			<div class="list-container"></div>

			<script>

				let framesTime = 0;
				let frames = 0;
				let zoomFactor = 1;
				const width = window.innerWidth;
				const height = window.innerHeight;
				const app = new PIXI.Application({ backgroundColor: 0x1099bb, width, height, resizeTo: window });
				document.body.appendChild(app.view);
				const version = document.querySelector('.title-container-version');
				const buttons = document.querySelector('.title-container-buttons');
				const timeContainer = document.querySelector('.title-container-time');
				const listContainer = document.querySelector('.list-container');
		    	PIXI.Loader.shared.add({ name: "spine", url:"${uri.toString().replace(/\.[^.]+$/, ".json")}"  });
				PIXI.Loader.shared.load((loader,res) => {

					const createDiv = (className,content) => {
						const div = document.createElement('div');
						div.innerText = content;
						div.className = className;
						return div;
					}

					const createIcon = (name) => {
						const a = document.createElement('a');
						a.className = 'list-item-left icon';
						a.onclick = () => navigator.clipboard.writeText(name);
						return a;
					}

					const createButton = (content,factor) => {
						const button = document.createElement('button');
						button.innerText = content;
						button.className = 'zoom-button';
						button.onclick = () =>	{
							zoomFactor = factor;
							resize();
						}
						return button;
					}

					const animation = new PIXI.spine.Spine(res.spine.spineData);
					app.stage.addChild(animation);
					const animations = animation.spineData.animations;
					animation.state.setAnimation(0, animations[0].name, true);

					version.innerHTML = ${"`spine version: ${animation.spineData.version}`"};
					buttons.appendChild(createButton("x1",1));
					buttons.appendChild(createButton("x0.5",0.5));
					buttons.appendChild(createButton("x0.1",0.1));

					animations.map(a=>{
						const div = createDiv('list-item',"");
						const text = createDiv('list-item-right',${"`${a.name}   [${a.duration}]`"});
						listContainer.appendChild(div);
						text.onclick = () =>	{
							console.log('click',a.name);
							animation.state.setAnimation(0,a.name,true);
						};
						div.appendChild(createIcon(a.name));
						div.appendChild(text);
					});

					const resize = () => {
						animation.x = window.innerWidth * 0.5;
						animation.y = window.innerHeight * 0.5;
						animation.scale.set(zoomFactor)
					}

					resize();
					window.onresize = () => resize();
			  	})
		  	</script>
		</body>
		</html>`;
    }
}
