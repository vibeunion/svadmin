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
import LiteStepForm from './LiteStepForm.svelte';
import LiteModalForm from './LiteModalForm.svelte';
import LiteDrawerForm from './LiteDrawerForm.svelte';
import LiteTableSummary from './LiteTableSummary.svelte';
import LiteVersionDiffViewer from './LiteVersionDiffViewer.svelte';
import LiteVirtualTable from './LiteVirtualTable.svelte';
import LiteEditableTable from './LiteEditableTable.svelte';
import LiteDraggableRowTable from './LiteDraggableRowTable.svelte';
import LiteSplitPaneLayout from './LiteSplitPaneLayout.svelte';
import LiteMasterDetailView from './LiteMasterDetailView.svelte';
import LiteMediaLibraryModal from './LiteMediaLibraryModal.svelte';
import LiteImageCropper from './LiteImageCropper.svelte';
import LiteActivityFeed from './LiteActivityFeed.svelte';
import LitePresenceAvatarGroup from './LitePresenceAvatarGroup.svelte';
import LitePrintableBill from './LitePrintableBill.svelte';
import LiteJsonSchemaForm from './LiteJsonSchemaForm.svelte';
import LiteMentionsInput from './LiteMentionsInput.svelte';
import LiteKanbanBoard from './LiteKanbanBoard.svelte';
import LitePivotTable from './LitePivotTable.svelte';
import LiteMultiTabKeepAlive from './LiteMultiTabKeepAlive.svelte';
import LiteGanttChart from './LiteGanttChart.svelte';
import LiteCanvasAnnotation from './LiteCanvasAnnotation.svelte';
import LiteSignaturePad from './LiteSignaturePad.svelte';

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

  it('renders LiteStepForm with step navigation headers', () => {
    const steps = [
      { title: 'Account Details' },
      { title: 'Payment Method' },
      { title: 'Confirmation' },
    ];
    const view = render(LiteStepForm, {
      steps,
      currentStep: 1,
    });
    expect(view.container.textContent).toContain('Account Details');
    expect(view.container.textContent).toContain('Payment Method');
    expect(view.container.textContent).toContain('Confirmation');
  });

  it('renders LiteModalForm and LiteDrawerForm with form headers', () => {
    const modalView = render(LiteModalForm, {
      title: 'Quick Create User',
      description: 'Fill in user details',
    });
    expect(modalView.container.textContent).toContain('Quick Create User');
    expect(modalView.container.textContent).toContain('Fill in user details');

    const drawerView = render(LiteDrawerForm, {
      title: 'Edit Preferences',
    });
    expect(drawerView.container.textContent).toContain('Edit Preferences');
  });

  it('renders LiteTableSummary with calculated aggregation values', () => {
    const data = [
      { id: 1, amount: 100 },
      { id: 2, amount: 250 },
    ];
    const columns = [
      { key: 'id', label: 'ID' },
      { key: 'amount', label: 'Amount' },
    ];
    const view = render(LiteTableSummary, {
      columns,
      data,
      aggregations: { amount: 'sum' },
      title: 'Total',
    });
    expect(view.container.textContent).toContain('Total');
    expect(view.container.textContent).toContain('350');
  });

  it('renders LiteVersionDiffViewer with added and modified fields', () => {
    const oldValue = { name: 'Alpha', status: 'draft' };
    const newValue = { name: 'Alpha v2', status: 'published', tag: 'new' };
    const view = render(LiteVersionDiffViewer, {
      oldValue,
      newValue,
    });
    expect(view.container.textContent).toContain('Alpha');
    expect(view.container.textContent).toContain('Alpha v2');
    expect(view.container.textContent).toContain('Record Comparison');
  });

  it('renders LiteVirtualTable with data rows', () => {
    const items = [
      { id: 1, code: 'A001', name: 'Item 1' },
      { id: 2, code: 'A002', name: 'Item 2' },
    ];
    const columns = [
      { key: 'code', label: 'Code' },
      { key: 'name', label: 'Name' },
    ];
    const view = render(LiteVirtualTable, {
      items,
      columns,
    });
    expect(view.container.textContent).toContain('A001');
    expect(view.container.textContent).toContain('Item 2');
  });

  it('renders LiteEditableTable and LiteDraggableRowTable', () => {
    const editView = render(LiteEditableTable, {
      columns: [{ key: 'title', label: 'Title' }],
      data: [{ id: 1, title: 'Test Task' }],
    });
    expect(editView.container.querySelector('input[type="text"]')).toBeTruthy();

    const dragView = render(LiteDraggableRowTable, {
      columns: [{ key: 'name', label: 'Name' }],
      items: [{ id: 1, name: 'First' }],
    });
    expect(dragView.container.textContent).toContain('First');
  });

  it('renders LiteSplitPaneLayout and LiteMasterDetailView', () => {
    const splitView = render(LiteSplitPaneLayout);
    expect(splitView.container.querySelector('.lite-split-layout')).toBeTruthy();

    const masterView = render(LiteMasterDetailView, {
      items: [{ id: 1, title: 'Master 1' }],
    });
    expect(masterView.container.textContent).toContain('Master 1');
  });

  it('renders LiteMediaLibraryModal and LiteImageCropper', () => {
    const mediaView = render(LiteMediaLibraryModal, {
      mediaItems: [{ id: '1', name: 'Banner.jpg', url: '/banner.jpg' }],
    });
    expect(mediaView.container.textContent).toContain('Banner.jpg');

    const cropView = render(LiteImageCropper, {
      imageUrl: '/avatar.png',
      aspectRatio: 1,
    });
    expect(cropView.container.textContent).toContain('Image Crop');
  });

  it('renders LiteActivityFeed and LitePresenceAvatarGroup', () => {
    const actView = render(LiteActivityFeed, {
      activities: [{ id: '1', action: 'approved order', timestamp: '10:00' }],
    });
    expect(actView.container.textContent).toContain('approved order');

    const presView = render(LitePresenceAvatarGroup, {
      users: [{ id: '1', name: 'Alice' }],
    });
    expect(presView.container.textContent).toContain('Alice');
  });

  it('renders LitePrintableBill and LiteJsonSchemaForm', () => {
    const billView = render(LitePrintableBill, {
      billNumber: 'INV-2026-001',
      date: '2026-08-29',
      customerName: 'Acme Corp',
      items: [{ name: 'SaaS License', quantity: 1, unitPrice: 999 }],
    });
    expect(billView.container.textContent).toContain('INV-2026-001');
    expect(billView.container.textContent).toContain('Acme Corp');

    const schemaView = render(LiteJsonSchemaForm, {
      schema: {
        title: 'Project Form',
        properties: {
          projectName: { type: 'string', title: 'Project Name' },
        },
      },
    });
    expect(schemaView.container.textContent).toContain('Project Form');
    expect(schemaView.container.textContent).toContain('Project Name');
  });

  it('renders LiteMentionsInput, LiteKanbanBoard, LitePivotTable, LiteMultiTabKeepAlive, and LiteGanttChart', () => {
    const mentionsView = render(LiteMentionsInput, {
      users: [{ id: '1', label: 'Bob' }],
      tags: [{ id: 't1', label: 'Frontend' }],
    });
    expect(mentionsView.container.querySelector('textarea')).toBeTruthy();
    expect(mentionsView.container.textContent).toContain('@Bob');

    const kanbanView = render(LiteKanbanBoard, {
      columns: [{ id: 'col1', title: 'In Progress' }],
      cards: [{ id: 'c1', title: 'Implement Kanban', columnId: 'col1' }],
    });
    expect(kanbanView.container.textContent).toContain('In Progress');
    expect(kanbanView.container.textContent).toContain('Implement Kanban');

    const pivotView = render(LitePivotTable, {
      data: [{ dept: 'Sales', product: 'Cloud', rev: 500 }],
      rowField: 'dept',
      columnField: 'product',
      valueField: 'rev',
    });
    expect(pivotView.container.textContent).toContain('Pivot Analysis');
    expect(pivotView.container.textContent).toContain('Sales');

    const tabView = render(LiteMultiTabKeepAlive, {
      tabs: [{ id: 'tab1', title: 'Overview', path: '/overview' }],
      activeTabId: 'tab1',
    });
    expect(tabView.container.textContent).toContain('Overview');

    const ganttView = render(LiteGanttChart, {
      tasks: [{ id: 'gt1', title: 'Sprint 1', startDay: 0, durationDays: 5 }],
    });
    expect(ganttView.container.textContent).toContain('Project Schedule');
    expect(ganttView.container.textContent).toContain('Sprint 1');

    const annoView = render(LiteCanvasAnnotation, {
      imageUrl: '/diagram.png',
      annotations: [{ id: '1', type: 'defect', text: 'Misaligned bolt' }],
    });
    expect(annoView.container.textContent).toContain('Image Annotation & Markings');
    expect(annoView.container.textContent).toContain('Misaligned bolt');

    const sigView = render(LiteSignaturePad, {
      value: '/sig.png',
    });
    expect(sigView.container.textContent).toContain('Electronic Signature');
    expect(sigView.container.querySelector('img')).toBeTruthy();
  });
});
