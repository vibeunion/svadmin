import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import LiteTreeSelect from './fields/LiteTreeSelect.svelte';
import LiteCascader from './fields/LiteCascader.svelte';
import LiteTransfer from './LiteTransfer.svelte';
import LiteFilterBuilder from './LiteFilterBuilder.svelte';
import LiteDynamicFormList from './LiteDynamicFormList.svelte';
import LiteWatermark from './LiteWatermark.svelte';
import LiteColumnSettings from './LiteColumnSettings.svelte';
import LiteImportWizard from './LiteImportWizard.svelte';
import LiteColumnHeaderFilter from './LiteColumnHeaderFilter.svelte';
import LiteTreeTable from './LiteTreeTable.svelte';
import LiteSensitiveDataMask from './LiteSensitiveDataMask.svelte';
import LiteApprovalActionCard from './LiteApprovalActionCard.svelte';


describe('Lite Enterprise Components SSR rendering', () => {
  it('renders LiteTreeSelect in show and edit mode', () => {
    const options = [
      {
        value: 'dept1',
        label: 'Engineering',
        children: [
          { value: 'team1', label: 'Frontend' },
          { value: 'team2', label: 'Backend' },
        ],
      },
    ];

    const showView = render(LiteTreeSelect, {
      value: 'team1',
      options,
      mode: 'show',
    });
    expect(showView.container.textContent).toContain('Frontend');
    showView.unmount();

    const editView = render(LiteTreeSelect, {
      name: 'department',
      value: 'team2',
      options,
      mode: 'edit',
    });
    expect(editView.container.querySelector('select')).toBeTruthy();
    expect(editView.container.textContent).toContain('Frontend');
    expect(editView.container.textContent).toContain('Backend');
  });

  it('renders LiteCascader with path formatting and select options', () => {
    const options = [
      {
        value: 'zhejiang',
        label: 'Zhejiang',
        children: [
          {
            value: 'hangzhou',
            label: 'Hangzhou',
            children: [{ value: 'xihu', label: 'Xihu' }],
          },
        ],
      },
    ];

    const showView = render(LiteCascader, {
      value: ['zhejiang', 'hangzhou', 'xihu'],
      options,
      separator: ' / ',
      mode: 'show',
    });
    expect(showView.container.textContent).toContain('Zhejiang / Hangzhou / Xihu');
    showView.unmount();

    const editView = render(LiteCascader, {
      name: 'location',
      value: ['zhejiang', 'hangzhou', 'xihu'],
      options,
      mode: 'edit',
    });
    expect(editView.container.querySelector('select')).toBeTruthy();
  });

  it('renders LiteTransfer with source and target panels', () => {
    const dataSource = [
      { key: '1', title: 'Item 1' },
      { key: '2', title: 'Item 2' },
      { key: '3', title: 'Item 3' },
    ];
    const targetKeys = ['2'];

    const view = render(LiteTransfer, {
      dataSource,
      targetKeys,
      titles: ['Available', 'Assigned'],
    });

    expect(view.container.textContent).toContain('Available');
    expect(view.container.textContent).toContain('Assigned');
    expect(view.container.textContent).toContain('Item 1');
    expect(view.container.textContent).toContain('Item 2');
    expect(view.container.querySelectorAll('.lite-transfer-panel')).toHaveLength(2);
  });

  it('renders LiteFilterBuilder with filter rows and operators', () => {
    const fields = [
      { key: 'name', label: 'Name', type: 'text' as const },
      { key: 'age', label: 'Age', type: 'number' as const },
    ];
    const filters = [
      { field: 'name', operator: 'contains' as const, value: 'Alice' },
    ];

    const view = render(LiteFilterBuilder, {
      fields,
      filters,
      logicalOperator: 'and',
    });

    expect(view.container.textContent).toContain('AND');
    expect(view.container.textContent).toContain('Name');
    expect(view.container.querySelector('input[type="text"]')).toBeTruthy();
  });

  it('renders LiteDynamicFormList with item cards and actions', () => {
    const items = [
      { key: 'prod1', quantity: 2 },
      { key: 'prod2', quantity: 5 },
    ];

    const view = render(LiteDynamicFormList, {
      items,
      label: 'Order Items',
      name: 'orderItems',
    });

    expect(view.container.textContent).toContain('Order Items');
    expect(view.container.textContent).toContain('#1');
    expect(view.container.textContent).toContain('#2');
    expect(view.container.querySelectorAll('.lite-dynamic-item-card')).toHaveLength(2);
  });

  it('renders LiteWatermark with SVG background pattern', () => {
    const view = render(LiteWatermark, {
      content: 'CONFIDENTIAL SSR',
      opacity: 0.15,
    });
    expect(view.container.querySelector('.lite-watermark-wrapper')).toBeTruthy();
  });

  it('renders LiteColumnSettings with checkbox options', () => {
    const columns = [
      { key: 'name', label: 'Name', visible: true },
      { key: 'role', label: 'Role', visible: false },
    ];
    const view = render(LiteColumnSettings, {
      columns,
      title: 'Columns',
    });
    expect(view.container.textContent).toContain('Name');
    expect(view.container.textContent).toContain('Role');
    expect(view.container.querySelectorAll('input[type="checkbox"]')).toHaveLength(2);
  });
  it('renders LiteImportWizard with file input and schema tags', () => {
    const view = render(LiteImportWizard, {
      resourceName: 'orders',
      fields: [{ key: 'total', label: 'Total', type: 'number' as const }],
    });
    expect(view.container.textContent).toContain('Import orders');
    expect(view.container.querySelector('input[type="file"]')).toBeTruthy();
  });

  it('renders LiteColumnHeaderFilter with filter link', () => {
    const view = render(LiteColumnHeaderFilter, {
      field: { key: 'status', label: 'Status', type: 'select' as const },
    });
    expect(view.container.querySelector('.lite-filter-icon')).toBeTruthy();
  });

  it('renders LiteTreeTable with hierarchical indentation', () => {
    const data = [
      { id: 1, name: 'Parent', children: [{ id: 2, name: 'Child' }] },
    ];
    const view = render(LiteTreeTable, {
      data,
      columns: [{ key: 'name', label: 'Name' }],
    });
    expect(view.container.textContent).toContain('Parent');
    expect(view.container.textContent).toContain('Child');
  });

  it('renders LiteSensitiveDataMask with masked format', () => {
    const view = render(LiteSensitiveDataMask, {
      value: '13812345678',
      type: 'phone',
    });
    expect(view.container.textContent).toContain('138****5678');
  });

  it('renders LiteApprovalActionCard with approve and reject actions', () => {
    const view = render(LiteApprovalActionCard, {
      title: 'Contract Approval',
      status: 'pending',
    });
    expect(view.container.textContent).toContain('Contract Approval');
    expect(view.container.textContent).toContain('Approve');
    expect(view.container.textContent).toContain('Reject');
  });
});
