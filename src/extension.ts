import * as vscode from "vscode";

import path = require("path");
import fs = require("fs");

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
				const directory = path.dirname(uri.fsPath);
				const files = fs.readdirSync(directory);
				const spines = files.filter((f) => f.endsWith(".json")).map((f) => path.join(directory, f));
        const pixiUri = webview.asWebviewUri(vscode.Uri.file(path.join(this.basePath, "libs", "pixi.min.js")));
        const spineUri = webview.asWebviewUri(vscode.Uri.file(path.join(this.basePath, "libs", "pixi-spine.umd.js")));

        return /* html */`<!DOCTYPE html>
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
				align-items: baseline;
				gap: 10px;
				position: fixed;
				top: 0;
				left: 0;
				right: 0;
				height: 50px;
			  user-select:none;
				padding-left: 10px;
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
				<select id="fileSelect"></select>
				<div class="title-container-version"></div>
				<input type="range" id="zoomInput" min="0.1" max="1" step="0.025" value="1" />
				<label>loop: <input class="loop-checkbox" type="checkbox" id="loopInput" checked /></label>
				<div class="title-container-time"></div>
			</div>
			<div class="list-container"></div>

			<script>
				const width = window.innerWidth;
				const height = window.innerHeight;
				const app = new PIXI.Application({ backgroundColor: 0x1099bb, width, height, resizeTo: window });

				document.body.appendChild(app.view);

				const version = document.querySelector('.title-container-version');
				const timeContainer = document.querySelector('.title-container-time');
				const listContainer = document.querySelector('.list-container');
				const fileSelect = document.querySelector('#fileSelect');

				let animation = null;
				let animations = [];
				let framesTime = 0;
				let frames = 0;
				let zoomFactor = 1;
				let isLoop = true;

				let spines = {};
				let filesToAnimationsMap = {};

				PIXI.Loader.shared
					${spines.map((spine) => {
						return `.add("${path.basename(spine)}", "${webview.asWebviewUri(vscode.Uri.file(spine))}", { metadata: { spineAtlasFile: "${uri}"}})`;
					}).join("\n")};
				PIXI.Loader.shared.load((loader,resources) => {
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

					${spines.map((spinePath) => {
						return `{
							const name = '${path.basename(spinePath)}';
							const animation = new PIXI.spine.Spine(resources[name].spineData);
							animation.autoUpdate = false;
							animation.visible = false;
							const animations = animation.spineData.animations;
							animation.state.setAnimation(0, animations[0].name, isLoop);

							spines[name] = animation;
							filesToAnimationsMap[name] = animations.map((a) => a.name);

							app.stage.addChild(animation);

							const option = document.createElement('option');
							option.value = name;
							option.text = name;
							fileSelect.appendChild(option);
						}`;
					}).join("\n")}

					const resize = () => {
						animation.x = window.innerWidth * 0.5;
						animation.y = window.innerHeight * 0.5;
						animation.scale.set(zoomFactor)
					}

					const showAnimation = (name) => {
						if (animation) {
							animation.visible = false;
							listContainer.innerHTML = '';
						}

						animation = spines[name];
						animation.visible = true;
						animations = animation.spineData.animations;

						version.innerHTML = ${"`spine version: ${animation.spineData.version}`"};

						animations.map((a) => {
							const div = createDiv('list-item',"");
							const text = createDiv('list-item-right',${"`${a.name}   [${a.duration.toFixed(3)}]`"});

							text.onclick = () =>	{
								animation.state.setAnimation(0, a.name, isLoop);
							};

							div.appendChild(createIcon(a.name));
							div.appendChild(text);

							listContainer.appendChild(div);
						});
						resize();
					}

					showAnimation("${path.basename(spines[0])}");

					fileSelect.onchange = () => {
						showAnimation(fileSelect.value);
					}

					zoomInput.oninput = (e) => {
						zoomFactor = e.target.value;
						resize();
					}

					loopInput.onchange = (e) => {
						isLoop = e.target.checked;
						animation.state.setAnimation(0, animation.state.tracks[0].animation.name, isLoop);
					}

					window.onresize = () => resize();

					app.ticker.add(() => {
							if(animation) {
									const startTime = performance.now();
									animation.update(app.ticker.deltaMS/1000)
									const diff = (performance.now() - startTime).toFixed(4);
									timeContainer.innerText = ${"`update time: ${diff} ms`"};
							}
					});

			  	})
		  	</script>
		</body>
		</html>`;
    }
}
