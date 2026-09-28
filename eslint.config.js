import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * One lint configuration for every package.
 *
 * Shared on purpose: a contributor working on an engine and a contributor working
 * on a use case are held to the same rules, and a package cannot quietly relax
 * them. Generated and produced artifacts are ignored wherever a package puts
 * them, which in this monorepo is inside the package rather than at the root.
 */
export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/drizzle/meta/**',
      '**/test-results/**',
      '**/playwright-report/**',
      '**/triage-output/**',
      '**/report-output/**',
      '.yarn/**',
    ],
  },
  {
    files: ['tools/**/*.mjs'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
);
