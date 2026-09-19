import assert from 'node:assert/strict';
import test from 'node:test';
import { assertContentParity, trendBindings } from './content-trend-parity.mjs';

function fixture() {
  const node = (tag, text) => ({ tag, text, bounds: [0, 0, 100, 20], style: { color: 'rgb(0, 0, 0)', fontSize: '12px' } });
  const baseline = [node('MAIN', null), ...trendBindings.map((binding) => node('SPAN', binding.text)), node('P', 'Unchanged title')];
  const resolved = trendBindings.map((binding, i) => ({ ...binding, index: i + 1, expectedColor: `rgb(${i + 1}, 2, 3)`, classes: binding.legacyClass }));
  const candidate = structuredClone(baseline);
  for (const binding of resolved) candidate[binding.index].style.color = binding.expectedColor;
  return { baseline, candidate, resolved };
}

test('records the exact four color corrections without modifying the historical snapshot', () => {
  const { baseline, candidate, resolved } = fixture();
  const original = structuredClone(baseline);
  const result = assertContentParity(baseline, candidate, resolved);
  assert.equal(result.changes.length, 4);
  assert.deepEqual(baseline, original);
  assert.deepEqual(result.expected, candidate);
});

for (const mutation of ['other-color', 'geometry', 'typography', 'trend-text', 'wrong-trend-color', 'missing-node']) {
  test(`does not exempt ${mutation} when checking the intentional color fix`, () => {
    const { baseline, candidate, resolved } = fixture();
    if (mutation === 'other-color') candidate[5].style.color = 'red';
    if (mutation === 'geometry') candidate[1].bounds[2] = 101;
    if (mutation === 'typography') candidate[1].style.fontSize = '14px';
    if (mutation === 'trend-text') candidate[1].text = 'Other';
    if (mutation === 'wrong-trend-color') candidate[1].style.color = 'blue';
    if (mutation === 'missing-node') candidate.pop();
    assert.throws(() => assertContentParity(baseline, candidate, resolved));
  });
}

test('cannot supply fewer checks, duplicate targets or an unrelated node as a correction', () => {
  const { baseline, candidate, resolved } = fixture();
  assert.throws(() => assertContentParity(baseline, candidate, resolved.slice(1)));
  const duplicate = structuredClone(resolved);
  duplicate[1].index = duplicate[0].index;
  assert.throws(() => assertContentParity(baseline, candidate, duplicate));
  const unrelated = structuredClone(resolved);
  unrelated[0].index = 5;
  assert.throws(() => assertContentParity(baseline, candidate, unrelated));
});
