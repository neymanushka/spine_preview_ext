import { BlendMode, MeshAttachment, RegionAttachment } from '@esotericsoftware/spine-pixi-v8';
import type { Spine } from '@esotericsoftware/spine-pixi-v8';

const MODES = [
  [BlendMode.Normal, 'Normal'],
  [BlendMode.Additive, 'Additive'],
  [BlendMode.Multiply, 'Multiply'],
  [BlendMode.Screen, 'Screen'],
] as const;

export function collectBlendModes(spine: Spine | undefined) {
  const groups = MODES.map(([mode, label]) => ({ mode, label, slots: [] as string[] }));
  if (!spine?.isRenderable) return [];
  for (const slot of spine.skeleton.drawOrder) {
    const attachment = slot.getAttachment();
    if (!(attachment instanceof RegionAttachment || attachment instanceof MeshAttachment)) continue;
    if (spine._getCachedData(slot, attachment).skipRender) continue;
    groups.find(({ mode }) => mode === slot.data.blendMode)?.slots.push(slot.data.name);
  }
  return groups.filter(({ slots }) => slots.length > 0);
}
