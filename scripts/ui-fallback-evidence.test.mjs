import assert from 'node:assert/strict';
import test from 'node:test';
import { withoutColorMix } from './ui-fallback-evidence.mjs';

test('unsupported color-mix preserves an explicit focus fallback', () => {
  const result = withoutColorMix(`
    .button:focus-visible {
      outline: 2px solid var(--ring);
      outline: 2px solid color-mix(in oklch, var(--ring) 48%, transparent);
      outline-offset: 2px;
    }
    @supports (color: color-mix(in oklch, red, blue)) {
      .badge { background: color-mix(in oklch, red, blue); }
    }
  `);
  assert.equal(result.removedConditions, 1);
  assert.match(result.css, /outline: 2px solid var\(--ring\)/);
  assert.match(result.css, /outline-offset: 2px/);
  assert.doesNotMatch(result.css, /color-mix|@supports/);
});

test('unsupported color-mix does not invent a missing focus fallback', () => {
  const result = withoutColorMix(`
    .button:focus-visible { outline: 2px solid color-mix(in oklch, red, blue); }
    @supports (color: color-mix(in oklch, red, blue)) { .badge { color: red; } }
  `);
  assert.doesNotMatch(result.css, /outline:/);
});

test('unmodeled support conditions fail rather than discard fallback branches', () => {
  assert.throws(() => withoutColorMix(`
    @supports not (color: color-mix(in oklch, red, blue)) { .button { outline: 2px solid red; } }
  `), /modeled explicitly/);
  assert.throws(() => withoutColorMix('.button { color: red; }'), /actual published fallback branches/);
});
