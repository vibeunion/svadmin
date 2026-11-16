import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import Calendar from './Calendar.svelte';

describe('Calendar card mode enhancements', () => {
  it('renders default non-card calendar', () => {
    const { container } = render(Calendar, {
      value: '2026-11-17',
    });

    const calendar = container.querySelector('.svadmin-calendar');
    expect(calendar?.getAttribute('data-card')).toBe('false');
    expect(calendar?.classList.contains('svadmin-calendar--card')).toBe(false);
  });

  it('renders card style calendar with data-card attribute', () => {
    const { container } = render(Calendar, {
      value: '2026-11-17',
      card: true,
    });

    const calendar = container.querySelector('.svadmin-calendar');
    expect(calendar?.getAttribute('data-card')).toBe('true');
    expect(calendar?.classList.contains('svadmin-calendar--card')).toBe(true);
  });
});
