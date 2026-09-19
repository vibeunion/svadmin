import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { uiButton, uiBadge, uiInput, uiTextarea } from '../design/primitive-recipes.ts';

const mix = '@supports (color: color-mix(in lab, red, red))';
test('button retains all six public variants and eight sizes', () => {
  assert.deepEqual(Object.keys(uiButton.variants.variant), ['default', 'outline', 'secondary', 'ghost', 'destructive', 'link']);
  assert.deepEqual(Object.keys(uiButton.variants.size), ['default', 'xs', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg']);
  assert.ok(!('defaultVariants' in uiButton));
});
test('badge retains all eleven public variants, including subtle and pill variants', () => {
  assert.deepEqual(Object.keys(uiBadge.variants.variant), ['default', 'secondary', 'destructive', 'subtle', 'subtle-success', 'subtle-warning', 'subtle-destructive', 'subtle-pill', 'outline', 'ghost', 'link']);
  assert.ok(!('defaultVariants' in uiBadge));
});
test('disabled button and disabled link retain pointer-event protection', () => {
  assert.deepEqual(uiButton.base['&:disabled, &[aria-disabled="true"]'], { pointerEvents: 'none', opacity: '0.5' });
});
test('color-mix has native fallbacks rather than compiler directives', () => {
  for (const recipe of [uiButton, uiBadge, uiInput, uiTextarea]) {
    const serialized = JSON.stringify(recipe);
    assert.ok(!/(?:--tw-|svadmin-u-|@(?:apply|theme|source)\b)/.test(serialized));
  }
  assert.equal(uiButton.variants.variant.default['&:hover'].background, 'var(--primary)');
  assert.ok(uiButton.variants.variant.default['&:hover'][mix].background.includes('color-mix'));
  for (const variant of ['destructive', 'subtle', 'subtle-success', 'subtle-warning', 'subtle-destructive']) {
    const styles = uiBadge.variants.variant[variant];
    assert.ok(styles.background.startsWith('var('));
    assert.ok(styles[mix].background.startsWith('color-mix('));
  }
});
test('input file slots and native file input geometry are preserved', () => {
  assert.deepEqual(uiInput.slots, ['root', 'control', 'visual', 'button', 'name']);
  const file = uiInput.base.control['&[data-input-type="file"]'];
  assert.equal(file.position, 'absolute');
  assert.equal(file.height, '100%');
  assert.equal(file.opacity, '0');
  assert.equal(uiInput.base.visual.pointerEvents, 'none');
  assert.ok(uiInput.base.control['&[data-input-type="file"]:focus-visible + .svadmin-file-input__visual']);
});
test('input and textarea retain focus, invalid, disabled and placeholder states', () => {
  for (const styles of [uiInput.base.control, uiTextarea.base]) {
    assert.equal(styles['&:focus-visible'].borderColor, 'var(--ring)');
    assert.equal(styles['&[aria-invalid="true"]'].borderColor, 'var(--destructive)');
    assert.equal(styles['&:disabled'].cursor, 'not-allowed');
    assert.equal(styles['&::placeholder'].color, 'var(--muted-foreground)');
  }
});
test('recipe families are registered and all runtime variants are pre-generated', () => {
  const config = readFileSync(new URL('../panda.config.ts', import.meta.url), 'utf8');
  for (const name of ['uiButton', 'uiBadge', 'uiInput', 'uiTextarea']) {
    assert.match(config, new RegExp(`${name}: \\[\\'\\*\\'\\]`));
  }
});
