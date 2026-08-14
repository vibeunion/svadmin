import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import LiteLayout from './LiteLayout.svelte';

describe('LiteLayout responsive navigation', () => {
  it('renders a keyboard-accessible mobile navigation fallback', () => {
    const { container } = render(LiteLayout, {
      resources: [
        { name: 'products', label: 'Products', fields: [] },
        { name: 'users', label: 'Users', fields: [] },
      ],
      currentResource: 'products',
      children: (() => ({
        render: () => '<p>Main content</p>',
      })) as never,
    });

    const mobileNav = container.querySelector('.lite-mobile-nav');
    expect(mobileNav).toBeTruthy();
    expect(mobileNav?.querySelector('a[href="/lite/products"]')?.textContent).toContain('Products');
    expect(mobileNav?.querySelector('a[href="/lite/users"]')?.textContent).toContain('Users');
  });

  it('renders nested navigation as always-available links without details elements', () => {
    const { container } = render(LiteLayout, {
      resources: [],
      menu: [{
        name: 'content',
        label: 'Content',
        children: [
          { name: 'posts', label: 'Posts', href: '/lite/posts' },
          {
            name: 'settings',
            label: 'Settings',
            children: [{ name: 'seo', label: 'SEO', href: '/lite/settings/seo' }],
          },
        ],
      }],
      children: (() => ({ render: () => '<p>Main content</p>' })) as never,
    });

    expect(container.querySelector('details')).toBeNull();
    expect(container.querySelector('summary')).toBeNull();
    expect(container.querySelector('.lite-menu-list a[href="/lite/posts"]')).not.toBeNull();
    expect(container.querySelector('.lite-menu-list a[href="/lite/settings/seo"]')).not.toBeNull();
  });
});
