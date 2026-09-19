import assert from 'node:assert/strict';

// Fixed fixture contracts, independent of Panda's recipe definitions. The old
// component emitted these uncompiled utility names. Correcting their color is
// an intentional bug fix, not evidence that the historical PNG was identical.
export const trendBindings = Object.freeze([
  { label: 'Completed', text: '+2', legacyClass: 'text-success', token: '--color-success' },
  { label: 'Failed', text: '+4', legacyClass: 'text-destructive', token: '--color-destructive' },
  { label: 'Pending', text: '+3', legacyClass: 'text-warning-foreground', token: '--color-warning-foreground' },
  { label: 'Neutral', text: '0', legacyClass: 'text-muted-foreground', token: '--color-muted-foreground' },
].map((entry) => Object.freeze(entry)));

export function assertContentParity(baseline, candidate, resolvedBindings) {
  assert.equal(resolvedBindings.length, trendBindings.length, 'all four trend meanings must be checked');
  const expected = structuredClone(baseline);
  const indices = new Set();
  const changes = [];
  for (const [position, actual] of resolvedBindings.entries()) {
    const binding = trendBindings[position];
    assert.equal(actual.label, binding.label);
    assert.ok(Number.isInteger(actual.index) && actual.index > 0 && actual.index < baseline.length);
    assert.ok(!indices.has(actual.index), 'trend targets must be distinct');
    indices.add(actual.index);
    const node = expected[actual.index];
    assert.equal(node.tag, 'SPAN');
    assert.equal(node.text, binding.text);
    assert.equal(typeof actual.expectedColor, 'string');
    assert.ok(actual.expectedColor.length > 0 && !actual.expectedColor.includes('var('));
    assert.ok(actual.classes.split(/\s+/u).includes(binding.legacyClass), 'reference must be the historical component');
    if (node.style.color !== actual.expectedColor) {
      changes.push({ label: binding.label, index: actual.index, from: node.style.color, to: actual.expectedColor });
    }
    // Only this leaf's foreground color is changed. Geometry, typography, every
    // other color and all remaining node properties retain exact assertions.
    node.style.color = actual.expectedColor;
  }
  assert.deepEqual(candidate, expected, 'unexpected content style, geometry, text or DOM change');
  return { expected, changes };
}
