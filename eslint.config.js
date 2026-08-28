import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';

export default ts.config(
  js.configs.recommended,
  ...ts.configs.strict,
  ...svelte.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      }
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],
      'no-console': ['error', { allow: ['warn', 'error', 'info', 'debug'] }],
      'svelte/no-navigation-without-resolve': 'error',
      'svelte/prefer-svelte-reactivity': 'off',
    },
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts'],
    languageOptions: {
      parserOptions: {
        parser: ts.parser,
      },
    },
  },
  {
    files: [
      'packages/core/src/form-hooks.svelte.ts',
      'packages/core/src/query-hooks.svelte.ts',
      'packages/core/src/utility-hooks.svelte.ts',
    ],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        ignoreRestSiblings: true,
        varsIgnorePattern: '^_(?:TData|TError)$',
      }],
    },
  },
  {
    files: ['packages/core/src/hooks.svelte.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        ignoreRestSiblings: true,
        varsIgnorePattern: '^_(?:TData|TError|TOption)$',
      }],
    },
  },
  {
    files: ['packages/core/src/table-hooks.svelte.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        ignoreRestSiblings: true,
        varsIgnorePattern: '^_TSearchVariables$',
      }],
    },
  },
  {
    files: ['packages/core/src/task-hooks.svelte.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        ignoreRestSiblings: true,
        varsIgnorePattern: '^_TError$',
      }],
    },
  },
  {
    files: [
      'example/src/**/*.svelte',
      'packages/ui/src/**/*.svelte',
      'packages/lite/src/**/*.svelte',
      'packages/lite/example/src/**/*.svelte',
    ],
    rules: {
      'svelte/no-navigation-without-resolve': 'off',
    },
  },
  {
    files: [
      'example/src/**/*.svelte',
      'example/src/**/*.svelte.ts',
      'packages/ui/src/**/*.svelte',
      'packages/ui/src/**/*.svelte.ts',
    ],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [
          {
            name: '@svadmin/core',
            importNames: ['t', 'getLocale', 'setLocale'],
            message: 'Capture the tree-local i18n scope with useTranslation() during component initialization.',
          },
          {
            name: '@svadmin/core/i18n',
            importNames: ['t', 'getLocale', 'setLocale'],
            message: 'Capture the tree-local i18n scope with useTranslation() during component initialization.',
          },
        ],
      }],
    },
  },
  {
    files: [
      'packages/create-svadmin/src/**/*.ts',
      'fix-peers.js',
      'packages/ui/scripts/postbuild-css.mjs',
    ],
    rules: {
      'no-console': 'off',
    },
  },
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.svelte-kit/**',
      '**/.astro/**',
      'test-results/**',
      'playwright-report/**',
      'docs/.astro/**',
      'tsconfig.tsbuildinfo',
      '.agents/**',
      'output/**',
      'private/**',
    ],
  },
);
