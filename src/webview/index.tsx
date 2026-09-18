import { render } from 'preact';
import { allStyles } from './styles';
import { App } from './app';
import { Notice } from './components/notice';

const ATLAS_ALIAS = 'atlas';

function describeError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function injectStyles() {
  const styleEl = document.createElement('style');
  styleEl.textContent = allStyles;
  document.head.appendChild(styleEl);
}

async function boot(appRoot: HTMLElement, canvasContainer: HTMLElement) {
  if (SPINES.length === 0) {
    render(
      <Notice
        kind="empty"
        title="No skeleton found"
        detail="This atlas has no Spine skeleton (.json) next to it. Export the skeleton into the same folder and reopen the file."
      />,
      appRoot,
    );
    return;
  }

  render(<Notice kind="loading" title="Loading Spine assets" />, appRoot);

  const pixiApp = new PIXI.Application({ backgroundAlpha: 0, resizeTo: canvasContainer });
  canvasContainer.appendChild(pixiApp.view);

  PIXI.Assets.add({ alias: ATLAS_ALIAS, src: ATLAS_URI });
  SPINES.forEach(({ name, uri }) => PIXI.Assets.add({ alias: name, src: uri }));
  await PIXI.Assets.load([...SPINES.map((s) => s.name), ATLAS_ALIAS]);

  const spineInstances: Record<string, SpineInstance> = {};
  SPINES.forEach(({ name }) => {
    const anim = spine.Spine.from({ skeleton: name, atlas: ATLAS_ALIAS });
    anim.autoUpdate = false;
    anim.visible = false;
    const firstAnim = anim.skeleton.data.animations[0];
    if (firstAnim) anim.state.setAnimation(0, firstAnim.name, true);
    spineInstances[name] = anim;
    pixiApp.stage.addChild(anim);
  });

  render(<App spineInstances={spineInstances} pixiApp={pixiApp} canvasContainer={canvasContainer} />, appRoot);
}

injectStyles();

const appRoot = document.getElementById('app');
const canvasContainer = document.getElementById('canvas-container');

if (appRoot && canvasContainer) {
  boot(appRoot, canvasContainer).catch((error: unknown) => {
    // A missing page, a malformed atlas or a skeleton/runtime version mismatch
    // all land here. Without this the webview just stayed blank.
    render(<Notice kind="error" title="Could not load the Spine assets" detail={describeError(error)} />, appRoot);
  });
}
