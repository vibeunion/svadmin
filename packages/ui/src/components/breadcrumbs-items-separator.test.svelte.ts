import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import Breadcrumbs, { type BreadcrumbItem } from './Breadcrumbs.svelte';

describe('Breadcrumbs items and separator enhancements', () => {
  const customItems: BreadcrumbItem[] = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Settings', href: '/dashboard/settings' },
    { label: 'Security' },
  ];

  it('renders explicit custom items correctly', () => {
    const { container, getByText } = render(Breadcrumbs, {
      items: customItems,
    });

    expect(getByText('Dashboard')).toBeTruthy();
    expect(getByText('Settings')).toBeTruthy();
    expect(getByText('Security')).toBeTruthy();

    const links = container.querySelectorAll('a');
    expect(links).toHaveLength(2);
    expect(links[0]?.getAttribute('href')).toBe('/dashboard');
    expect(links[1]?.getAttribute('href')).toBe('/dashboard/settings');
  });

  it('passes arrow separator to breadcrumb separators', () => {
    const { container } = render(Breadcrumbs, {
      items: customItems,
      separator: 'arrow',
    });

    const separators = container.querySelectorAll('[data-slot="breadcrumb-separator"]');
    expect(separators).toHaveLength(2);
    expect(separators[0]?.getAttribute('data-separator')).toBe('arrow');
  });
});
