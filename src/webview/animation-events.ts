// Spine keeps events inside the animation's timelines rather than on the
// animation itself, so both the tooltip in the animation list and the markers
// on the timeline have to dig them out the same way.

export type AnimationEvent = {
  readonly name: string;
  readonly time: number;
};

function hasEvents(timeline: SpineTimeline): timeline is SpineTimeline & { events: SpineEvent[] } {
  return 'events' in timeline;
}

export function collectEvents(animation: SpineAnimation): readonly AnimationEvent[] {
  return animation.timelines
    .filter(hasEvents)
    .flatMap((timeline) => timeline.events)
    .map((event) => ({ name: event.data.name, time: event.time }))
    .sort((a, b) => a.time - b.time);
}
