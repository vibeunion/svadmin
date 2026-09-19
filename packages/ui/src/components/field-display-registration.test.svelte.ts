import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { builtinDisplayComponents } from './fieldComponentMap';

afterEach(cleanup);

describe('date and time display registrations', () => {
  it('preserves a native clock value instead of parsing it as a date', () => {
    const view = render(builtinDisplayComponents.time, { value: '13:45' });
    expect(view.getByText('13:45')).toBeTruthy();
  });

  it('renders a datetime with date and time formatting', () => {
    const value = '2026-09-19T13:45:00Z';
    const view = render(builtinDisplayComponents.datetime, { value });
    const expected = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
    expect(view.getByText(expected)).toBeTruthy();
  });
});
