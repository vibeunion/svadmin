import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import VirtualTable from './VirtualTable.svelte';

describe('VirtualTable Component', () => {
  it('renders virtual table header and visible rows', () => {
    const items = [
      { id: 1, name: 'Alpha', status: 'Active' },
      { id: 2, name: 'Beta', status: 'Inactive' },
    ];
    const columns = [
      { key: 'name', label: 'Name' },
      { key: 'status', label: 'Status' },
    ];

    const view = render(VirtualTable, {
      items,
      columns,
    });

    expect(view.container.textContent).toContain('Name');
    expect(view.container.textContent).toContain('Status');
    expect(view.container.textContent).toContain('Alpha');
    expect(view.container.textContent).toContain('Total 2 rows');
  });
});
