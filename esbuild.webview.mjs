import { build, context } from 'esbuild';

const options = {
  entryPoints: ['src/webview/index.ts'],
  bundle: true,
  outfile: 'out/webview/app.js',
  format: 'iife',
  target: 'es2020',
  sourcemap: true,
};

if (process.argv.includes('--watch')) {
  const ctx = await context(options);
  await ctx.watch();
  console.log('Watching webview for changes...');
} else {
  build(options).catch(() => process.exit(1));
}
