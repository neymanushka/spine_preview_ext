// Shared appearance only. Each control keeps its native HTML behaviour and
// feature-specific sizing, state and event handlers in its own component.
export const uiStyles = `
.ui-button {
    font: inherit;
    color: var(--text-primary);
    background: var(--input-bg);
    border: 1px solid var(--input-border-color);
    border-radius: var(--radius);
    padding: var(--sp-1) var(--sp-2);
    cursor: pointer;
}
.ui-button:hover { background: var(--hover-bg); }
.ui-icon-button {
    display: flex;
    background: none;
    border-radius: var(--radius);
    cursor: pointer;
}
.ui-icon-button:hover:not(:disabled) {
    background: var(--vscode-toolbar-hoverBackground, var(--hover-bg));
}
.ui-range {
    -webkit-appearance: none;
    appearance: none;
    height: 4px;
    background: var(--input-bg);
    border: 1px solid var(--input-border-color);
    border-radius: 2px;
    outline: none;
    cursor: pointer;
}
.ui-range::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--accent);
    cursor: pointer;
}
.ui-list-panel {
    user-select: none;
    overflow-y: auto;
    padding: var(--sp-1);
    min-width: 180px;
}
.ui-choice-row {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    color: var(--text-primary);
    border-radius: var(--radius);
    padding: var(--sp-1) var(--sp-2);
    cursor: pointer;
    transition: background-color 0.15s;
}
.ui-choice-row:hover { background-color: var(--hover-bg); }
.ui-choice-row input { accent-color: var(--accent); cursor: pointer; margin: 0; }
`;
