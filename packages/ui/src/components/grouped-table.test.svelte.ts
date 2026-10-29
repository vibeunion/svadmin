import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import GroupedTableHarness from '../../test/fixtures/GroupedTableHarness.svelte';

afterEach(() => cleanup());

describe('GroupedTable', () => {
  it('renders grouped headers and leaf cells', () => {
    const view = render(GroupedTableHarness);
    const group = view.getByRole('columnheader', { name: 'Resource usage' });
    expect(group.getAttribute('colspan')).toBe('2');
    expect(view.getByRole('columnheader', { name: 'Name' }).getAttribute('rowspan')).toBe('2');
    expect(view.getByRole('columnheader', { name: 'CPU' })).toBeTruthy();
    expect(view.getByRole('cell', { name: 'api' })).toBeTruthy();
    expect(view.getByRole('cell', { name: '81' })).toBeTruthy();
    expect(view.getByRole('table', { name: 'Service usage' })).toBeTruthy();
  });
});
