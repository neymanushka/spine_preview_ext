import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { RefObject } from 'preact';
import type { Animation, AnimationStateListener, Spine, TrackEntry } from '@esotericsoftware/spine-pixi-v8';
import type { EventLogHandle } from '../components/event-log';

const DEFAULT_SPEED = 1;
const DEFAULT_LOOP = true;
// Spine freezes an individual track at timeScale = 0; other entries keep advancing.
const PLAYING_TRACK_TIME_SCALE = 1;
// Spine stores times in seconds and has no notion of frames, so stepping picks
// the rate most skeletons are authored at.
const FRAME_SECONDS = 1 / 30;

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

// The runtime types `animation` as nullable - an entry that has been disposed
// drops it - so a missing one reads as an empty animation.
function entryDuration(entry: TrackEntry) {
  return entry.animation?.duration ?? 0;
}

// The runtime never empties a track on its own - `setAnimation` leaves the
// entry in place after a one-shot ends - so these names only change when a
// selection, a cleared track or a file switch changes them. `state.tracks` can end in empty
// slots, which are trimmed so the length is the number of tracks in use.
function trackAnimationNames(anim: Spine) {
  const names = anim.state.tracks.map((entry) => entry?.animation?.name ?? null);
  while (names.length > 0 && names[names.length - 1] === null) names.pop();
  return names;
}

// A looping entry keeps counting past the end of the animation, so the position
// on the timeline is the remainder rather than `trackTime` itself.
function positionInAnimation(entry: TrackEntry) {
  const duration = entryDuration(entry);
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

export function usePlayback({
  skeleton,
  currentAnimRef,
}: {
  skeleton: Spine | undefined;
  currentAnimRef: RefObject<Spine | null>;
}) {
  const [activeTrack, setActiveTrackState] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [trackLoops, setTrackLoops] = useState<ReadonlyMap<number, boolean>>(new Map());
  const loop = trackLoops.get(activeTrack) ?? DEFAULT_LOOP;
  const [speed, setSpeed] = useState(DEFAULT_SPEED);
  const [trackAnimation, setTrackAnimation] = useState<Animation | null>(null);
  const [trackAnimations, setTrackAnimations] = useState<readonly (string | null)[]>([]);

  const scrubberRef = useRef<HTMLInputElement | null>(null);
  const timeLabelRef = useRef<HTMLSpanElement | null>(null);
  const eventLogRef = useRef<EventLogHandle | null>(null);
  const flashMarkerRef = useRef<((time: number) => void) | null>(null);
  const trackLoopsRef = useRef(trackLoops);
  const speedRef = useRef(speed);
  const activeTrackRef = useRef(activeTrack);
  const currentEntry = useCallback(
    () => currentAnimRef.current?.state.tracks[activeTrackRef.current] ?? null,
    [currentAnimRef],
  );

  const syncTimelineDom = useCallback(() => {
    const entry = currentEntry();
    const time = entry ? positionInAnimation(entry) : 0;
    if (scrubberRef.current) scrubberRef.current.value = String(time);
    if (timeLabelRef.current) timeLabelRef.current.textContent = `${time.toFixed(3)}s`;
  }, [currentEntry]);

  const applyPlaying = useCallback(
    (value: boolean) => {
      const entry = currentEntry();
      if (!entry) return;
      entry.timeScale = value ? PLAYING_TRACK_TIME_SCALE : 0;
      setPlaying(value);
    },
    [currentEntry],
  );

  const setActiveTrack = useCallback(
    (track: number) => {
      activeTrackRef.current = track;
      setActiveTrackState(track);
      const entry = currentAnimRef.current?.state.tracks[track];
      setTrackAnimation(entry?.animation ?? null);
      setPlaying(!!entry && entry.timeScale !== 0);
    },
    [currentAnimRef],
  );

  const applyTrackLoops = useCallback((value: ReadonlyMap<number, boolean>) => {
    trackLoopsRef.current = value;
    setTrackLoops(value);
  }, []);

  // `eventsFrom` is the far end of the window `apply()` fires events for.
  // Collapsing it onto `time` - the default - is what stops a backwards scrub
  // from replaying everything in between; a forward step passes its previous
  // position instead, so the frames it skipped over still report.
  const seekTo = useCallback(
    (time: number, eventsFrom = time) => {
      const anim = currentAnimRef.current;
      const entry = currentEntry();
      if (!anim || !entry) return;
      // A looping entry wraps both `trackTime` and the pose at the end of the
      // animation, so the last frame could never be held still. Manual seeking
      // owns the flag and turns it off; starting playback puts it back.
      entry.loop = false;
      entry.trackTime = time;
      // `update()` promotes `nextAnimationLast` into `animationLast`, so the
      // second of the two is the one that actually decides the window.
      entry.animationLast = eventsFrom;
      entry.nextAnimationLast = eventsFrom;
      anim.update(0);
      syncTimelineDom();
    },
    [currentAnimRef, currentEntry, syncTimelineDom],
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
      const from = positionInAnimation(entry);
      const to = clampTime(from + frames * FRAME_SECONDS, entryDuration(entry));
      // Only a forward step reports what it crossed. Stepping back would have
      // to replay the whole span between the two positions to get there.
      seekTo(to, frames > 0 ? from : to);
    },
    [applyPlaying, currentEntry, seekTo],
  );

  const startPlaying = useCallback(() => {
    const entry = currentEntry();
    if (entry) {
      const duration = entryDuration(entry);
      // A finished one-shot and a manual step to the last frame both sit exactly
      // on the end; pressing play there should replay rather than do nothing.
      if (duration > 0 && entry.trackTime >= duration) seekTo(0);
    }
    if (entry) entry.loop = trackLoopsRef.current.get(activeTrackRef.current) ?? DEFAULT_LOOP;
    applyPlaying(true);
  }, [applyPlaying, currentEntry, seekTo]);

  const togglePlay = useCallback(() => {
    if (currentEntry()?.timeScale !== 0) {
      applyPlaying(false);
      return;
    }
    startPlaying();
  }, [applyPlaying, currentEntry, startPlaying]);

  const selectAnimation = useCallback(
    (name: string) => {
      const anim = currentAnimRef.current;
      if (!anim) return;
      const track = activeTrackRef.current;
      const entry = anim.state.setAnimation(track, name, trackLoopsRef.current.get(track) ?? DEFAULT_LOOP);
      setTrackAnimation(entry.animation);
      setTrackAnimations(trackAnimationNames(anim));
      applyPlaying(true);
    },
    [applyPlaying, currentAnimRef],
  );

  const clearTrack = useCallback(
    (track: number) => {
      const anim = currentAnimRef.current;
      if (!anim) return;
      anim.state.clearTrack(track);
      // clearTrack leaves the skeleton in its current pose. Going back to setup
      // and re-applying the remaining tracks drops only what this one keyed, and
      // the zero delta does it even while paused.
      anim.skeleton.setToSetupPose();
      anim.update(0);
      const names = trackAnimationNames(anim);
      setTrackAnimations(names);
      const loops = new Map(trackLoopsRef.current);
      for (const index of loops.keys()) {
        if (index === track || index >= names.length) loops.delete(index);
      }
      applyTrackLoops(loops);
      // The list ends one past the last track in use; if that free track was the
      // active one, it would drop out of the list as it shrinks.
      if (activeTrackRef.current > names.length) setActiveTrack(names.length);
      else if (track === activeTrackRef.current) setActiveTrack(track);
    },
    [applyTrackLoops, currentAnimRef, setActiveTrack],
  );

  const handleLoop = useCallback(
    (value: boolean) => {
      const loops = new Map(trackLoopsRef.current);
      loops.set(activeTrackRef.current, value);
      applyTrackLoops(loops);
      // Flipping the flag on the live entry keeps the playhead where it is;
      // re-running setAnimation would snap it back to zero. While paused the
      // entry stays unlooped - seeking owns it - and the next play applies this.
      const entry = currentEntry();
      if (entry && entry.timeScale !== 0) entry.loop = value;
    },
    [applyTrackLoops, currentEntry],
  );

  const handleSpeed = useCallback((value: number) => {
    speedRef.current = value;
    setSpeed(value);
  }, []);

  // Runs after the scrubber has re-rendered with the new `max`, which would
  // otherwise clamp whatever position was written before it.
  useEffect(() => {
    syncTimelineDom();
  }, [trackAnimation, syncTimelineDom]);

  useEffect(() => {
    if (!skeleton) return;
    activeTrackRef.current = 0;
    setActiveTrackState(0);
    applyTrackLoops(new Map());
    const firstAnim = skeleton.skeleton.data.animations[0];
    const entry = firstAnim ? skeleton.state.setAnimation(0, firstAnim.name, DEFAULT_LOOP) : null;
    setTrackAnimation(entry?.animation ?? null);
    setTrackAnimations(trackAnimationNames(skeleton));
    setPlaying(!!entry);
  }, [skeleton, applyTrackLoops]);

  // Only the runtime knows an event actually fired: deriving it from the
  // playhead would mean re-implementing the wrapping rules that decide when
  // `apply()` reports one.
  useEffect(() => {
    const anim = skeleton;
    if (!anim) return;
    const listener: AnimationStateListener = {
      event: (entry, event) => {
        eventLogRef.current?.(event.data.name);
        // The timeline only draws the active track, so that is the only entry
        // whose events have a marker to flash.
        if (entry === currentEntry()) flashMarkerRef.current?.(event.time);
      },
    };
    anim.state.addListener(listener);
    return () => anim.state.removeListener(listener);
  }, [skeleton, currentEntry]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (isTextEntry(e.target)) return;
      if (e.code === 'Space') {
        // Focused buttons own Space; canvas and range inputs keep the playback shortcut.
        if (e.target instanceof Element && e.target.closest('button')) return;
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

  return {
    activeTrack,
    playing,
    loop,
    speed,
    trackAnimation,
    trackAnimations,
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
  };
}
