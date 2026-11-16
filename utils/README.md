# Development utilities

Keep reusable tools for generating demo assets and other development tasks here.
These tools are excluded from the extension's VSIX. Disposable checks and logs
belong in the system temporary directory.

## PMA demo textures

Run from the repository root with Node.js; no dependencies are required:

```sh
node utils/generate-pma-textures.mjs
```

This recreates `demo/pma/pma.png` with premultiplied RGB and
`demo/pma/straight.png` with straight alpha. Both contain the same soft-edged disc.
The default destination is resolved relative to the script, independently of
the current working directory. An optional argument selects another existing
output directory:

```sh
node utils/generate-pma-textures.mjs <output-directory>
```
