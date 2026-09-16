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
  animation: { name: string };
}

interface SpineAnimationState {
  setAnimation(trackIndex: number, name: string, loop: boolean): void;
  tracks: (SpineTrackEntry | null)[];
}

interface SpineInstance extends PIXIDisplayObject {
  x: number;
  y: number;
  scale: { set(value: number): void };
  skeleton: SpineSkeleton;
  state: SpineAnimationState;
  autoUpdate: boolean;
  update(dt: number): void;
}

// --- PIXI types ---
interface PIXIDisplayObject {
  visible: boolean;
}

interface PIXITexture {
  readonly width: number;
  readonly height: number;
}

interface PIXITilingSprite extends PIXIDisplayObject {
  width: number;
  height: number;
}

interface PIXIAssetAddOptions {
  alias: string;
  src: string;
}

interface PIXITicker {
  deltaMS: number;
  add(fn: () => void): void;
  remove(fn: () => void): void;
  start(): void;
  stop(): void;
}

interface PIXIContainer {
  addChild(child: PIXIDisplayObject): void;
  addChildAt(child: PIXIDisplayObject, index: number): void;
}

// Optional: the accessor only exists on the PIXI v7 background system, and a
// missing one must degrade to "colour stays as constructed", not to a crash.
interface PIXIRenderer {
  background?: { color: number };
  resize(width: number, height: number): void;
}

interface PIXIApplication {
  view: HTMLCanvasElement;
  stage: PIXIContainer;
  ticker: PIXITicker;
  renderer: PIXIRenderer;
}

interface PIXINamespace {
  Application: new (options: { background: string; width: number; height: number }) => PIXIApplication;
  Texture: {
    from(source: HTMLCanvasElement): PIXITexture;
  };
  TilingSprite: new (texture: PIXITexture, width: number, height: number) => PIXITilingSprite;
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
