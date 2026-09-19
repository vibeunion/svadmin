import assert from 'node:assert/strict';

/** Stabilize each page independently; never retry until it matches another page. */
export async function stableScreenshot(capture, attempts = 6) {
  assert.ok(Number.isInteger(attempts) && attempts >= 2 && attempts <= 10);
  let previous;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const current = await capture();
    assert.ok(Buffer.isBuffer(current));
    if (previous?.equals(current)) return current;
    previous = current;
  }
  throw new Error(`Screenshot did not stabilize in ${attempts} consecutive captures`);
}
