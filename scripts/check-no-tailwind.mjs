import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { auditNoTailwind, manifestViolations, lockViolations, cssViolations } from './no-tailwind-contract.mjs';

export function assertNoCompilerDependencies(pkg) {
  assert.deepEqual(manifestViolations(pkg), []);
}
export function assertNoCompilerInLockfile(lock) {
  assert.deepEqual(lockViolations(lock), []);
}
export function assertNoCompilerInStylesheet(css) {
  assert.deepEqual(cssViolations(css), []);
}
export function checkNoTailwind(root = process.cwd()) {
  const paths = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root, encoding: 'utf8' })
    .split('\0').filter(Boolean);
  assert.deepEqual(auditNoTailwind(root, paths), []);
  const lock = readFileSync(`${root}/bun.lock`, 'utf8');
  assertNoCompilerInLockfile(lock);
}
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  checkNoTailwind();
  console.info('Style publication boundary passed.');
}
