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
  Application: new (options: { background: string; resizeTo: HTMLElement }) => PIXIApplication;
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

// --- Preact types ---
type VNode = object | string | number | boolean | null | undefined;

declare const preact: {
  h: (type: string | Function, props?: Record<string, unknown> | null, ...children: VNode[]) => VNode;
  render: (vnode: VNode | null, parent: Element) => void;
  Fragment: Function;
};

declare const preactHooks: {
  useState: <T>(initialState: T | (() => T)) => [T, (value: T | ((prev: T) => T)) => void];
  useRef: <T>(initialValue: T) => { current: T };
  useEffect: (effect: () => void | (() => void), deps?: ReadonlyArray<unknown>) => void;
  useCallback: <T extends (...args: unknown[]) => unknown>(callback: T, deps: ReadonlyArray<unknown>) => T;
};

declare const htm: { bind: (h: typeof preact.h) => (strings: TemplateStringsArray, ...values: unknown[]) => VNode };

declare const PIXI: PIXINamespace;
declare const spine: SpineNamespace;

declare const SPINES: Array<{ name: string; uri: string }>;
declare const ATLAS_URI: string;
