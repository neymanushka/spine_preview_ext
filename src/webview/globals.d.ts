// Ambient declarations for the globals the extension host writes into the page
// (see src/extension.ts). PIXI, Spine and Preact are bundled from npm, so their
// types come from the packages themselves.

declare const SPINES: Array<{ name: string; uri: string }>;
declare const ATLAS_URI: string;
