import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { builtinDisplayComponents } from './fieldComponentMap.js';

afterEach(cleanup);

describe('registered temporal displays', () => {
  it.each(['00:00', '23:59', '12:34:56'])('retains wall-clock %s without inventing a date or timezone', (value) => {
    const view = render(builtinDisplayComponents.time, { value });
    expect(view.container.textContent).toBe(value);
  });

  it('renders both date and time for a datetime field', () => {
    const value = '2026-09-19T09:31:25Z';
    const view = render(builtinDisplayComponents.datetime, { value });
    expect(view.container.textContent).toBe(new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)));
    expect(view.container.querySelector('[title]')?.getAttribute('title')).toBe(value.replace('Z', '.000Z'));
  });

  it.each(['time', 'datetime'] as const)('does not admit object payloads through %s', (type) => {
    const view = render(builtinDisplayComponents[type], { value: { secret: 'must-not-render' } });
    expect(view.container.textContent).not.toContain('must-not-render');
    expect(view.container.querySelector('.field-date')).toBeNull();
  });
});
