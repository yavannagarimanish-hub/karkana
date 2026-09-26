import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';

/**
 * Next.js 16 removed `next lint`; ESLint is driven directly through the flat
 * config API. `eslint-config-next` 16 ships flat-config arrays.
 */
const config = [

  {
    ignores: [
      '.next/**',
      'out/**',
      'coverage/**',
      'drizzle/**',
      'data/**',
      'qa_screenshots/**',
      'scripts/legacy/**',
      'next-env.d.ts',
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
    },
  },
  {
    files: ['**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  // Enforces docs/SYSTEM_DESIGN.md §2: the domain/application layers stay
  // framework-free, and infrastructure is only reached through core/ports.
  {
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['next', 'next/*', 'react', 'react-dom', 'react/*', '@/ui/*', '@/infra/*', '@/features/*', '@/app/*'],
              message: 'core/ is framework-free: no Next, React, UI or infra imports.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/ui/**/*.tsx', 'src/features/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/infra/*'],
              message: 'UI and feature components must not import infrastructure; go through a service or route handler.',
            },
          ],
        },
      ],
    },
  },
];

export default config;
