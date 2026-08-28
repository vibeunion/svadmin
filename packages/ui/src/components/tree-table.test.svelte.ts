import { describe, expect, it } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import TreeTable from './TreeTable.svelte';

describe('TreeTable Component', () => {
  const treeData = [
    {
      id: 1,
      name: 'Root Folder',
      type: 'directory',
      children: [
        { id: 2, name: 'Child Document', type: 'file' },
        { id: 3, name: 'Sub Folder', type: 'directory', children: [{ id: 4, name: 'Deep File', type: 'file' }] },
      ],
    },
  ];

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'type', label: 'Type' },
  ];

  it('renders root tree node', () => {
    const view = render(TreeTable, {
      data: treeData,
      columns,
    });
    expect(view.container.textContent).toContain('Root Folder');
  });

  it('expands all nodes when Expand All is clicked', async () => {
    const view = render(TreeTable, {
      data: treeData,
      columns,
    });

    const expandBtn = view.container.querySelector('button');
    if (expandBtn) await fireEvent.click(expandBtn);

    expect(view.container.textContent).toContain('Root Folder');
    expect(view.container.textContent).toContain('Child Document');
  });
});
