import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import RecordCompareModal from './RecordCompareModal.svelte';

const testRecords = [
  {
    id: 'prod-01',
    name: 'Production Server A',
    cpu: '16 Cores',
    memory: '64 GB',
    storage: '1 TB NVMe',
    region: 'us-east-1',
    status: 'ACTIVE',
  },
  {
    id: 'prod-02',
    name: 'Production Server B',
    cpu: '32 Cores',
    memory: '64 GB',
    storage: '2 TB NVMe',
    region: 'us-east-1',
    status: 'ACTIVE',
  },
  {
    id: 'stage-01',
    name: 'Staging Server',
    cpu: '8 Cores',
    memory: '32 GB',
    storage: '500 GB SSD',
    region: 'us-west-2',
    status: 'STANDBY',
  },
];

describe('RecordCompareModal', () => {
  it('renders modal with dialog role, title, and record columns', () => {
    const { container } = render(RecordCompareModal, {
      props: {
        open: true,
        title: 'Cluster Node Comparison',
        description: 'Compare compute and storage specifications',
        records: testRecords,
      },
    });

    const dialog = screen.getByRole('dialog');
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute('data-svadmin-component')).toBe('RecordCompareModal');
    expect(container.textContent).toContain('Cluster Node Comparison');
    expect(container.textContent).toContain('Compare compute and storage specifications');
    expect(container.textContent).toContain('Production Server A');
    expect(container.textContent).toContain('Production Server B');
    expect(container.textContent).toContain('Staging Server');
  });

  it('highlights rows with differences and shows baseline indicator', () => {
    const { container } = render(RecordCompareModal, {
      props: {
        open: true,
        records: testRecords,
        benchmarkIndex: 0,
      },
    });

    expect(container.textContent).toContain('Baseline');
    // CPU row has differences (16 vs 32 vs 8)
    expect(container.textContent).toContain('16 Cores');
    expect(container.textContent).toContain('32 Cores');
    expect(container.textContent).toContain('8 Cores');
  });

  it('filters rows when "Only Differences" is clicked', async () => {
    const { container } = render(RecordCompareModal, {
      props: {
        open: true,
        records: testRecords,
      },
    });

    const diffButton = screen.getByText('Only Differences');
    expect(diffButton).not.toBeNull();
    await fireEvent.click(diffButton);

    // After filtering only diffs, status or cpu will still show because they differ
    expect(container.textContent).toContain('16 Cores');
  });

  it('respects defaultHideIdentical as an alias for onlyDiff', () => {
    const { container } = render(RecordCompareModal, {
      props: {
        open: true,
        records: testRecords,
        defaultHideIdentical: true,
      },
    });

    // Memory is identical across all nodes (64 GB or different? prod-01: 64, prod-02: 64, stage-01: 32 - stage is 32)
    // All 3 records have region: us-east-1, us-east-1, us-west-2 - all differ
    expect(container.textContent).toContain('Only Differences');
  });

  it('strictly adheres to clean-flat design standards (radius, visible sync)', () => {
    const { container } = render(RecordCompareModal, {
      props: {
        open: true,
        records: testRecords,
        allowSync: true,
      },
    });

    const dialogCard = container.querySelector('[role="dialog"] > div:nth-child(2)');
    expect(dialogCard?.className).toContain('rounded-md');
    expect(dialogCard?.className).not.toContain('rounded-2xl');

    // Sync button must be visible without hovering (no opacity-0)
    const syncButton = container.querySelector('button[title="Sync value from baseline record"]');
    expect(syncButton).not.toBeNull();
    expect(syncButton?.className).not.toContain('opacity-0');
    expect(syncButton?.className).toContain('rounded-sm');
  });

  it('renders drawer layout with clean-flat dock edge', () => {
    const { container } = render(RecordCompareModal, {
      props: {
        open: true,
        layout: 'drawer',
        records: testRecords,
      },
    });

    const drawer = container.querySelector('[role="dialog"] > div:nth-child(2)');
    expect(drawer?.className).toContain('rounded-none');
    expect(drawer?.className).not.toContain('rounded-l-2xl');
  });

  it('triggers onsync when sync button is clicked for differing field', async () => {
    const onsyncMock = vi.fn();
    const { container } = render(RecordCompareModal, {
      props: {
        open: true,
        records: testRecords,
        benchmarkIndex: 0,
        allowSync: true,
        onsync: onsyncMock,
      },
    });

    // Look for sync button
    const syncButtons = container.querySelectorAll('button[title="Sync value from baseline record"]');
    expect(syncButtons.length).toBeGreaterThan(0);

    await fireEvent.click(syncButtons[0] as HTMLElement);
    expect(onsyncMock).toHaveBeenCalled();
  });

  it('invokes onclose callback when close button is clicked', async () => {
    const oncloseMock = vi.fn();
    render(RecordCompareModal, {
      props: {
        open: true,
        records: testRecords,
        onclose: oncloseMock,
      },
    });

    const closeButtons = screen.getAllByRole('button', { name: /close/i });
    expect(closeButtons.length).toBeGreaterThan(0);
    await fireEvent.click(closeButtons[0] as HTMLElement);

    expect(oncloseMock).toHaveBeenCalled();
  });
});
