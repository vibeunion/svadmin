import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = dirname(fileURLToPath(import.meta.url));
const read = (path: string) => readFileSync(join(root, path), 'utf8');

function block(source: string, selector: string): string {
  const start = source.indexOf(selector);
  expect(start, selector).toBeGreaterThan(-1);
  return source.slice(start, source.indexOf('}', start));
}

describe('Host control metrics for newly landed APIs', () => {
  it('lays horizontal radios out in a row with the official 20px gap', () => {
    const source = read('components/RadioGroup.svelte');
    const vertical = source.indexOf('.svadmin-radio-group__options {');
    const horizontal = source.indexOf('.svadmin-radio-group__options--horizontal {');
    expect(horizontal).toBeGreaterThan(vertical);
    const rule = block(source, '.svadmin-radio-group__options--horizontal {');
    expect(rule).toContain('display: flex');
    expect(rule).toContain('gap: 20px');
    expect(source).not.toContain('gap-4');
  });

  it('keeps tag entry on the default control height and the official small radius', () => {
    const source = read('components/TagsInput.svelte');
    const field = block(source, '.svadmin-tags-input {');
    expect(field).toContain('min-block-size: var(--svadmin-control-h)');
    expect(field).toContain('border-radius: var(--border-radius-small, 2px)');
    expect(field).not.toContain('6px');
    const tag = block(source, '.svadmin-tags-input__tag {');
    expect(tag).toContain('height: 24px');
    expect(tag).toContain('font-size: var(--svadmin-text-caption)');
    expect(tag).toContain('line-height: calc(22 / 12)');
    expect(block(source, '.svadmin-tags-input__clear {')).toContain('font-size: var(--svadmin-text-caption)');
  });

  it('uses the official statistic extra size and empty description body size', () => {
    const extra = block(read('components/Statistic.svelte'), '.svadmin-statistic__extra {');
    expect(extra).toContain('font-size: var(--svadmin-text-body)');
    expect(extra).toContain('margin-top: 8px');
    const empty = block(read('components/EmptyState.svelte'), '.empty-state--vertical p');
    expect(empty).toContain('font-size: var(--svadmin-text-body)');
    expect(empty).toContain('line-height: 1.5715');
    expect(empty).not.toContain('--svadmin-text-label');
  });

  it('stacks slider marks under the native track at the official label size', () => {
    const slider = read('components/Slider.svelte');
    expect(block(slider, '.svadmin-slider {')).toContain('flex-direction: column');
    expect(slider).toContain('class="svadmin-slider__mark"');
    expect(slider).not.toContain('text-[11px]');
    const range = read('components/RangeSlider.svelte');
    expect(block(range, '.svadmin-range-slider {')).toContain('flex-direction: column');
    expect(range).not.toContain('text-[11px]');
  });
});
