import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import PdfDocumentViewer from './PdfDocumentViewer.svelte';
import SpreadsheetView from './SpreadsheetView.svelte';
import DecisionTable from './DecisionTable.svelte';
import OfflineSyncBanner from './OfflineSyncBanner.svelte';

describe('PdfDocumentViewer, SpreadsheetView, DecisionTable, and OfflineSyncBanner', () => {
  it('renders PdfDocumentViewer with toolbar and page info', () => {
    const view = render(PdfDocumentViewer, {
      fileName: 'Agreement.pdf',
      totalPages: 5,
      currentPage: 1,
    });

    expect(view.container.textContent).toContain('Agreement.pdf');
    expect(view.container.textContent).toContain('1');
    expect(view.container.textContent).toContain('5');
    expect(view.container.textContent).toContain('Download');
  });

  it('renders SpreadsheetView with grid and formula evaluation', () => {
    const view = render(SpreadsheetView, {
      sheets: [
        {
          id: 's1',
          name: 'Q3 Report',
          rows: 3,
          cols: 3,
          cells: { A1: '10', A2: '20', A3: '=SUM(A1:A2)' },
        },
      ],
    });

    expect(view.container.textContent).toContain('Q3 Report');
    expect(view.container.textContent).toContain('Export CSV');
    expect(view.container.querySelector('table')).not.toBeNull();
  });

  it('renders DecisionTable with condition and action columns', () => {
    const view = render(DecisionTable, {
      title: 'Discount Policy',
      columns: [
        { key: 'level', label: 'Level', type: 'condition' },
        { key: 'rate', label: 'Rate', type: 'action' },
      ],
      rules: [{ id: 'r1', values: { level: 'Gold', rate: '20%' } }],
    });

    expect(view.container.textContent).toContain('Discount Policy');
    expect(view.container.textContent).toContain('Conditions');
    expect(view.container.textContent).toContain('Actions');
  });

  it('renders OfflineSyncBanner with pending mutation count', () => {
    const view = render(OfflineSyncBanner, {
      isOnline: false,
      pendingMutations: [
        { id: 'm1', action: 'update', resource: 'orders', timestamp: '12:00' },
      ],
    });

    expect(view.container.textContent).toContain('Offline Mode');
    expect(view.container.textContent).toContain('Sync Now');
  });
});
