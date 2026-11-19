import {
  BoundingBoxAttachment,
  ClippingAttachment,
  MeshAttachment,
  PathAttachment,
  RegionAttachment,
  VertexAttachment,
} from '@esotericsoftware/spine-pixi-v8';
import type { Bone, Slot, Spine } from '@esotericsoftware/spine-pixi-v8';
import { Container, Graphics, GraphicsPath, Text } from 'pixi.js';

const LABEL_FONT_SIZE_PX = 12;
const LABEL_JOINT_OFFSET_PX = 6;
const SLOT_LABEL_LINE_HEIGHT_PX = 16;
const BONE_LABEL_COLOR = 0xffffff;
const SLOT_LABEL_COLOR = 0xffdc87;

export type OverlayOptions = {
  bones: boolean;
  boneNames: boolean;
  slotNames: boolean;
  mesh: boolean;
  hull: boolean;
  regions: boolean;
  clipping: boolean;
  paths: boolean;
  bounds: boolean;
  origin: boolean;
};

export const DEFAULT_OVERLAYS: OverlayOptions = {
  bones: false,
  boneNames: false,
  slotNames: false,
  mesh: false,
  hull: false,
  regions: false,
  clipping: false,
  paths: false,
  bounds: false,
  origin: false,
};

export function overlayAvailability(spine: Spine | undefined) {
  const attachments = spine?.skeleton.data.skins.flatMap((skin) => skin.getAttachments()) ?? [];
  return {
    slotNames: !!spine?.skeleton.slots.length,
    mesh: attachments.some(({ attachment }) => attachment instanceof MeshAttachment),
    hull: attachments.some(({ attachment }) => attachment instanceof MeshAttachment && attachment.hullLength >= 6),
    regions: attachments.some(({ attachment }) => attachment instanceof RegionAttachment),
    clipping: attachments.some(({ attachment }) => attachment instanceof ClippingAttachment),
    paths: attachments.some(({ attachment }) => attachment instanceof PathAttachment),
    bounds: attachments.some(({ attachment }) => attachment instanceof BoundingBoxAttachment),
  };
}

function createNameLabel(container: Container, name: string, color: number) {
  const label = new Text({
    text: name,
    style: {
      fontFamily: 'sans-serif',
      fontSize: LABEL_FONT_SIZE_PX,
      fill: color,
      stroke: { color: 0x181818, width: 3 },
    },
    resolution: 2,
  });
  label.eventMode = 'none';
  label.accessible = false;
  container.addChild(label);
  return label;
}

// Kept separate from the artwork so hiding diagnostics never changes its pose,
// alpha or attachments. Coordinates are local to the Spine display object.
export class DebugOverlays {
  private readonly graphics = new Graphics({ label: 'Debug overlays' });
  private readonly boneNames = new Container({ label: 'Bone names' });
  private readonly slotNames = new Container({ label: 'Slot names' });
  private readonly boneLabels = new Map<Bone, Text>();
  private readonly slotLabels = new Map<Slot, Text>();
  private readonly slotRows = new Map<string, number>();
  private readonly vertices = new WeakMap<VertexAttachment | RegionAttachment, Float32Array>();

  constructor(private readonly spine: Spine) {
    this.graphics.eventMode = 'none';
    this.graphics.accessible = false;
    spine.addChild(this.graphics);
    for (const labels of [this.boneNames, this.slotNames]) {
      labels.eventMode = 'none';
      labels.interactiveChildren = false;
      labels.accessibleChildren = false;
      spine.addChild(labels);
    }
  }

  render(options: OverlayOptions, hidden: boolean) {
    const g = this.graphics;
    g.clear();
    g.visible = !hidden && Object.values(options).some(Boolean);
    this.boneNames.visible = !hidden && options.boneNames;
    this.slotNames.visible = !hidden && options.slotNames;
    if (!g.visible) return;
    const scale = Math.max(Math.abs(this.spine.scale.x), 0.001);
    const dot = 2.5 / scale;
    const skeleton = this.spine.skeleton;

    if (options.boneNames) {
      for (const bone of skeleton.bones) {
        let label = this.boneLabels.get(bone);
        if (!bone.active) {
          if (label) label.visible = false;
          continue;
        }
        if (!label) {
          label = createNameLabel(this.boneNames, bone.data.name, BONE_LABEL_COLOR);
          label.anchor.set(0, 1);
          this.boneLabels.set(bone, label);
        }
        label.visible = true;
        label.scale.set(1 / scale);
        label.position.set(bone.worldX + LABEL_JOINT_OFFSET_PX / scale, bone.worldY - LABEL_JOINT_OFFSET_PX / scale);
      }
    }

    if (options.bones || options.boneNames) {
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

    if (options.slotNames) this.drawSlotNames(scale);
    for (const slot of skeleton.slots) {
      if (!slot.bone.active) continue;
      const attachment = slot.getAttachment();
      if (options.regions && attachment instanceof RegionAttachment) {
        const vertices = this.vertexBuffer(attachment, 8);
        attachment.computeWorldVertices(slot, vertices, 0, 2);
        this.stroke(new GraphicsPath().poly(Array.from(vertices)), 0x599dff, scale);
        continue;
      }
      const mesh = (options.mesh || options.hull) && attachment instanceof MeshAttachment;
      const bounds = options.bounds && attachment instanceof BoundingBoxAttachment;
      const clipping = options.clipping && attachment instanceof ClippingAttachment;
      const paths = options.paths && attachment instanceof PathAttachment;
      if ((!mesh && !bounds && !clipping && !paths) || !(attachment instanceof VertexAttachment)) continue;
      const vertices = this.vertexBuffer(attachment, attachment.worldVerticesLength);
      attachment.computeWorldVertices(slot, 0, vertices.length, vertices, 0, 2);
      if (mesh && attachment instanceof MeshAttachment) {
        if (options.mesh) {
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
        }
        // Spine stores hull vertices first; hullLength counts coordinate values.
        if (options.hull && attachment.hullLength >= 6) {
          this.stroke(
            new GraphicsPath().poly(Array.from(vertices.subarray(0, attachment.hullLength))),
            0x65d68c,
            scale,
          );
        }
      } else if (paths && attachment instanceof PathAttachment) {
        this.drawPath(attachment, vertices, scale);
      } else if ((bounds || clipping) && vertices.length >= 6) {
        this.stroke(new GraphicsPath().poly(Array.from(vertices)), clipping ? 0xff7979 : 0xd765d5, scale);
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

  private drawSlotNames(scale: number) {
    this.slotRows.clear();
    for (const slot of this.spine.skeleton.slots) {
      const bone = slot.bone;
      let label = this.slotLabels.get(slot);
      if (!bone.active) {
        if (label) label.visible = false;
        continue;
      }
      if (!label) {
        label = createNameLabel(this.slotNames, slot.data.name, SLOT_LABEL_COLOR);
        this.slotLabels.set(slot, label);
      }
      const joint = `${Math.round(bone.worldX * scale)},${Math.round(bone.worldY * scale)}`;
      const row = this.slotRows.get(joint) ?? 0;
      this.slotRows.set(joint, row + 1);
      label.visible = true;
      label.scale.set(1 / scale);
      label.position.set(
        bone.worldX + LABEL_JOINT_OFFSET_PX / scale,
        bone.worldY + (LABEL_JOINT_OFFSET_PX + row * SLOT_LABEL_LINE_HEIGHT_PX) / scale,
      );
    }
  }

  private vertexBuffer(attachment: VertexAttachment | RegionAttachment, length: number) {
    let vertices = this.vertices.get(attachment);
    if (!vertices || vertices.length !== length) {
      vertices = new Float32Array(length);
      this.vertices.set(attachment, vertices);
    }
    return vertices;
  }

  private drawPath(attachment: PathAttachment, vertices: Float32Array, scale: number) {
    if (vertices.length < (attachment.closed ? 6 : 12)) return;
    const curve = new GraphicsPath();
    const handles = new GraphicsPath();
    const segment = (start: number, control1: number, control2: number, end: number) => {
      curve
        .moveTo(vertices[start]!, vertices[start + 1]!)
        .bezierCurveTo(
          vertices[control1]!,
          vertices[control1 + 1]!,
          vertices[control2]!,
          vertices[control2 + 1]!,
          vertices[end]!,
          vertices[end + 1]!,
        );
      handles.moveTo(vertices[start]!, vertices[start + 1]!).lineTo(vertices[control1]!, vertices[control1 + 1]!);
      handles.moveTo(vertices[end]!, vertices[end + 1]!).lineTo(vertices[control2]!, vertices[control2 + 1]!);
    };
    // Open paths have an unused point at each end. Closed paths wrap the
    // last anchor to the first using the last and first control points.
    for (let i = 4; i < vertices.length - 4; i += 6) segment(i - 2, i, i + 2, i + 4);
    if (attachment.closed) segment(vertices.length - 4, vertices.length - 2, 0, 2);
    this.stroke(handles, 0xc09bff, scale);
    this.stroke(curve, 0xff884d, scale);
  }

  private stroke(path: GraphicsPath, color: number, scale: number) {
    // A dark outer stroke keeps coloured lines visible over matching artwork
    // and light backgrounds. Both widths remain constant in screen pixels.
    this.graphics.path(path).stroke({ width: 3.5 / scale, color: 0x181818, alpha: 0.85 });
    this.graphics.path(path).stroke({ width: 1.5 / scale, color });
  }

  destroy() {
    this.graphics.destroy();
    this.boneNames.destroy({ children: true });
    this.slotNames.destroy({ children: true });
    this.boneLabels.clear();
    this.slotLabels.clear();
    this.slotRows.clear();
  }
}
