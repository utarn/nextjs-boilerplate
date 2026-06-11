import nextEslintConfig from 'eslint-config-next';

export default [
  ...nextEslintConfig,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];
