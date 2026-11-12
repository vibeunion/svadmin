import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import Steps, { type StepItem } from './Steps.svelte';

const items: StepItem[] = [
  { id: 'a', title: 'Details' },
  { id: 'b', title: 'Review' },
  { id: 'c', title: 'Done' },
];

describe('Steps', () => {
  it('renders connector fills only for completed steps', () => {
    const { container } = render(Steps, { props: { items, current: 1 } });
    const connectors = container.querySelectorAll('.svadmin-steps__connector');
    expect(connectors).toHaveLength(2);
    expect(connectors[0]?.getAttribute('data-filled')).toBe('true');
    expect(connectors[1]?.getAttribute('data-filled')).toBe('false');
    expect(connectors[0]?.querySelector('.svadmin-steps__connector-fill')).not.toBeNull();
  });

  it('marks the active step and exposes accessible labels', () => {
    const { container, getByRole } = render(Steps, { props: { items, current: 1 } });
    const entries = container.querySelectorAll('.svadmin-steps__item');
    expect(entries[1]?.getAttribute('data-status')).toBe('process');
    expect(entries[0]?.getAttribute('data-status')).toBe('finish');
    expect(entries[2]?.getAttribute('data-status')).toBe('wait');
    expect(getByRole('list')).toBeTruthy();
  });

  it('renders vertical connectors without horizontal fills', () => {
    const { container } = render(Steps, {
      props: { items, current: 2, direction: 'vertical' },
    });
    const list = container.querySelector('.svadmin-steps');
    expect(list?.getAttribute('data-direction')).toBe('vertical');
    const connectors = container.querySelectorAll('.svadmin-steps__connector');
    expect(connectors).toHaveLength(2);
    expect(connectors[1]?.getAttribute('data-filled')).toBe('true');
  });
});