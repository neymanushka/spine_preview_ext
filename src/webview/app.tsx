import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { FileSelector } from './components/file-selector';
import { Controls } from './components/controls';
import type { BackgroundId } from './components/controls';
import { StatusBar } from './components/status-bar';
import { AnimationList } from './components/animation-list';
import { SkinsPanel } from './components/skins-panel';
import { TracksPanel } from './components/tracks-panel';
import { clampZoom, ZOOM_WHEEL_SENSITIVITY } from './zoom';

const DEFAULT_BACKGROUND: BackgroundId = 'checker';
const DEFAULT_ZOOM = 1;
const ORIGIN = { x: 0, y: 0 };

const LEFT_MOUSE_BUTTON = 0;
const MIDDLE_MOUSE_BUTTON = 1;

// The stats readout is written straight into the DOM every few frames instead
// of living in state: at 60 fps a state update would re-render the whole tree,
// animation list included, and the meter would become the thing it measures.
const STATS_SMOOTHING = 0.1;
const STATS_FLUSH_INTERVAL_MS = 250;

export const appStyles = `
.title-container {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    position: fixed;
    top: var(--sp-2);
    left: var(--sp-2);
    right: var(--sp-2);
    height: 42px;
    padding: 0 var(--sp-3);
    overflow: hidden;
    user-select: none;
}
.main-container {
    display: flex;
    flex-direction: row;
    gap: var(--sp-2);
    position: fixed;
    left: var(--sp-2);
    right: var(--sp-2);
    bottom: var(--sp-2);
    top: calc(42px + var(--sp-2) * 2);
}
.left-panel {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
    width: 240px;
    height: 100%;
    min-height: 0;
}
.left-panel > * {
    flex: 1;
    min-height: 0;
}`;

type Pan = { x: number; y: number };

function isOverPanel(target: EventTarget | null) {
  return target instanceof Element && target.closest('[data-panel]') !== null;
}

function applyTransform(anim: SpineInstance, zoom: number, pan: Pan) {
  anim.x = window.innerWidth * 0.5 + pan.x;
  anim.y = window.innerHeight * 0.5 + pan.y;
  anim.scale.set(zoom);
}

export function App({
  spineInstances,
  pixiApp,
  canvasContainer,
}: {
  spineInstances: Record<string, SpineInstance>;
  pixiApp: PIXIApplication;
  canvasContainer: HTMLElement;
}) {
  const [selectedFile, setSelectedFile] = useState(SPINES[0]?.name ?? '');
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [pan, setPan] = useState<Pan>(ORIGIN);
  const [loop, setLoop] = useState(true);
  const [background, setBackground] = useState<BackgroundId>(DEFAULT_BACKGROUND);
  const [version, setVersion] = useState('');
  const [animations, setAnimations] = useState<readonly SpineAnimation[]>([]);
  const [skins, setSkins] = useState<readonly SpineSkin[]>([]);
  const [activeSkins, setActiveSkins] = useState<ReadonlySet<string>>(new Set());
  const [activeTrack, setActiveTrack] = useState(0);

  const currentAnimRef = useRef<SpineInstance | null>(null);
  const statsRef = useRef<HTMLSpanElement | null>(null);
  const loopRef = useRef(loop);
  const activeTrackRef = useRef(activeTrack);
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  const dragging = useRef(false);
  const dragStart = useRef(ORIGIN);

  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);

  useEffect(() => {
    activeTrackRef.current = activeTrack;
  }, [activeTrack]);

  useEffect(() => {
    zoomRef.current = zoom;
    panRef.current = pan;
    if (currentAnimRef.current) applyTransform(currentAnimRef.current, zoom, pan);
  }, [zoom, pan]);

  useEffect(() => {
    canvasContainer.className = `bg-${background}`;
  }, [background, canvasContainer]);

  useEffect(() => {
    if (!selectedFile) return;
    if (currentAnimRef.current) currentAnimRef.current.visible = false;
    const anim = spineInstances[selectedFile];
    if (!anim) return;
    anim.visible = true;
    applyTransform(anim, zoomRef.current, panRef.current);
    currentAnimRef.current = anim;
    setVersion(anim.skeleton.data.version || 'unknown');
    setAnimations([...anim.skeleton.data.animations]);
    setSkins([...anim.skeleton.data.skins]);
    setActiveSkins(new Set());
    setActiveTrack(0);
  }, [selectedFile, spineInstances]);

  const resetView = useCallback(() => {
    setZoom(DEFAULT_ZOOM);
    setPan(ORIGIN);
  }, []);

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      // Over a panel the wheel belongs to that panel's scrollbar, not the camera.
      if (isOverPanel(e.target)) return;
      e.preventDefault();
      const current = zoomRef.current;
      const next = clampZoom(current * Math.exp(-e.deltaY * ZOOM_WHEEL_SENSITIVITY));
      if (next === current) return;
      const ratio = next / current;
      // Keep whatever sits under the cursor pinned to the cursor.
      zoomRef.current = next;
      setPan((prev) => ({
        x: e.clientX + (window.innerWidth * 0.5 + prev.x - e.clientX) * ratio - window.innerWidth * 0.5,
        y: e.clientY + (window.innerHeight * 0.5 + prev.y - e.clientY) * ratio - window.innerHeight * 0.5,
      }));
      setZoom(next);
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (isOverPanel(e.target)) return;
      const isPanGesture = e.button === MIDDLE_MOUSE_BUTTON || (e.button === LEFT_MOUSE_BUTTON && e.shiftKey);
      if (!isPanGesture) return;
      e.preventDefault();
      dragging.current = true;
      dragStart.current = { x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y };
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setPan({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
    };
    const onMouseUp = () => {
      dragging.current = false;
    };
    const onDblClick = (e: MouseEvent) => {
      if (isOverPanel(e.target)) return;
      resetView();
    };
    const onResize = () => {
      if (currentAnimRef.current) applyTransform(currentAnimRef.current, zoomRef.current, panRef.current);
    };

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('dblclick', onDblClick);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('dblclick', onDblClick);
      window.removeEventListener('resize', onResize);
    };
  }, [resetView]);

  useEffect(() => {
    let smoothedUpdateMs = 0;
    let smoothedFps = 0;
    let lastFlush = 0;

    const tick = () => {
      const anim = currentAnimRef.current;
      if (!anim) return;
      const startedAt = performance.now();
      anim.update(pixiApp.ticker.deltaMS / 1000);
      const elapsed = performance.now() - startedAt;
      const fps = pixiApp.ticker.deltaMS > 0 ? 1000 / pixiApp.ticker.deltaMS : 0;
      smoothedUpdateMs += (elapsed - smoothedUpdateMs) * STATS_SMOOTHING;
      smoothedFps += (fps - smoothedFps) * STATS_SMOOTHING;
      if (startedAt - lastFlush < STATS_FLUSH_INTERVAL_MS) return;
      lastFlush = startedAt;
      if (statsRef.current) {
        statsRef.current.textContent = `${smoothedUpdateMs.toFixed(2)} ms | ${Math.round(smoothedFps)} fps`;
      }
    };

    pixiApp.ticker.add(tick);
    return () => pixiApp.ticker.remove(tick);
  }, [pixiApp]);

  const selectAnimation = useCallback((name: string) => {
    currentAnimRef.current?.state.setAnimation(activeTrackRef.current, name, loopRef.current);
  }, []);

  const toggleSkin = useCallback((skinName: string) => {
    setActiveSkins((prev) => {
      const next = new Set(prev);
      if (next.has(skinName)) next.delete(skinName);
      else next.add(skinName);
      const anim = currentAnimRef.current;
      if (anim) {
        const customSkin = new spine.Skin('custom');
        next.forEach((partName) => {
          const part = anim.skeleton.data.findSkin(partName);
          if (part) customSkin.addSkin(part);
        });
        anim.skeleton.setSkin(customSkin);
        anim.skeleton.setSlotsToSetupPose();
      }
      return next;
    });
  }, []);

  const handleLoop = useCallback((value: boolean) => {
    setLoop(value);
    const trackIndex = activeTrackRef.current;
    const track = currentAnimRef.current?.state.tracks[trackIndex];
    if (track) currentAnimRef.current?.state.setAnimation(trackIndex, track.animation.name, value);
  }, []);

  return (
    <>
      <div class="panel title-container" data-panel>
        <FileSelector files={SPINES} selected={selectedFile} onChange={setSelectedFile} />
        <StatusBar version={version} statsRef={statsRef} />
        <Controls
          zoom={zoom}
          onZoom={setZoom}
          loop={loop}
          onLoop={handleLoop}
          background={background}
          onBackground={setBackground}
          onResetView={resetView}
        />
      </div>
      <div class="main-container">
        <div class="left-panel">
          <AnimationList animations={animations} onSelect={selectAnimation} />
          <SkinsPanel skins={skins} activeSkins={activeSkins} onToggle={toggleSkin} />
          <TracksPanel activeTrack={activeTrack} onSelect={setActiveTrack} />
        </div>
      </div>
    </>
  );
}
