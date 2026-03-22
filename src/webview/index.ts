import { allStyles } from './styles';
import { App } from './app';

const { h, render } = preact;
const html = htm.bind(h);

(async () => {
  // Inject collected styles
  const styleEl = document.createElement('style');
  styleEl.textContent = allStyles;
  document.head.appendChild(styleEl);

  const canvasContainer = document.getElementById('canvas-container')!;
  const pixiApp = new PIXI.Application({ background: '#1099bb', resizeTo: canvasContainer });
  canvasContainer.appendChild(pixiApp.view);

  PIXI.Assets.add({ alias: 'atlas', src: ATLAS_URI });
  SPINES.forEach(({ name, uri }) => PIXI.Assets.add({ alias: name, src: uri }));
  await PIXI.Assets.load([...SPINES.map(s => s.name), 'atlas']);

  const spineInstances: Record<string, SpineInstance> = {};
  SPINES.forEach(({ name }) => {
    const anim = spine.Spine.from({ skeleton: name, atlas: 'atlas' });
    anim.autoUpdate = false;
    anim.visible = false;
    const firstAnim = anim.skeleton.data.animations[0];
    if (firstAnim) anim.state.setAnimation(0, firstAnim.name, true);
    spineInstances[name] = anim;
    pixiApp.stage.addChild(anim);
  });

  render(
    html`<${App} spineInstances=${spineInstances} pixiApp=${pixiApp} />`,
    document.getElementById('app')!,
  );
})();
