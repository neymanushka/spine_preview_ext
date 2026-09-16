import type { BackgroundId } from './components/controls';

// The checkerboard is drawn inside the WebGL canvas rather than as a CSS layer
// behind it. A transparent canvas over a CSS background forces the compositor
// to flatten both layers before every backdrop-filter pass, which stalls window
// resizing; keeping the canvas opaque keeps the panels' blur cheap.
const CHECKER_TILE = 16;
const CHECKER_LIGHT = '#8a8a8a';
const CHECKER_DARK = '#6e6e6e';

export const CHECKER_CLEAR_CSS = CHECKER_LIGHT;

const CHECKER_COLOR = 0x8a8a8a;
const DARK_COLOR = 0x1e1e1e;
const LIGHT_COLOR = 0xf3f3f3;
const THEME_FALLBACK_COLOR = 0x1e1e1e;
const EDITOR_BACKGROUND_VAR = '--vscode-editor-background';

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
// Any colour the canvas rejects leaves the sentinel in place, which is how a
// failed parse is detected. A theme that genuinely uses it loses nothing.
const PARSE_SENTINEL = '#010203';

function cssColorToHex(value: string, fallback: number) {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return fallback;
  ctx.fillStyle = PARSE_SENTINEL;
  ctx.fillStyle = trimmed;
  const normalized = ctx.fillStyle;
  if (typeof normalized !== 'string' || normalized === PARSE_SENTINEL) return fallback;
  return HEX_COLOR_PATTERN.test(normalized) ? parseInt(normalized.slice(1), 16) : fallback;
}

function readThemeColor() {
  const value = getComputedStyle(document.body).getPropertyValue(EDITOR_BACKGROUND_VAR);
  return cssColorToHex(value, THEME_FALLBACK_COLOR);
}

function colorFor(id: BackgroundId) {
  switch (id) {
    case 'dark':
      return DARK_COLOR;
    case 'light':
      return LIGHT_COLOR;
    case 'theme':
      return readThemeColor();
    default:
      return CHECKER_COLOR;
  }
}

// Power-of-two so the texture can wrap on WebGL 1 as well.
function createCheckerTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = CHECKER_TILE * 2;
  canvas.height = CHECKER_TILE * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = CHECKER_LIGHT;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = CHECKER_DARK;
  ctx.fillRect(0, 0, CHECKER_TILE, CHECKER_TILE);
  ctx.fillRect(CHECKER_TILE, CHECKER_TILE, CHECKER_TILE, CHECKER_TILE);
  return PIXI.Texture.from(canvas);
}

export type CanvasBackground = {
  apply(id: BackgroundId): void;
  resize(width: number, height: number): void;
};

export function createCanvasBackground(pixiApp: PIXIApplication): CanvasBackground {
  const texture = createCheckerTexture();
  const checker = texture ? new PIXI.TilingSprite(texture, window.innerWidth, window.innerHeight) : null;

  if (checker) {
    checker.visible = false;
    pixiApp.stage.addChildAt(checker, 0);
  }

  return {
    apply(id) {
      if (checker) checker.visible = id === 'checker';
      const background = pixiApp.renderer.background;
      if (background) background.color = colorFor(id);
    },
    resize(width, height) {
      if (!checker) return;
      checker.width = width;
      checker.height = height;
    },
  };
}
