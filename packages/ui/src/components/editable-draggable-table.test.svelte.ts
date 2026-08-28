import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import EditableTable from './EditableTable.svelte';
import DraggableRowTable from './DraggableRowTable.svelte';

describe('EditableTable and DraggableRowTable', () => {
  it('renders EditableTable with columns and inputs', () => {
    const data = [
      { id: 1, title: 'Task 1', count: 5 },
    ];
    const columns = [
      { key: 'title', label: 'Title', type: 'text' as const },
      { key: 'count', label: 'Count', type: 'number' as const },
    ];

    const view = render(EditableTable, {
      columns,
      data,
    });

    expect(view.container.textContent).toContain('Editable Grid');
    expect(view.container.textContent).toContain('Add Row');
  });

  it('renders DraggableRowTable with row items', () => {
    const items = [
      { id: 1, name: 'Row 1' },
      { id: 2, name: 'Row 2' },
    ];
    const columns = [{ key: 'name', label: 'Name' }];

    const view = render(DraggableRowTable, {
      columns,
      items,
    });

    expect(view.container.textContent).toContain('Row 1');
    expect(view.container.textContent).toContain('Row 2');
  });
});
