import {
  AlphaTimeline,
  AttachmentTimeline,
  DeformTimeline,
  DrawOrderTimeline,
  EventTimeline,
  IkConstraintTimeline,
  PathConstraintMixTimeline,
  PathConstraintPositionTimeline,
  PathConstraintSpacingTimeline,
  PhysicsConstraintResetTimeline,
  PhysicsConstraintTimeline,
  RGB2Timeline,
  RGBA2Timeline,
  RGBATimeline,
  RGBTimeline,
  SequenceTimeline,
  TransformConstraintTimeline,
} from '@esotericsoftware/spine-pixi-v8';
import type { Animation, Timeline } from '@esotericsoftware/spine-pixi-v8';

// Bone and slot transforms are counted rather than listed, so they are left out
// of this table; everything else a timeline can drive gets a label, in the
// order the labels are shown.
const TIMELINE_KINDS: readonly (readonly [abstract new (...args: never[]) => Timeline, string])[] = [
  [AttachmentTimeline, 'attachments'],
  [RGBATimeline, 'color'],
  [RGBTimeline, 'color'],
  [AlphaTimeline, 'color'],
  [RGBA2Timeline, 'color'],
  [RGB2Timeline, 'color'],
  [DeformTimeline, 'deform'],
  [SequenceTimeline, 'sequence'],
  [DrawOrderTimeline, 'draw order'],
  [IkConstraintTimeline, 'IK'],
  [TransformConstraintTimeline, 'transform'],
  [PathConstraintPositionTimeline, 'path'],
  [PathConstraintSpacingTimeline, 'path'],
  [PathConstraintMixTimeline, 'path'],
  [PhysicsConstraintTimeline, 'physics'],
  [PhysicsConstraintResetTimeline, 'physics'],
];

const KIND_ORDER = [...new Set(TIMELINE_KINDS.map(([, kind]) => kind))];

function plural(count: number, noun: string, nouns = `${noun}s`) {
  return `${count} ${count === 1 ? noun : nouns}`;
}

// One line naming what an animation drives, e.g. "6 bones · 2 slots · deform".
export function describeAnimation(animation: Animation) {
  const bones = new Set<number>();
  const slots = new Set<number>();
  const kinds = new Set<string>();
  for (const timeline of animation.timelines) {
    // BoneTimeline and SlotTimeline are interfaces, so there is no class to
    // test with instanceof - the index field is what marks them.
    if ('boneIndex' in timeline && typeof timeline.boneIndex === 'number') bones.add(timeline.boneIndex);
    if ('slotIndex' in timeline && typeof timeline.slotIndex === 'number') slots.add(timeline.slotIndex);
    const kind = TIMELINE_KINDS.find(([type]) => timeline instanceof type)?.[1];
    if (kind) kinds.add(kind);
  }
  const parts = [
    ...(bones.size > 0 ? [plural(bones.size, 'bone')] : []),
    ...(slots.size > 0 ? [plural(slots.size, 'slot')] : []),
    ...KIND_ORDER.filter((kind) => kinds.has(kind)),
  ];
  return parts.length > 0 ? parts.join(' · ') : 'keys nothing';
}

// A higher track overrides a lower one property by property, not bone by bone:
// a rotation on one track leaves another track's translation of the same bone
// alone. So two animations clash exactly where their property ids meet. Events
// are left out - every track fires its own.
const keyedProperties = new WeakMap<Animation, ReadonlySet<string>>();

function propertiesOf(animation: Animation) {
  const cached = keyedProperties.get(animation);
  if (cached) return cached;
  const ids = new Set(
    animation.timelines
      .filter((timeline) => !(timeline instanceof EventTimeline))
      .flatMap((timeline) => timeline.getPropertyIds()),
  );
  keyedProperties.set(animation, ids);
  return ids;
}

export function sharedPropertyCount(a: Animation, b: Animation) {
  const other = propertiesOf(b);
  let count = 0;
  for (const id of propertiesOf(a)) if (other.has(id)) count++;
  return count;
}

export type TrackConflict = {
  readonly track: number;
  readonly animation: string;
  readonly shared: number;
  // The other track sits above the one being picked for, so it wins on the
  // shared properties and this animation will not show there.
  readonly hidden: boolean;
};

// Conflicts are judged against the active track - the one the next selection
// goes to - so the list answers "what happens if I put this here".
export function trackConflicts(
  animation: Animation,
  trackAnimations: readonly (Animation | null)[],
  activeTrack: number,
): readonly TrackConflict[] {
  return trackAnimations.flatMap((other, track) => {
    if (!other || track === activeTrack) return [];
    const shared = sharedPropertyCount(animation, other);
    return shared > 0 ? [{ track, animation: other.name, shared, hidden: track > activeTrack }] : [];
  });
}

export function describeConflict({ track, animation, shared, hidden }: TrackConflict) {
  const properties = plural(shared, 'property', 'properties');
  return hidden
    ? `hidden by track ${track} (${animation}) on ${properties}`
    : `overrides track ${track} (${animation}) on ${properties}`;
}
