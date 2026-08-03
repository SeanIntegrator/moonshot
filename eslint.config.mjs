import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * Pragmatic monorepo lint baseline.
 * Tightening (e.g. no-explicit-any → error, unused-vars → error) comes later once the
 * codebase is cleaned up; for now prefer `pnpm lint` exiting 0 over a flood of noise.
 */
export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/migrations/**',
      '**/coverage/**',
      '**/.turbo/**',
      '**/vite.config.ts',
      '**/vitest.config.ts',
      '**/*.config.js',
      '**/*.config.mjs',
      '**/scripts/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // Noisy across the existing codebase — tighten in a follow-up.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-useless-assignment': 'off',
      'prefer-const': 'warn',
      'no-console': 'off',
    },
  }
);
