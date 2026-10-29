import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetContext, type MenuItem } from '@svadmin/core';
import Breadcrumbs from './Breadcrumbs.svelte';

const route = vi.hoisted(() => ({ path: '/account/members/team-members' }));
vi.mock('../router-state.svelte.js', () => ({ getPath: () => route.path }));

const menu: MenuItem[] = [{
  name: 'account', label: 'Account', children: [{
    name: 'members', label: 'Members', children: [
      { name: 'team', label: 'Team', href: '/account/members/team-members' },
    ],
  }],
}];

afterEach(() => { cleanup(); resetContext(); });

describe('Breadcrumbs overflow', () => {
  it('collapses middle crumbs into a dropdown when maxItems is exceeded', async () => {
    const view = render(Breadcrumbs, { menu, maxItems: 3 });
    expect(view.getAllByRole('listitem')).toHaveLength(3);
    expect(view.queryByText('Account')).toBeNull();

    await fireEvent.click(view.getByRole('button', { name: 'Show hidden breadcrumbs' }));
    expect(await view.findByText('Account')).toBeTruthy();
    expect(view.getByText('Members')).toBeTruthy();
    expect(view.getByText('Team')).toBeTruthy();
  });
});
