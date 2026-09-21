import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { captureOptions, captureSpecimen } from './capture.mjs';

function pageWith(frames) {
  const options = [];
  let captures = 0;
  let evaluations = 0;
  return {
    options,
    get captures() { return captures; },
    async evaluate() { evaluations += 1; return { evaluations, scrollY: 0, state: { view: 'settings', phase: 'invalid' } }; },
    async screenshot(value) { options.push(value); return frames[captures++ % frames.length]; },
  };
}
function fixture() { return mkdtempSync(join(tmpdir(), 'svadmin-capture-')); }

test('captures a full page with the same eight-attempt exact-buffer rule', async () => {
  const directory = fixture();
  try {
    const page = pageWith([Buffer.from('one'), Buffer.from('settled'), Buffer.from('settled')]);
    const result = await captureSpecimen(page, { directory, id: 'settings-invalid-dark-en-390' });
    assert.equal(result.png.toString(), 'settled');
    assert.equal(result.attempts, 3);
    assert.equal(result.mode, 'full-page');
    assert.deepEqual(page.options, [captureOptions, captureOptions, captureOptions]);
    assert.deepEqual(Object.keys(captureOptions).sort(), ['animations', 'caret', 'fullPage', 'type']);
    assert.deepEqual(readdirSync(directory), []);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('keeps every failing frame and geometry diagnostic instead of silently retrying the scene', async () => {
  const directory = fixture();
  try {
    const page = pageWith([Buffer.from('a'), Buffer.from('b')]);
    await assert.rejects(captureSpecimen(page, { directory, id: 'unstable' }), /did not stabilize/u);
    assert.equal(page.captures, 8);
    const path = join(directory, 'capture-diagnostics', 'unstable');
    const frames = JSON.parse(readFileSync(join(path, 'frames.json'), 'utf8'));
    assert.equal(frames.length, 8);
    assert.equal(readdirSync(path).filter(name => name.endsWith('.png')).length, 8);
    assert.equal(readFileSync(join(path, '1.png')).toString(), 'a');
    assert.equal(readFileSync(join(path, '8.png')).toString(), 'b');
    for (const frame of frames) { assert.match(frame.sha256, /^[a-f0-9]{64}$/u); assert.ok(frame.before); assert.ok(frame.after); }
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('a change of even one byte cannot count as a matching screenshot', async () => {
  const directory = fixture();
  try {
    const page = pageWith([Buffer.from([1, 2, 3]), Buffer.from([1, 2, 4])]);
    await assert.rejects(captureSpecimen(page, { directory, id: 'one-byte' }), /did not stabilize/u);
    assert.equal(page.captures, 8);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('rejects a non-buffer result and path traversal', async () => {
  const directory = fixture();
  try {
    await assert.rejects(captureSpecimen(pageWith(['not a buffer']), { directory, id: 'bad-buffer' }), /actual PNG buffer/u);
    const page = pageWith([Buffer.from('ok')]);
    await assert.rejects(captureSpecimen(page, { directory, id: '../outside' }));
    assert.equal(page.captures, 0);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
