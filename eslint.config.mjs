import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: ['**/node_modules/**', '**/out/**', 'esbuild.webview.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    files: ['src/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    rules: {
      //TODO: vscode plugins not supported esm
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['src/webview/**/*.ts', 'src/webview/**/*.tsx'],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        project: './src/webview/tsconfig.json',
        ecmaFeatures: { jsx: true },
      },
    },
  },
];
