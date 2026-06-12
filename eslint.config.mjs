import nextEslintConfig from 'eslint-config-next';
import tsPlugin from '@typescript-eslint/eslint-plugin';

const config = [
  ...nextEslintConfig,
  {
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];

export default config;
