import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import unusedImports from 'eslint-plugin-unused-imports';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { 'unused-imports': unusedImports },
    rules: {
      'unused-imports/no-unused-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', {
        vars: 'all',
        args: 'none',
        caughtErrors: 'none',
        varsIgnorePattern: '^_',
        argsIgnorePattern: '^_'
      }]
    }
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // Sprint 1 baseline: known dead code will be removed in Sprint 10.
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-empty': 'off',
      '@typescript-eslint/no-unused-expressions': 'off'
    }
  },
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/*.test.ts', '**/*.test.tsx'],
  },
);
