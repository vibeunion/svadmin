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
    files: [
      'packages/core/src/record-decoder.ts',
      'packages/core/src/mutation-cache.ts',
      'packages/core/src/mutation-cache.test.ts',
      'packages/core/src/mutation-runtime.test.svelte.ts',
      'packages/core/src/mutation-runtime.test.types.ts',
      'packages/core/src/mutation-runtime.test-host.svelte',
      'packages/core/src/mutation-runtime.test-probe.svelte',
      'packages/core/src/mutation-hooks.svelte.ts',
      'packages/core/src/mutation-hooks.test.svelte.ts',
      'packages/core/src/strict-hooks.test.svelte.ts',
      'packages/core/src/captured-mutation.svelte.ts',
      'packages/core/src/permission-hints-contract.ts',
      'packages/core/src/auth-query-contract.ts',
      'packages/core/src/auth-mutation-contract.ts',
      'packages/core/src/auth-mutation-contract.test.ts',
      'packages/core/src/auth-mutation.test.svelte.ts',
      'packages/core/src/auth-hooks.svelte.ts',
      'packages/core/src/hook-utils.test.svelte.ts',
      'packages/core/src/auth-query-contract.test.ts',
      'packages/core/src/auth-query.test.svelte.ts',
      'packages/core/src/auth-query.test.types.ts',
      'packages/core/src/auth-query.test-host.svelte',
      'packages/core/src/auth-query.test-probe.svelte',
      'packages/core/src/permission-hints-contract.test.ts',
      'packages/core/src/permission-hints.test.svelte.ts',
      'packages/core/src/permission-hints.test.types.ts',
      'packages/core/src/permission-hints.test-host.svelte',
      'packages/core/src/permission-hints.test-probe.svelte',
      'packages/lite/example/src/lib/post-provider.ts',
      'packages/lite/example/test/post-provider.test.ts',
      'packages/lite/example/src/lib/admin.ts',
      'packages/lite/example/src/routes/lite/+page.server.ts',
      'packages/core/src/plain-data.ts',
      'packages/core/src/plain-data.test.ts',
      'packages/core/src/audit.ts',
      'packages/core/src/audit-contract.ts',
      'packages/core/src/audit.test.ts',
      'packages/core/src/audit-validation.test.ts',
      'packages/core/src/task-contract.ts',
      'packages/core/src/task-contract.test.ts',
      'packages/core/src/task-provider.ts',
      'packages/core/src/task-provider.test.ts',
      'packages/core/src/task-subscription.ts',
      'packages/core/src/task-hooks.svelte.ts',
      'packages/core/src/task-hooks.test.svelte.ts',
      'packages/core/src/task-hooks.test-host.svelte',
      'packages/core/src/task-hooks.test-probe.svelte',
      'packages/core/src/task-hooks.test.types.ts',
      'packages/core/src/provider-response.ts',
      'packages/core/src/form-hooks.svelte.ts',
      'packages/refine-adapter/src/index.ts',
      'packages/elysia/src/**/*.ts',
      'packages/elysia/test/**/*.mts',
      'packages/lite/src/server-adapter.test.integration.ts',
      'packages/directus/src/data-provider.ts',
      'packages/drizzle/src/**/*.ts',
      'packages/flow/src/**/*.ts',
      'packages/flow/src/**/*.svelte',
      'packages/pocketbase/src/**/*.ts',
      'packages/sanity/src/data-provider.ts',
      'packages/supabase/src/data-provider.ts',
      'packages/supabase/src/sdk-boundary.ts',
      'packages/supabase/src/rpc.ts',
      'packages/supabase/src/live-provider.ts',
      'packages/supabase/src/live-validation.test.ts',
      'packages/supabase/src/auth-provider.ts',
      'packages/supabase/src/auth-contract.ts',
      'packages/supabase/src/auth-validation.test.ts',
      'packages/supabase/src/audit-handler.ts',
      'packages/supabase/src/audit-validation.test.ts',
      'packages/supabase/src/supacloud.ts',
      'packages/supabase/src/supacloud-validation.test.ts',
      'packages/ui/src/components/auth-contract.test.svelte.ts',
      'packages/ui/src/components/auth-contract.test-host.svelte',
      'packages/ui/src/components/AuditLogDrawer.svelte',
      'packages/ui/src/components/CancelTaskButton.svelte',
      'packages/ui/src/components/RetryTaskButton.svelte',
      'packages/ui/src/components/TaskQueueDrawer.svelte',
      'packages/ui/src/components/LazyTaskQueueDrawer.svelte',
      'packages/ui/src/components/TaskList.svelte',
      'packages/ui/src/components/TaskDetails.svelte',
      'packages/ui/src/components/task-utils.ts',
      'packages/ui/src/components/task-buttons.tenant.test.svelte.ts',
      'packages/ui/src/components/task-buttons.tenant.test-host.svelte',
      'packages/ui/src/components/TaskQueueDrawer.test.svelte.ts',
      'packages/supabase/src/webauthn-contract.test.ts',
    ],
    linterOptions: { noInlineConfig: true },
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
      '@typescript-eslint/ban-ts-comment': ['error', {
        'ts-ignore': true,
        'ts-nocheck': true,
        'ts-expect-error': false,
        'ts-check': false,
      }],
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
      '**/styled-system/**',
      '**/.svelte-kit/**',
      '**/.astro/**',
      'test-results/**',
      'playwright-report/**',
      'docs/.astro/**',
      'tsconfig.tsbuildinfo',
      '.agents/**',
      'output/**',
      'private/**',
      'xigu-fa/**',
    ],
  },
);
