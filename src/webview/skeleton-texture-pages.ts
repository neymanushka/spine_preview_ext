import { MeshAttachment, RegionAttachment, TextureAtlasRegion } from '@esotericsoftware/spine-pixi-v8';
import type { Spine, TextureAtlasPage } from '@esotericsoftware/spine-pixi-v8';

export function skeletonTexturePages(spine: Spine | undefined): TextureAtlasPage[] {
  const pages = new Set<TextureAtlasPage>();
  // Scan all skins, not just the current pose: animations can change attachments
  // and sequences can move between pages without changing the selected skeleton.
  for (const skin of spine?.skeleton.data.skins ?? []) {
    for (const { attachment } of skin.getAttachments()) {
      if (!(attachment instanceof RegionAttachment || attachment instanceof MeshAttachment)) continue;
      const regions = attachment.sequence?.regions ?? [attachment.region];
      for (const region of regions) {
        if (region instanceof TextureAtlasRegion) pages.add(region.page);
      }
    }
  }
  return [...pages];
}
