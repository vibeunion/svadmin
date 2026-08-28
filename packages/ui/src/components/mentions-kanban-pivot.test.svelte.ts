import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import MentionsInput from './MentionsInput.svelte';
import KanbanBoard from './KanbanBoard.svelte';
import PivotTable from './PivotTable.svelte';

describe('MentionsInput, KanbanBoard, and PivotTable Components', () => {
  it('renders MentionsInput with placeholder', () => {
    const view = render(MentionsInput, {
      placeholder: 'Type @ to mention...',
      users: [{ id: '1', label: 'Alice' }],
      tags: [{ id: 't1', label: 'Urgent' }],
    });

    expect(view.container.querySelector('textarea')).not.toBeNull();
  });

  it('renders KanbanBoard with columns and cards', () => {
    const columns = [
      { id: 'todo', title: 'To Do' },
      { id: 'done', title: 'Done' },
    ];
    const cards = [
      { id: 'c1', title: 'Write tests', columnId: 'todo', priority: 'high' as const },
    ];

    const view = render(KanbanBoard, {
      columns,
      cards,
    });

    expect(view.container.textContent).toContain('To Do');
    expect(view.container.textContent).toContain('Write tests');
  });

  it('renders PivotTable with aggregation cross matrix', () => {
    const data = [
      { region: 'East', product: 'Pro', revenue: 100 },
      { region: 'East', product: 'Lite', revenue: 50 },
      { region: 'West', product: 'Pro', revenue: 200 },
    ];

    const view = render(PivotTable, {
      data,
      rowField: 'region',
      columnField: 'product',
      valueField: 'revenue',
      aggregator: 'sum',
    });

    expect(view.container.textContent).toContain('Pivot Analysis');
    expect(view.container.textContent).toContain('East');
    expect(view.container.textContent).toContain('West');
    expect(view.container.textContent).toContain('Grand Total');
  });
});
