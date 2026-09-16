# Changelog

## [2.2.0] - 2026-09-16

### Features

- UI now follows the VS Code theme: every colour maps onto a `--vscode-*` variable
- Canvas background switch: checkerboard (default), dark, light, editor background
- Zoom range widened to 5%-800% with a proportional step, anchored at the cursor
- Zoom slider is logarithmic, with a percentage readout that resets the view
- Loading, empty and error states instead of a blank canvas when assets fail
- Keyboard focus styles, real buttons and labels across the panels

### Fixes

- Mouse wheel over a panel scrolls it instead of zooming the canvas
- Panning and double-click reset no longer trigger from inside the panels
- Double-click resets zoom as well as pan
- Stats readout no longer re-renders the whole UI on every frame
- Non-skeleton `.json` files next to the atlas are no longer loaded as skeletons
- Asset loading failures are reported instead of silently swallowed

### Internal

- Preact is bundled from npm and the webview is written in JSX; `htm` and the UMD
  builds of preact are gone, and the webview is type-checked and linted
- `.vscodeignore` keeps sources, demo assets and sourcemaps out of the package

## [2.0.0] - 2026-03-22

### Features

- Preact added with full webview refactor
- Separated components architecture
- Redesigned panels UI
- Tooltip support
- Mouse wheel zoom
- Drag and pan support
- Copy name context menu
- README screenshot and demo asset

### Fixes

- Resolve ESLint errors and webview TypeScript diagnostics
- Type fixes
