import { spawnSync } from 'node:child_process';

const checks = [
  ['check', []],
  ['lint', []],
  ['test', []],
  ['diff', []],
  ['ui:evidence', []],
  ['build:packages', []],
  ['build:example', []],
  ['check:lite:ssr', []],
  ['pack:check', []],
  ['bundle:check', []],
  ['docs:build', []],
  ['doc:sync', []],
];

const directChecks = new Map([
  ['diff', ['git', 'diff', '--check']],
  ['ui:evidence', ['bun', 'scripts/ui-state-evidence-check.ts']],
]);

for (const [script, args] of checks) {
  const directCommand = directChecks.get(script);
  const command = directCommand
    ? directCommand
    : ['bun', 'run', script, ...args];
  console.info(`\n> ${command.join(' ')}`);
  const result = spawnSync(command[0], command.slice(1), {
    stdio: 'inherit',
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.info('\nVerification: PASS');
