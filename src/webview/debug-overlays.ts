import { BoundingBoxAttachment, MeshAttachment } from '@esotericsoftware/spine-pixi-v8';
import type { Spine, VertexAttachment } from '@esotericsoftware/spine-pixi-v8';
import { Graphics, GraphicsPath } from 'pixi.js';

export type OverlayOptions = {
  bones: boolean;
  mesh: boolean;
  bounds: boolean;
  origin: boolean;
};

export const DEFAULT_OVERLAYS: OverlayOptions = { bones: false, mesh: false, bounds: false, origin: false };

export function overlayAvailability(spine: Spine | undefined) {
  const attachments = spine?.skeleton.data.skins.flatMap((skin) => skin.getAttachments()) ?? [];
  return {
    mesh: attachments.some(({ attachment }) => attachment instanceof MeshAttachment),
    bounds: attachments.some(({ attachment }) => attachment instanceof BoundingBoxAttachment),
  };
}

// Kept separate from the artwork so hiding diagnostics never changes its pose,
// alpha or attachments. Coordinates are local to the Spine display object.
export class DebugOverlays {
  private readonly graphics = new Graphics({ label: 'Debug overlays' });
  private readonly vertices = new WeakMap<VertexAttachment, Float32Array>();

  constructor(private readonly spine: Spine) {
    this.graphics.eventMode = 'none';
    this.graphics.accessible = false;
    spine.addChild(this.graphics);
  }

  render(options: OverlayOptions, hidden: boolean) {
    const g = this.graphics;
    g.clear();
    g.visible = !hidden && Object.values(options).some(Boolean);
    if (!g.visible) return;
    const scale = Math.max(Math.abs(this.spine.scale.x), 0.001);
    const dot = 2.5 / scale;
    const skeleton = this.spine.skeleton;

    if (options.bones) {
      const path = new GraphicsPath();
      for (const bone of skeleton.bones) {
        if (!bone.active) continue;
        path
          .moveTo(bone.worldX, bone.worldY)
          .lineTo(bone.worldX + bone.data.length * bone.a, bone.worldY + bone.data.length * bone.c);
        // Zero-length bones still have a visible joint.
        path.circle(bone.worldX, bone.worldY, dot);
      }
      this.stroke(path, 0x25bdcf, scale);
    }

    for (const slot of skeleton.slots) {
      if (!slot.bone.active) continue;
      const attachment = slot.getAttachment();
      const mesh = options.mesh && attachment instanceof MeshAttachment;
      const bounds = options.bounds && attachment instanceof BoundingBoxAttachment;
      if (!mesh && !bounds) continue;
      // The instanceof checks above narrow to vertex attachments at runtime.
      const vertexAttachment = attachment as MeshAttachment | BoundingBoxAttachment;
      let vertices = this.vertices.get(vertexAttachment);
      if (!vertices || vertices.length !== vertexAttachment.worldVerticesLength) {
        vertices = new Float32Array(vertexAttachment.worldVerticesLength);
        this.vertices.set(vertexAttachment, vertices);
      }
      vertexAttachment.computeWorldVertices(slot, 0, vertices.length, vertices, 0, 2);
      if (mesh && attachment instanceof MeshAttachment) {
        const path = new GraphicsPath();
        const triangles = attachment.triangles;
        for (let i = 0; i < triangles.length; i += 3) {
          const a = triangles[i]! * 2;
          const b = triangles[i + 1]! * 2;
          const c = triangles[i + 2]! * 2;
          path
            .moveTo(vertices[a]!, vertices[a + 1]!)
            .lineTo(vertices[b]!, vertices[b + 1]!)
            .lineTo(vertices[c]!, vertices[c + 1]!)
            .closePath();
        }
        this.stroke(path, 0xe4a52b, scale);
      } else if (bounds && vertices.length >= 6) {
        this.stroke(new GraphicsPath().poly(Array.from(vertices)), 0xd765d5, scale);
      }
    }

    if (options.origin) {
      const length = 18 / scale;
      // Local (0, 0), independent of root-bone translation or animation.
      this.stroke(new GraphicsPath().moveTo(-dot, 0).lineTo(length, 0), 0xee6352, scale);
      this.stroke(new GraphicsPath().moveTo(0, dot).lineTo(0, -length), 0x59bf70, scale);
      const cross = new GraphicsPath().moveTo(-dot, -dot).lineTo(dot, dot).moveTo(-dot, dot).lineTo(dot, -dot);
      this.stroke(cross, 0xffffff, scale);
    }
  }

  private stroke(path: GraphicsPath, color: number, scale: number) {
    // A dark outer stroke keeps coloured lines visible over matching artwork
    // and light backgrounds. Both widths remain constant in screen pixels.
    this.graphics.path(path).stroke({ width: 3.5 / scale, color: 0x181818, alpha: 0.85 });
    this.graphics.path(path).stroke({ width: 1.5 / scale, color });
  }

  destroy() {
    this.graphics.destroy();
  }
}
