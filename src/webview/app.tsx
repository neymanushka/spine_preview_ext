import { useMemo, useRef, useState } from 'preact/hooks';
import type { Spine } from '@esotericsoftware/spine-pixi-v8';
import type { Ticker } from 'pixi.js';
import { FileSelector } from './components/file-selector';
import { Notice } from './components/notice';
import { OverlaysPanel } from './components/overlays-panel';
import { DEFAULT_OVERLAYS, overlayAvailability } from './debug-overlays';
import { Controls } from './components/controls';
import { StatusBar } from './components/status-bar';
import { AnimationList } from './components/animation-list';
import { SkinsPanel } from './components/skins-panel';
import { TracksPanel } from './components/tracks-panel';
import { TimelinePanel } from './components/timeline-panel';
import { EventLog } from './components/event-log';
import type { PerformanceProfiler } from './performance-stats';
import { PerformancePanel } from './components/performance-panel';
import { usePlayback } from './hooks/use-playback';
import { useSelectedSkeleton } from './hooks/use-selected-skeleton';
import { usePreviewCamera } from './hooks/use-preview-camera';
import { usePreviewFrame } from './hooks/use-preview-frame';

export const appStyles = `
.title-container {
    z-index: 2;
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
@media (max-width: 700px) {
    .title-container { gap: var(--sp-2); }
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

export function App({
  spineInstances,
  skeletonErrors,
  ticker,
  profiler,
  canvasContainer,
}: {
  spineInstances: Record<string, Spine>;
  skeletonErrors: Readonly<Record<string, string>>;
  ticker: Ticker;
  profiler: PerformanceProfiler;
  canvasContainer: HTMLElement;
}) {
  const currentAnimRef = useRef<Spine | null>(null);
  const [selectedFile, setSelectedFile] = useState(
    SPINES.find(({ name }) => spineInstances[name])?.name ?? SPINES[0]?.name ?? '',
  );

  const [overlays, setOverlays] = useState(DEFAULT_OVERLAYS);
  const [overlaysHidden, setOverlaysHidden] = useState(false);

  const availableOverlays = useMemo(
    () => overlayAvailability(spineInstances[selectedFile]),
    [selectedFile, spineInstances],
  );

  const { zoom, setZoom, background, setBackground, resetView, applyView } = usePreviewCamera(
    currentAnimRef,
    canvasContainer,
  );
  const skeleton = spineInstances[selectedFile];
  const { version, animations, physics, skins, activeSkins, toggleSkin } = useSelectedSkeleton({
    skeleton,
    currentAnimRef,
    applyView,
    profiler,
  });
  const {
    activeTrack,
    playing,
    loop,
    speed,
    trackAnimation,
    trackAnimations,
    playingRef,
    speedRef,
    scrubberRef,
    timeLabelRef,
    eventLogRef,
    flashMarkerRef,
    syncTimelineDom,
    selectAnimation,
    setActiveTrack,
    clearTrack,
    togglePlay,
    scrub,
    stepFrames,
    handleLoop,
    handleSpeed,
  } = usePlayback({ skeleton, currentAnimRef });
  const statsRef = usePreviewFrame({
    selectedFile,
    spineInstances,
    currentAnimRef,
    ticker,
    profiler,
    playingRef,
    speedRef,
    overlays,
    overlaysHidden,
    syncTimelineDom,
  });

  if (skeletonErrors[selectedFile] !== undefined) {
    return (
      <>
        <div class="panel title-container" data-panel>
          <FileSelector files={SPINES} errors={skeletonErrors} selected={selectedFile} onChange={setSelectedFile} />
        </div>
        <Notice kind="error" title={`Could not load ${selectedFile}`} detail={skeletonErrors[selectedFile]} />
      </>
    );
  }

  return (
    <>
      <div class="panel title-container" data-panel>
        <FileSelector files={SPINES} errors={skeletonErrors} selected={selectedFile} onChange={setSelectedFile} />
        <StatusBar version={version} statsRef={statsRef} />
        <Controls
          zoom={zoom}
          onZoom={setZoom}
          background={background}
          onBackground={setBackground}
          onResetView={resetView}
        />
        <PerformancePanel
          skeleton={skeleton}
          profiler={profiler}
          overlaysVisible={!overlaysHidden && Object.values(overlays).some(Boolean)}
          onHideOverlays={() => setOverlaysHidden(true)}
        />
        <OverlaysPanel
          options={overlays}
          hidden={overlaysHidden}
          available={availableOverlays}
          onChange={setOverlays}
          onHiddenChange={setOverlaysHidden}
        />
      </div>
      <div class="main-container">
        <div class="left-panel">
          <AnimationList
            animations={animations}
            physics={physics}
            trackAnimations={trackAnimations}
            activeTrack={activeTrack}
            onSelect={selectAnimation}
          />
          <SkinsPanel skins={skins} activeSkins={activeSkins} onToggle={toggleSkin} />
          <TracksPanel
            activeTrack={activeTrack}
            trackAnimations={trackAnimations}
            onSelect={setActiveTrack}
            onClear={clearTrack}
          />
        </div>
        <div class="stage-column">
          <EventLog handleRef={eventLogRef} />
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
            flashRef={flashMarkerRef}
          />
        </div>
      </div>
    </>
  );
}
