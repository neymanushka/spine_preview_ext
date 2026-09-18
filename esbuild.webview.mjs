import { build, context } from 'esbuild';

const watch = process.argv.includes('--watch');

const options = {
  entryPoints: ['src/webview/index.tsx'],
  bundle: true,
  outfile: 'out/webview/app.js',
  format: 'iife',
  target: 'es2020',
  sourcemap: true,
  minify: !watch,
  jsx: 'automatic',
  jsxImportSource: 'preact',
};

if (watch) {
  const ctx = await context(options);
  await ctx.watch();
  console.log('Watching webview for changes...');
} else {
  build(options).catch(() => process.exit(1));
}
