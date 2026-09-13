import type { UserConfig } from '@commitlint/types';

const config: UserConfig = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Require every commit to declare a non-empty scope.
    'scope-empty': [2, 'never'],
    // Allow up to 100 characters for headers with long monorepo scopes.
    'header-max-length': [2, 'always', 100],
    // Allow up to 200 characters per body line for links and migration notes.
    'body-max-line-length': [1, 'always', 200],
    // Allowed commit type whitelist.
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore', 'ci', 'build', 'revert'],
    ],
  },
};

export default config;
