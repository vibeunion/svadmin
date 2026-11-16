import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import Steps, { type StepItem } from './Steps.svelte';

const items: StepItem[] = [
  { id: '1', title: 'Basic Info' },
  { id: '2', title: 'Verification' },
  { id: '3', title: 'Confirmation' },
];

describe('Steps dot type and small size options', () => {
  it('renders dot indicators when type is dot', () => {
    const { container } = render(Steps, {
      props: {
        items,
        current: 1,
        type: 'dot',
      },
    });

    const list = container.querySelector('.svadmin-steps');
    expect(list?.getAttribute('data-type')).toBe('dot');

    const dots = container.querySelectorAll('.svadmin-steps__dot');
    expect(dots).toHaveLength(3);
  });

  it('sets data-size to small on root element', () => {
    const { container } = render(Steps, {
      props: {
        items,
        current: 0,
        size: 'small',
      },
    });

    const list = container.querySelector('.svadmin-steps');
    expect(list?.getAttribute('data-size')).toBe('small');
  });

  it('renders error status on dot when status is error', () => {
    const { container } = render(Steps, {
      props: {
        items,
        current: 1,
        status: 'error',
        type: 'dot',
      },
    });

    const activeItem = container.querySelectorAll('.svadmin-steps__item')[1];
    expect(activeItem?.getAttribute('data-status')).toBe('error');
    expect(activeItem?.querySelector('.svadmin-steps__dot')).not.toBeNull();
  });
});
