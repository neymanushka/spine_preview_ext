import { fileSelectorStyles } from './components/file-selector';
import { controlsStyles } from './components/controls';
import { statusBarStyles } from './components/status-bar';
import { animationListStyles } from './components/animation-list';
import { skinsPanelStyles } from './components/skins-panel';
import { tracksPanelStyles } from './components/tracks-panel';
import { tooltipStyles } from './components/tooltip';
import { appStyles } from './app';

const globalStyles = `
:root {
    --panel-bg: rgba(30, 30, 30, 0.85);
    --panel-border: 1px solid rgba(255, 255, 255, 0.12);
    --panel-radius: 6px;
    --text-primary: #e0e0e0;
    --text-secondary: #999;
    --accent: #4fc3f7;
    --hover-bg: rgba(255, 255, 255, 0.08);
    --active-bg: rgba(79, 195, 247, 0.15);
    --input-bg: rgba(255, 255, 255, 0.06);
    --input-border: 1px solid rgba(255, 255, 255, 0.15);
    --scrollbar-thumb: rgba(255, 255, 255, 0.2);
}
body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: var(--text-primary); }
#canvas-container { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; }
#app { position: relative; z-index: 1; }
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.3); }
.panel-header {
    padding: 8px 10px 6px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-secondary);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    margin-bottom: 4px;
}`;

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
].join('\n');
