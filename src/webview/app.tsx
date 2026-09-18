import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { FileSelector } from './components/file-selector';
import { Controls } from './components/controls';
import type { BackgroundId } from './components/controls';
import { StatusBar } from './components/status-bar';
import { AnimationList } from './components/animation-list';
import { SkinsPanel } from './components/skins-panel';
import { TracksPanel } from './components/tracks-panel';
import { TimelinePanel } from './components/timeline-panel';
import { clampZoom, ZOOM_WHEEL_SENSITIVITY } from './zoom';

const DEFAULT_BACKGROUND: BackgroundId = 'checker';
const DEFAULT_ZOOM = 1;
const DEFAULT_SPEED = 1;
const ORIGIN = { x: 0, y: 0 };

const LEFT_MOUSE_BUTTON = 0;
const MIDDLE_MOUSE_BUTTON = 1;

// Spine stores times in seconds and has no notion of frames, so stepping picks
// the rate most skeletons are authored at.
const FRAME_SECONDS = 1 / 30;

// The stats readout is written straight into the DOM every few frames instead
// of living in state: at 60 fps a state update would re-render the whole tree,
// animation list included, and the meter would become the thing it measures.
// The playhead is written the same way, for the same reason.
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
}
/* Everything right of the left panel is canvas. The timeline is pushed to the
   bottom of that column so it never covers the panels beside it. */
.stage-column {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    flex: 1;
    min-width: 0;
}`;

type Pan = { x: number; y: number };

function isOverPanel(target: EventTarget | null) {
  return target instanceof Element && target.closest('[data-panel]') !== null;
}

// A range keeps its own arrow-key handling, so only the real text-entry widgets
// are allowed to swallow the playback shortcuts.
function isTextEntry(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return true;
  return target instanceof HTMLInputElement && target.type !== 'range';
}

function isRangeInput(target: EventTarget | null) {
  return target instanceof HTMLInputElement && target.type === 'range';
}

function applyTransform(anim: SpineInstance, zoom: number, pan: Pan) {
  anim.x = window.innerWidth * 0.5 + pan.x;
  anim.y = window.innerHeight * 0.5 + pan.y;
  anim.scale.set(zoom);
}

// A looping entry keeps counting past the end of the animation, so the position
// on the timeline is the remainder rather than `trackTime` itself.
function positionInAnimation(entry: SpineTrackEntry) {
  const { duration } = entry.animation;
  if (duration <= 0) return 0;
  return entry.loop ? entry.trackTime % duration : Math.min(entry.trackTime, duration);
}

// Manual seeking is deliberately independent of `loop`: stepping or scrubbing
// stops on 0 and on the last frame instead of wrapping, so the ends of the
// animation stay reachable. Looping only governs what playback does there.
function clampTime(time: number, duration: number) {
  if (duration <= 0) return 0;
  return Math.min(Math.max(time, 0), duration);
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
  const [background, setBackground] = useState<BackgroundId>(DEFAULT_BACKGROUND);
  const [version, setVersion] = useState('');
  const [animations, setAnimations] = useState<readonly SpineAnimation[]>([]);
  const [skins, setSkins] = useState<readonly SpineSkin[]>([]);
  const [activeSkins, setActiveSkins] = useState<ReadonlySet<string>>(new Set());
  const [activeTrack, setActiveTrack] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [loop, setLoop] = useState(true);
  const [speed, setSpeed] = useState(DEFAULT_SPEED);
  const [trackAnimation, setTrackAnimation] = useState<SpineAnimation | null>(null);

  const currentAnimRef = useRef<SpineInstance | null>(null);
  const statsRef = useRef<HTMLSpanElement | null>(null);
  const scrubberRef = useRef<HTMLInputElement | null>(null);
  const timeLabelRef = useRef<HTMLSpanElement | null>(null);
  const playingRef = useRef(playing);
  const loopRef = useRef(loop);
  const speedRef = useRef(speed);
  const activeTrackRef = useRef(activeTrack);
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  const dragging = useRef(false);
  const dragStart = useRef(ORIGIN);

  const currentEntry = useCallback(() => currentAnimRef.current?.state.tracks[activeTrackRef.current] ?? null, []);

  const syncTimelineDom = useCallback(() => {
    const entry = currentEntry();
    const time = entry ? positionInAnimation(entry) : 0;
    if (scrubberRef.current) scrubberRef.current.value = String(time);
    if (timeLabelRef.current) timeLabelRef.current.textContent = `${time.toFixed(3)}s`;
  }, [currentEntry]);

  // The ticker reads `playingRef` in the same frame a scrub writes it, so the
  // ref cannot wait for the effect that normally mirrors state.
  const applyPlaying = useCallback((value: boolean) => {
    playingRef.current = value;
    setPlaying(value);
  }, []);

  const seekTo = useCallback(
    (time: number) => {
      const anim = currentAnimRef.current;
      const entry = currentEntry();
      if (!anim || !entry) return;
      // A looping entry wraps both `trackTime` and the pose at the end of the
      // animation, so the last frame could never be held still. Manual seeking
      // owns the flag and turns it off; starting playback puts it back.
      entry.loop = false;
      entry.trackTime = time;
      // Without moving the event window with the playhead, scrubbing backwards
      // replays every event between the old and the new position.
      entry.animationLast = time;
      entry.nextAnimationLast = time;
      anim.update(0);
      syncTimelineDom();
    },
    [currentEntry, syncTimelineDom],
  );

  const scrub = useCallback(
    (time: number) => {
      applyPlaying(false);
      seekTo(time);
    },
    [applyPlaying, seekTo],
  );

  const stepFrames = useCallback(
    (frames: number) => {
      const entry = currentEntry();
      if (!entry) return;
      applyPlaying(false);
      seekTo(clampTime(positionInAnimation(entry) + frames * FRAME_SECONDS, entry.animation.duration));
    },
    [applyPlaying, currentEntry, seekTo],
  );

  const startPlaying = useCallback(() => {
    const entry = currentEntry();
    if (entry) {
      const { duration } = entry.animation;
      // A finished one-shot and a manual step to the last frame both sit exactly
      // on the end; pressing play there should replay rather than do nothing.
      if (duration > 0 && entry.trackTime >= duration) seekTo(0);
      // Ordered after the seek, which clears the flag.
      entry.loop = loopRef.current;
    }
    applyPlaying(true);
  }, [applyPlaying, currentEntry, seekTo]);

  const togglePlay = useCallback(() => {
    if (playingRef.current) {
      applyPlaying(false);
      return;
    }
    startPlaying();
  }, [applyPlaying, startPlaying]);

  const selectAnimation = useCallback(
    (name: string) => {
      const anim = currentAnimRef.current;
      if (!anim) return;
      const entry = anim.state.setAnimation(activeTrackRef.current, name, loopRef.current);
      setTrackAnimation(entry.animation);
      applyPlaying(true);
    },
    [applyPlaying],
  );

  const handleLoop = useCallback(
    (value: boolean) => {
      setLoop(value);
      loopRef.current = value;
      // Flipping the flag on the live entry keeps the playhead where it is;
      // re-running setAnimation would snap it back to zero. While paused the
      // entry stays unlooped - seeking owns it - and the next play applies this.
      const entry = currentEntry();
      if (entry && playingRef.current) entry.loop = value;
    },
    [currentEntry],
  );

  const handleSpeed = useCallback((value: number) => {
    speedRef.current = value;
    setSpeed(value);
  }, []);

  const resetView = useCallback(() => {
    setZoom(DEFAULT_ZOOM);
    setPan(ORIGIN);
  }, []);

  useEffect(() => {
    activeTrackRef.current = activeTrack;
    setTrackAnimation(currentAnimRef.current?.state.tracks[activeTrack]?.animation ?? null);
  }, [activeTrack]);

  // Runs after the scrubber has re-rendered with the new `max`, which would
  // otherwise clamp whatever position was written before it.
  useEffect(() => {
    syncTimelineDom();
  }, [trackAnimation, syncTimelineDom]);

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
    activeTrackRef.current = 0;
    setActiveTrack(0);
    const entry = anim.state.tracks[0];
    if (entry) entry.loop = loopRef.current;
    setTrackAnimation(entry?.animation ?? null);
    applyPlaying(true);
  }, [selectedFile, spineInstances, applyPlaying]);

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
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (isTextEntry(e.target)) return;
      if (e.code === 'Space') {
        // Also stops the focused button from firing its own click.
        e.preventDefault();
        togglePlay();
        return;
      }
      // The scrubber already seeks with the arrow keys.
      if (isRangeInput(e.target)) return;
      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        stepFrames(-1);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        stepFrames(1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [togglePlay, stepFrames]);

  useEffect(() => {
    let smoothedUpdateMs = 0;
    let smoothedFps = 0;
    let lastFlush = 0;

    const tick = () => {
      const anim = currentAnimRef.current;
      if (!anim) return;
      const startedAt = performance.now();
      // Pausing is a zero delta rather than a skipped update, so the pose is
      // still re-applied and a scrub or a skin change lands on screen.
      const delta = playingRef.current ? (pixiApp.ticker.deltaMS / 1000) * speedRef.current : 0;
      anim.update(delta);
      const elapsed = performance.now() - startedAt;
      // While paused the playhead belongs to whoever is dragging it.
      if (playingRef.current) syncTimelineDom();
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
  }, [pixiApp, syncTimelineDom]);

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

  return (
    <>
      <div class="panel title-container" data-panel>
        <FileSelector files={SPINES} selected={selectedFile} onChange={setSelectedFile} />
        <StatusBar version={version} statsRef={statsRef} />
        <Controls
          zoom={zoom}
          onZoom={setZoom}
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
        <div class="stage-column">
          <TimelinePanel
            animation={trackAnimation}
            playing={playing}
            loop={loop}
            speed={speed}
            onTogglePlay={togglePlay}
            onScrub={scrub}
            onStep={stepFrames}
            onLoop={handleLoop}
            onSpeed={handleSpeed}
            scrubberRef={scrubberRef}
            timeLabelRef={timeLabelRef}
          />
        </div>
      </div>
    </>
  );
}
