import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetContext, type MenuItem } from '@svadmin/core';
import Breadcrumbs from './Breadcrumbs.svelte';

const route = vi.hoisted(() => ({ path: '/' }));
vi.mock('../router-state.svelte.js', () => ({ getPath: () => route.path }));

const menu: MenuItem[] = [{
  name: 'account', label: 'Account', children: [{
    name: 'members', label: 'Members', children: [
      { name: 'starter', label: 'Get started', href: '/account/members/members-starter' },
      { name: 'team', label: 'Team members', href: '/account/members/team-members' },
    ],
  }],
}];

function trail(path: string, items = menu) {
  route.path = path;
  const view = render(Breadcrumbs, { menu: items });
  const labels = Array.from(view.container.querySelectorAll('.svadmin-breadcrumbs__item'))
    .map(item => item.textContent?.trim());
  const links = Array.from(view.container.querySelectorAll('a')).map(link => link.getAttribute('href'));
  view.unmount();
  return { labels, links };
}

afterEach(() => { cleanup(); resetContext(); });

describe('member breadcrumb aliases', () => {
  it.each([
    ['/account/members-starter', '/account/members/members-starter', 'Get started'],
    ['/account/team-members', '/account/members/team-members', 'Team members'],
  ])('uses the canonical trail for %s', (alias, canonical, title) => {
    const expected = trail(canonical);
    expect(expected.labels.slice(1)).toEqual(['Account', 'Members', title]);
    expect(trail(alias)).toEqual(expected);
    expect(trail(`#${alias}/?filter=open`)).toEqual(expected);
  });

  it.each(['/account/members-starter', '/account/team-members'])(
    'prefers an exact custom menu entry for %s', alias => {
      const custom: MenuItem[] = [...menu, {
        name: 'custom', label: 'Custom workspace', children: [
          { name: 'custom-members', label: 'Custom member view', href: alias },
        ],
      }];
      expect(trail(alias, custom).labels.slice(1)).toEqual(['Custom workspace', 'Custom member view']);
    },
  );

  it('does not infer a trail from labels or similar unknown paths', () => {
    expect(trail('/account/team-members-extra').labels).toEqual([]);
    expect(trail('/account/team-members', [{
      name: 'team', label: 'Team members', href: '/custom-directory',
    }]).labels).toEqual([]);
  });
});
