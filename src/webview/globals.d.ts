// Ambient declarations for the UMD libraries the extension host injects as
// <script> tags (see src/extension.ts) and for the globals it writes into the
// page. Preact is bundled from npm, so its types come from the package itself.

// --- Spine types ---
interface SpineEventData {
  name: string;
}

interface SpineEvent {
  data: SpineEventData;
  time: number;
}

interface SpineTimeline {
  events?: SpineEvent[];
}

interface SpineAnimation {
  name: string;
  duration: number;
  timelines: SpineTimeline[];
}

interface SpineSkin {
  name: string;
  addSkin(skin: SpineSkin): void;
}

interface SpineSkeletonData {
  version: string;
  animations: SpineAnimation[];
  skins: SpineSkin[];
  findSkin(name: string): SpineSkin | null;
}

interface SpineSkeleton {
  data: SpineSkeletonData;
  setSkin(skin: SpineSkin): void;
  setSlotsToSetupPose(): void;
}

interface SpineTrackEntry {
  animation: SpineAnimation;
  loop: boolean;
  // Seconds played on the track. It keeps growing past `animation.duration`
  // when the entry loops, so the position inside the animation is the
  // remainder - see positionInAnimation() in app.tsx.
  trackTime: number;
  // The window `apply()` fires events for. Scrubbing has to move both markers
  // with `trackTime`, or every event between the old and the new position
  // replays on the next frame.
  animationLast: number;
  nextAnimationLast: number;
}

// The runtime guards every callback with a truthiness check, so a listener may
// declare only the ones it wants. The others (start, interrupt, end, dispose,
// complete) are left out until something needs them.
interface SpineAnimationStateListener {
  event?(entry: SpineTrackEntry, event: SpineEvent): void;
}

interface SpineAnimationState {
  setAnimation(trackIndex: number, name: string, loop: boolean): SpineTrackEntry;
  tracks: (SpineTrackEntry | null)[];
  addListener(listener: SpineAnimationStateListener): void;
  removeListener(listener: SpineAnimationStateListener): void;
}

interface SpineInstance {
  visible: boolean;
  x: number;
  y: number;
  scale: { set(value: number): void };
  skeleton: SpineSkeleton;
  state: SpineAnimationState;
  autoUpdate: boolean;
  update(dt: number): void;
}

// --- PIXI types ---
interface PIXIAssetAddOptions {
  alias: string;
  src: string;
}

interface PIXITicker {
  deltaMS: number;
  add(fn: () => void): void;
  remove(fn: () => void): void;
}

interface PIXIContainer {
  addChild(child: SpineInstance): void;
}

interface PIXIApplication {
  view: HTMLCanvasElement;
  stage: PIXIContainer;
  ticker: PIXITicker;
}

interface PIXINamespace {
  Application: new (options: { backgroundAlpha: number; resizeTo: HTMLElement }) => PIXIApplication;
  Assets: {
    add(options: PIXIAssetAddOptions): void;
    load(aliases: string[]): Promise<void>;
  };
}

interface SpineNamespace {
  Spine: {
    from(options: { skeleton: string; atlas: string }): SpineInstance;
  };
  Skin: new (name: string) => SpineSkin;
}

declare const PIXI: PIXINamespace;
declare const spine: SpineNamespace;

declare const SPINES: Array<{ name: string; uri: string }>;
declare const ATLAS_URI: string;
