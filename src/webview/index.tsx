import { render } from 'preact';
// Static shader/uniform helpers let Pixi run without CSP's unsafe-eval permission.
import 'pixi.js/unsafe-eval';
import { Assets, Container, Ticker, UPDATE_PRIORITY, WebGLRenderer } from 'pixi.js';
import { Spine } from '@esotericsoftware/spine-pixi-v8';
import { allStyles } from './styles';
import { App } from './app';
import { Notice } from './components/notice';

const ATLAS_ALIAS = 'atlas';

// The renderer is built by hand instead of through `Application`: its
// autoDetectRenderer() first creates a throwaway WebGL context in
// isWebGLSupported(), and inside a VS Code webview every context costs ~150 ms
// because each synchronous GPU call waits on the GPU process the whole window
// shares. WebGL is always available there, so the probe buys nothing.
async function createRenderer(canvasContainer: HTMLElement) {
  const renderer = new WebGLRenderer();
  await renderer.init({
    backgroundAlpha: 0,
    width: canvasContainer.clientWidth,
    height: canvasContainer.clientHeight,
  });
  canvasContainer.appendChild(renderer.canvas);

  const stage = new Container();
  const ticker = new Ticker();
  // LOW priority, as in Application: the app's own tick updates the skeleton
  // first, and the frame is drawn from the pose it leaves behind.
  ticker.add(() => renderer.render(stage), undefined, UPDATE_PRIORITY.LOW);
  ticker.start();

  // Stands in for Application's resizeTo. Resizing the canvas clears it, and a
  // ResizeObserver fires after this frame's ticker but before the paint, so
  // without drawing again here every resize step showed an empty canvas.
  new ResizeObserver(() => {
    renderer.resize(canvasContainer.clientWidth, canvasContainer.clientHeight);
    renderer.render(stage);
  }).observe(canvasContainer);
  return { stage, ticker };
}

function describeError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function injectStyles() {
  // The host creates this element with a per-page CSP nonce.
  const styleEl = document.getElementById('app-styles');
  if (!(styleEl instanceof HTMLStyleElement)) throw new Error('Missing webview stylesheet');
  styleEl.textContent = allStyles;
}

async function boot(appRoot: HTMLElement, canvasContainer: HTMLElement) {
  if (SPINES.length === 0) {
    render(
      <Notice
        kind="empty"
        title="No skeleton found"
        detail="This atlas has no Spine skeleton (.json or .skel) next to it. Export the skeleton into the same folder and reopen the file."
      />,
      appRoot,
    );
    return;
  }

  render(<Notice kind="loading" title="Loading Spine assets" />, appRoot);

  const { stage, ticker } = await createRenderer(canvasContainer);

  // PIXI decodes textures in a Web Worker by default, but a worker's fetch never
  // reaches the service worker that serves vscode-resource URIs to the webview,
  // so the atlas page image timed out with a 408. Loading on the main thread
  // goes through it like every other request.
  Assets.setPreferences({ preferWorkers: false });
  Assets.add({ alias: ATLAS_ALIAS, src: ATLAS_URI });
  SPINES.forEach(({ name, uri }) => Assets.add({ alias: name, src: uri }));
  // An atlas failure affects every skeleton; individual skeleton failures do not.
  await Assets.load(ATLAS_ALIAS);

  const spineInstances: Record<string, Spine> = Object.create(null);
  const skeletonErrors: Record<string, string> = Object.create(null);
  await Promise.all(
    SPINES.map(async ({ name }) => {
      try {
        await Assets.load(name);
        const anim = Spine.from({ skeleton: name, atlas: ATLAS_ALIAS, autoUpdate: false });
        anim.visible = false;
        spineInstances[name] = anim;
        stage.addChild(anim);
      } catch (error: unknown) {
        skeletonErrors[name] = describeError(error);
      }
    }),
  );

  render(
    <App
      spineInstances={spineInstances}
      skeletonErrors={skeletonErrors}
      ticker={ticker}
      canvasContainer={canvasContainer}
    />,
    appRoot,
  );
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
