import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import ContentPageHeader from './ContentPageHeader.svelte';

afterEach(cleanup);

describe('ContentPageHeader heading hierarchy', () => {
  it('uses a page heading by default', () => {
    const view = render(ContentPageHeader, { title: 'Settings', description: 'Account preferences' });
    expect(view.getByRole('heading', { name: 'Settings', level: 1 })).toBeTruthy();
    expect(view.getByText('Account preferences')).toBeTruthy();
  });

  it('supports embedded sections without changing the density recipe', async () => {
    const view = render(ContentPageHeader, { title: 'Profile', headingLevel: 'h2', density: 'compact' });
    const heading = view.getByRole('heading', { name: 'Profile', level: 2 });
    const classes = heading.className;
    expect(view.container.querySelector('[data-svadmin-content-header]')?.getAttribute('data-density')).toBe('compact');
    await view.rerender({ title: 'Profile', headingLevel: 'h1', density: 'compact' });
    expect(view.getByRole('heading', { name: 'Profile', level: 1 }).className).toBe(classes);
    expect(view.queryByRole('heading', { level: 2 })).toBeNull();
  });
});
