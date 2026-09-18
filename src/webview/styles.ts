import { fileSelectorStyles } from './components/file-selector';
import { controlsStyles } from './components/controls';
import { statusBarStyles } from './components/status-bar';
import { animationListStyles } from './components/animation-list';
import { skinsPanelStyles } from './components/skins-panel';
import { tracksPanelStyles } from './components/tracks-panel';
import { tooltipStyles } from './components/tooltip';
import { noticeStyles } from './components/notice';
import { appStyles } from './app';

// Every colour is sourced from the VS Code theme so the preview matches the
// editor the user actually runs. The literals are fallbacks only - they apply
// when a variable is missing, never when the theme provides one.
//
// Panels are deliberately opaque and unblurred. A translucent panel with a
// backdrop-filter over a transparent canvas makes the compositor flatten the
// canvas and the CSS background into a texture before every blur pass, which
// stalls window resizing.
const globalStyles = `
:root {
    --sp-1: 4px;
    --sp-2: 8px;
    --sp-3: 12px;

    --radius: 4px;
    --radius-lg: 6px;

    --panel-bg: var(--vscode-editorWidget-background, #252526);
    --panel-border-color: var(--vscode-editorWidget-border, var(--vscode-panel-border, rgba(128, 128, 128, 0.35)));
    --panel-shadow: 0 2px 8px var(--vscode-widget-shadow, rgba(0, 0, 0, 0.36));

    --text-primary: var(--vscode-foreground, #cccccc);
    --text-secondary: var(--vscode-descriptionForeground, #9d9d9d);
    --error-fg: var(--vscode-errorForeground, #f48771);

    --accent: var(--vscode-focusBorder, #0078d4);
    --hover-bg: var(--vscode-list-hoverBackground, rgba(128, 128, 128, 0.15));
    --active-bg: var(--vscode-list-activeSelectionBackground, #04395e);
    --active-fg: var(--vscode-list-activeSelectionForeground, #ffffff);

    --input-bg: var(--vscode-input-background, #313131);
    --input-fg: var(--vscode-input-foreground, #cccccc);
    --input-border-color: var(--vscode-input-border, rgba(128, 128, 128, 0.35));

    --scrollbar-thumb: var(--vscode-scrollbarSlider-background, rgba(128, 128, 128, 0.4));
    --scrollbar-thumb-hover: var(--vscode-scrollbarSlider-hoverBackground, rgba(128, 128, 128, 0.6));
}
body {
    margin: 0;
    padding: 0;
    overflow: hidden;
    font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
    font-size: var(--vscode-font-size, 13px);
    color: var(--text-primary);
}
#canvas-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
    background: var(--vscode-editor-background, #1e1e1e);
}
/* Checkerboard is the default so transparent regions of the art stay readable. */
#canvas-container.bg-checker {
    background-color: #8a8a8a;
    background-image:
        linear-gradient(45deg, #6e6e6e 25%, transparent 25%, transparent 75%, #6e6e6e 75%),
        linear-gradient(45deg, #6e6e6e 25%, transparent 25%, transparent 75%, #6e6e6e 75%);
    background-size: 20px 20px;
    background-position: 0 0, 10px 10px;
}
#canvas-container.bg-dark { background: #1e1e1e; background-image: none; }
#canvas-container.bg-light { background: #f3f3f3; background-image: none; }
#canvas-container.bg-theme { background: var(--vscode-editor-background, #1e1e1e); background-image: none; }

/* The overlay never eats pointer events; only the panels inside it do. */
#app { position: relative; z-index: 1; pointer-events: none; }
[data-panel] { pointer-events: auto; }

.panel {
    background: var(--panel-bg);
    border: 1px solid var(--panel-border-color);
    border-radius: var(--radius-lg);
    box-shadow: var(--panel-shadow);
}
.panel-header {
    padding: var(--sp-2) var(--sp-2) var(--sp-1);
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-secondary);
    border-bottom: 1px solid var(--panel-border-color);
    margin-bottom: var(--sp-1);
}
:focus-visible {
    outline: 1px solid var(--accent);
    outline-offset: -1px;
}
::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 5px; border: 3px solid transparent; background-clip: content-box; }
::-webkit-scrollbar-thumb:hover { background: var(--scrollbar-thumb-hover); background-clip: content-box; }`;

export const allStyles = [
  globalStyles,
  appStyles,
  fileSelectorStyles,
  controlsStyles,
  statusBarStyles,
  animationListStyles,
  skinsPanelStyles,
  tracksPanelStyles,
  tooltipStyles,
  noticeStyles,
].join('\n');
