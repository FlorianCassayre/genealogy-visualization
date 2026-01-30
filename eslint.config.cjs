const react = require('eslint-plugin-react');
const reactHooks = require('eslint-plugin-react-hooks');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const reactRefresher = require('eslint-plugin-react-refresh');
const parser = require('@typescript-eslint/parser');

module.exports = ({
  ignores: ['dist/**', 'node_modules', 'public', 'eslint.config.cjs', '.prettierrc.cjs', 'env.d.ts'],
  languageOptions: {
    parser,
    parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      project: ['./tsconfig.json', './tsconfig.node.json'],
      tsconfigRootDir: __dirname,
    },
  },
  plugins: {
    react,
    'react-hooks': reactHooks,
    '@typescript-eslint': tsPlugin,
    'react-refresh': reactRefresher,
  },
  linterOptions: {
    reportUnusedDisableDirectives: 'error',
  },
});
