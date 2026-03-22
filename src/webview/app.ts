import { FileSelector } from './components/file-selector';
import { Controls } from './components/controls';
import { StatusBar } from './components/status-bar';
import { AnimationList } from './components/animation-list';
import { SkinsPanel } from './components/skins-panel';

const { h, Fragment } = preact;
const { useState, useRef, useEffect, useCallback } = preactHooks;
const html = htm.bind(h);

export const appStyles = `
.title-container {
    display: flex;
    align-items: center;
    gap: 10px;
    position: fixed;
    top: 8px; left: 8px; right: 8px;
    height: 42px;
    user-select: none;
    padding: 0 12px;
    background: var(--panel-bg);
    border: var(--panel-border);
    border-radius: var(--panel-radius);
    backdrop-filter: blur(12px);
}
.main-container {
    display: flex;
    flex-direction: row;
    position: fixed;
    gap: 8px;
    right: 8px; left: 8px; bottom: 8px;
    height: calc(100% - 66px);
}`;

export function App({ spineInstances, pixiApp }: { spineInstances: Record<string, SpineInstance>; pixiApp: PIXIApplication }) {
  const [selectedFile, setSelectedFile] = useState(SPINES[0]?.name ?? '');
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [loop, setLoop] = useState(true);
  const [version, setVersion] = useState('');
  const [updateTime, setUpdateTime] = useState('');
  const [animations, setAnimations] = useState<SpineAnimation[]>([]);
  const [skins, setSkins] = useState<SpineSkin[]>([]);
  const [activeSkins, setActiveSkins] = useState(new Set<string>());

  const currentAnimRef = useRef<SpineInstance | null>(null);
  const loopRef = useRef(loop);
  loopRef.current = loop;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const panRef = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!selectedFile) return;
    if (currentAnimRef.current) currentAnimRef.current.visible = false;
    const anim = spineInstances[selectedFile];
    anim.visible = true;
    anim.x = window.innerWidth * 0.5 + panRef.current.x;
    anim.y = window.innerHeight * 0.5 + panRef.current.y;
    anim.scale.set(zoomRef.current);
    currentAnimRef.current = anim;
    setVersion(anim.skeleton.data.version || 'unknown');
    setAnimations([...anim.skeleton.data.animations]);
    setSkins([...anim.skeleton.data.skins]);
    setActiveSkins(new Set());
  }, [selectedFile]);

  useEffect(() => {
    if (currentAnimRef.current) currentAnimRef.current.scale.set(zoom);
  }, [zoom]);

  useEffect(() => {
    panRef.current = { x: panX, y: panY };
    if (currentAnimRef.current) {
      currentAnimRef.current.x = window.innerWidth * 0.5 + panX;
      currentAnimRef.current.y = window.innerHeight * 0.5 + panY;
    }
  }, [panX, panY]);

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      const next = Math.min(1, Math.max(0.1, zoomRef.current + delta));
      setZoom(next);
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
        e.preventDefault();
        dragging.current = true;
        dragStart.current = { x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y };
      }
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setPanX(e.clientX - dragStart.current.x);
      setPanY(e.clientY - dragStart.current.y);
    };
    const onMouseUp = () => { dragging.current = false; };
    const onDblClick = () => { setPanX(0); setPanY(0); };

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('dblclick', onDblClick);
    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('dblclick', onDblClick);
    };
  }, []);

  useEffect(() => {
    const onResize = () => {
      if (currentAnimRef.current) {
        currentAnimRef.current.x = window.innerWidth * 0.5 + panRef.current.x;
        currentAnimRef.current.y = window.innerHeight * 0.5 + panRef.current.y;
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const tick = () => {
      if (currentAnimRef.current) {
        const t0 = performance.now();
        currentAnimRef.current.update(pixiApp.ticker.deltaMS / 1000);
        setUpdateTime(`update time: ${(performance.now() - t0).toFixed(4)} ms`);
      }
    };
    pixiApp.ticker.add(tick);
    return () => pixiApp.ticker.remove(tick);
  }, []);

  const selectAnimation = useCallback((name: string) => {
    if (currentAnimRef.current) currentAnimRef.current.state.setAnimation(0, name, loopRef.current);
  }, []);

  const toggleSkin = useCallback((skinName: string) => {
    setActiveSkins(prev => {
      const next = new Set(prev);
      next.has(skinName) ? next.delete(skinName) : next.add(skinName);
      const anim = currentAnimRef.current;
      if (anim) {
        const customSkin = new spine.Skin('custom');
        next.forEach(partName => {
          const part = anim.skeleton.data.findSkin(partName);
          if (part) customSkin.addSkin(part);
        });
        anim.skeleton.setSkin(customSkin);
        anim.skeleton.setSlotsToSetupPose();
      }
      return next;
    });
  }, []);

  const handleLoop = useCallback((val: boolean) => {
    setLoop(val);
    const track = currentAnimRef.current?.state.tracks[0];
    if (track) currentAnimRef.current.state.setAnimation(0, track.animation.name, val);
  }, []);

  return html`<${Fragment}>
    <div class="title-container">
      <${FileSelector} files=${SPINES} selected=${selectedFile} onChange=${setSelectedFile} />
      <${StatusBar} version=${version} updateTime=${updateTime} />
      <${Controls} zoom=${zoom} onZoom=${setZoom} loop=${loop} onLoop=${handleLoop} />
    </div>
    <div class="main-container">
      <${AnimationList} animations=${animations} onSelect=${selectAnimation} />
      <${SkinsPanel} skins=${skins} activeSkins=${activeSkins} onToggle=${toggleSkin} />
    </div>
  </${Fragment}>`;
}
