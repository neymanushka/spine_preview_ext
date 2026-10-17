import { EventTimeline } from '@esotericsoftware/spine-pixi-v8';
import type { Animation } from '@esotericsoftware/spine-pixi-v8';

// Spine keeps events inside the animation's timelines rather than on the
// animation itself, so both the tooltip in the animation list and the markers
// on the timeline have to dig them out the same way.

export type AnimationEvent = {
  readonly name: string;
  readonly time: number;
};

export function collectEvents(animation: Animation): readonly AnimationEvent[] {
  return animation.timelines
    .filter((timeline) => timeline instanceof EventTimeline)
    .flatMap((timeline) => timeline.events)
    .map((event) => ({ name: event.data.name, time: event.time }))
    .sort((a, b) => a.time - b.time);
}
