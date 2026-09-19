import assert from 'node:assert/strict';
import { test } from 'node:test';
import { stableScreenshot } from './stable-screenshot.mjs';

test('waits for two consecutive identical captures of the same page', async () => {
  const images = ['transient', 'stable', 'stable'];
  let calls = 0;
  const image = await stableScreenshot(async () => Buffer.from(images[calls++]));
  assert.equal(image.toString(), 'stable');
  assert.equal(calls, 3);
});
test('does not hide persistent animation or alternating pixels', async () => {
  let calls = 0;
  await assert.rejects(stableScreenshot(async () => Buffer.from(String(calls++ % 2)), 4), /did not stabilize/);
});
test('different stable pages still have strictly unequal screenshots', async () => {
  const before = await stableScreenshot(async () => Buffer.from('before'));
  const after = await stableScreenshot(async () => Buffer.from('after'));
  assert.equal(before.equals(after), false);
});
