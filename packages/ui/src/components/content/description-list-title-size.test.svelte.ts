import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import DescriptionList from './DescriptionList.svelte';

describe('DescriptionList title, extra slot, and size options', () => {
  const items = [
    { label: 'Username', value: 'admin_user' },
    { label: 'Email', value: 'admin@example.com' },
  ];

  it('renders title and extra action slot', () => {
    const extraSnippet = createRawSnippet(() => ({
      render: () => '<button type="button" data-testid="edit-btn">Edit</button>',
    }));

    const { getByText, getByTestId, container } = render(DescriptionList, {
      title: 'Account Information',
      extra: extraSnippet,
      items,
    });

    expect(getByText('Account Information')).toBeTruthy();
    expect(getByTestId('edit-btn')).toBeTruthy();
    const header = container.querySelector('[data-slot="description-list-header"]');
    expect(header).not.toBeNull();
  });

  it('applies small size padding classes in bordered layout', () => {
    const { container } = render(DescriptionList, {
      items,
      bordered: true,
      size: 'small',
    });

    const dt = container.querySelector('.svadmin-description-list__label');
    expect(dt?.classList.contains('px-3')).toBe(true);
    expect(dt?.classList.contains('py-1.5')).toBe(true);
  });

  it('applies large size padding classes in bordered layout', () => {
    const { container } = render(DescriptionList, {
      items,
      bordered: true,
      size: 'large',
    });

    const dt = container.querySelector('.svadmin-description-list__label');
    expect(dt?.classList.contains('px-5')).toBe(true);
    expect(dt?.classList.contains('py-3.5')).toBe(true);
  });

  it('applies compact gap in unbordered layout for small size', () => {
    const { container } = render(DescriptionList, {
      items,
      bordered: false,
      size: 'small',
    });

    const dl = container.querySelector('dl');
    expect(dl?.classList.contains('gap-x-4')).toBe(true);
    expect(dl?.classList.contains('gap-y-3')).toBe(true);
  });
});
