import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import LiteTag from './LiteTag.svelte';

afterEach(() => cleanup());

describe('LiteTag', () => {
  it('renders a server-safe label', () => {
    const view = render(LiteTag, { label: 'Northwind', variant: 'secondary' });
    expect(view.getByText('Northwind')).toBeTruthy();
    expect(view.container.querySelector('a')).toBeNull();
  });

  it('renders a delete link when provided', () => {
    const view = render(LiteTag, {
      label: 'Northwind',
      closable: true,
      removeHref: '/tags/northwind/remove',
      removeLabel: 'Remove Northwind',
    });
    const link = view.getByRole('link', { name: 'Remove Northwind' });
    expect(link.getAttribute('href')).toBe('/tags/northwind/remove');
  });
});
