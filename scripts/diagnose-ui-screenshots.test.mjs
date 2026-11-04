import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

// 该测试由 node --test 运行（不是 Bun），因此不能用 import.meta.dir。
const script = resolve(dirname(fileURLToPath(import.meta.url)), 'diagnose-ui-screenshots.mjs');

function run(directory) {
  return execFileSync(process.execPath, [script, directory], { encoding: 'utf8' });
}

test('missing results.json is reported without masking the original failure', () => {
  const directory = mkdtempSync(join(tmpdir(), 'svadmin-diagnose-empty-'));
  try {
    const output = run(directory);
    assert.match(output, /results\.json was not written/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('missing screenshot evidence is recorded per failure instead of throwing ENOENT', () => {
  const directory = mkdtempSync(join(tmpdir(), 'svadmin-diagnose-partial-'));
  try {
    writeFileSync(join(directory, 'results.json'), JSON.stringify({ failures: [{ name: 'fallback-app-1440-light' }] }));
    const output = run(directory);
    assert.match(output, /fallback-app-1440-light/);
    const diagnostics = JSON.parse(readFileSync(join(directory, 'diagnostics.json'), 'utf8'));
    assert.deepEqual(diagnostics[0].missing, ['baseline', 'published', 'before', 'after']);
    assert.match(diagnostics[0].note, /failed before capture/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
