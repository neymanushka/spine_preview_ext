# Changelog

## [3.4.1] - 2026-10-27

### Internal

- Packaging moves to `@vscode/vsce` 4, which needs Node 22: the project now
  pins Node 22.23.4 and `engines.node` requires `>=22`

## [3.4.0] - 2026-10-24

### Features

- The animation tooltip names the physics constraints an animation sets
  moving (`drives physics: pendulum`): a constraint reacts to its bone moving,
  so an animation drives it by keying that bone or any of its parents, even
  without physics keys of its own

### Fixes

- The animation no longer blinks out while the editor is being resized:
  resizing the canvas clears it, and the frame was only redrawn on the next
  tick, so every resize step showed an empty canvas first

## [3.3.0] - 2026-10-24

### Features

- The animation tooltip opens with a summary of what the animation drives:
  how many bones and slots, plus attachments, color, deform, sequence, draw
  order, IK, transform, path and physics keys where present
- Track conflicts in the animation list: badges mark the other tracks whose
  animation keys the same properties as this one would on the active track.
  A red badge counts the higher tracks that will hide it there, a yellow one
  the lower tracks it will override - `T4` for one track, `T4 +3` for the
  nearest plus three more. The tooltip names every track, its animation and
  how many properties they share, in the colour of the matching badge

## [3.2.0] - 2026-10-24

### Features

- The Tracks panel lists only the tracks in use plus one free track after
  them, instead of a fixed five. Starting an animation on the free track adds
  the next one, so there is no upper limit on tracks
- A track can be cleared with the × button that appears on hover. The pose
  drops what that track animated straight away, even while paused, and the
  list shrinks back when the last track in use is cleared

## [3.1.0] - 2026-10-24

### Features

- The Tracks panel shows the name of the animation playing on each track, or
  a dash for an empty one, so the tracks can be told apart without selecting
  each of them

### Fixes

- Switching skeleton files resets the file being opened: its tracks are
  cleared back to the first animation on track 0 and its skin to the default.
  Before, a file came back with the tracks and skin left on it while the Skins
  panel showed none selected

## [3.0.2] - 2026-10-24

### Fixes

- Copying an animation name awaits the clipboard write instead of dropping the
  promise

### Internal

- Hardening: the skeleton list and the atlas URI are written into the webview
  page as JSON with `<` escaped, so the inline script no longer relies on how
  VS Code encodes URIs
- TypeScript 6.0, the newest version typescript-eslint supports
- ESLint 10, typescript-eslint 8.72, esbuild 0.28, Prettier 3.9 and
  `@types/node` 20 to match the Node version VS Code ships; the unused
  `eslint-plugin-import` and the standalone `@typescript-eslint/parser` are gone
- Stricter compiler checks (unused locals/parameters, `noImplicitOverride`,
  `verbatimModuleSyntax` for the webview) and an es2022 target for the webview
  bundle
- Development needs Node 20.19+; the project `.npmrc` pins it for pnpm

## [3.0.1] - 2026-10-17

### Fixes

- Faster startup: the WebGL renderer is built directly instead of through
  PIXI `Application`, skipping a throwaway WebGL context that cost 100-150 ms
  inside a VS Code webview (renderer init ~870 ms -> ~650 ms)

## [3.0.0] - 2026-10-17

### Breaking

- Rendering moves to PixiJS 8 and the official Spine runtime for it
  (`@esotericsoftware/spine-pixi-v8` 4.2). The runtime targets Spine 4.2
  exports; 4.1 exports generally load, but 4.0 and 3.x exports are no longer
  supported

### Internal

- PixiJS and the Spine runtime are bundled into `out/webview/app.js` with the
  UI, so the `libs/` folder is gone and the preview still needs no network
- PIXI and Spine types come from their packages instead of hand-written
  declarations

## [2.3.1] - 2026-09-18

### Fixes

- An event firing steadily no longer holds a single toast open indefinitely: a
  repeat replays the toast, which restarted its fade, so the counter climbed for
  as long as the animation ran. Folding is now bounded by a window measured from
  when the toast opened, and the queue turns over while the burst continues

## [2.3.0] - 2026-09-18

### Features

- Timeline panel with play/pause, frame stepping, a scrubber and the animation's
  duration, driving the track selected in the tracks panel
- Event markers under the scrubber: click one to jump to it, hover for the names,
  and events authored on the same frame share a marker
- Fired events are announced as toasts above the timeline and the marker they
  came from flashes; repeats of one name collapse into a counter
- Playback speed from 0.1x to 5x
- Space toggles playback, left/right arrows step a frame, and a forward step
  reports the events it crossed
- Loop moves out of the toolbar into the timeline, and now governs only playback:
  scrubbing and stepping stop on the first and last frame instead of wrapping

### Internal

- The demo ships two skeletons, fruits and vegetables, so the skeleton selector
  and the skins panel have something to switch between
- The demo's six textures are packed onto one atlas page instead of one page each

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
