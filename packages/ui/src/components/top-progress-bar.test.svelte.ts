import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import TopProgressBar from './TopProgressBar.svelte';

afterEach(() => cleanup());

describe('TopProgressBar', () => {
  it('stays hidden without a value or indeterminate mode', () => {
    const view = render(TopProgressBar, { value: null });
    expect(view.container.querySelector('[role="progressbar"]')).toBeNull();
  });

  it('reports determinate progress with aria values and a scaled bar', () => {
    const view = render(TopProgressBar, { value: 150, fixed: false, ariaLabel: 'Uploading' });
    const bar = view.getByRole('progressbar', { name: 'Uploading' });
    expect(bar.getAttribute('aria-valuenow')).toBe('100');
    expect(bar.getAttribute('data-fixed')).toBe('false');
    const inner = view.container.querySelector('.svadmin-top-progress__bar');
    expect(inner?.getAttribute('style')).toContain('scaleX(1)');
  });

  it('omits aria-valuenow in indeterminate mode', () => {
    const view = render(TopProgressBar, { indeterminate: true });
    const bar = view.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBeNull();
    expect(view.container.querySelector('.svadmin-top-progress__bar')?.getAttribute('data-indeterminate')).toBe('true');
  });

  it('applies the height token', () => {
    const view = render(TopProgressBar, { value: 20, height: 6 });
    expect(view.getByRole('progressbar').getAttribute('style')).toContain('--svadmin-top-progress-height: 6px');
  });
});