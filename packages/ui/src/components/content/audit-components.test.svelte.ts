import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Host from './audit-components.test-host.svelte';
import CoverageMatrix from './CoverageMatrix.svelte';
import StatusPill from './StatusPill.svelte';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Audit content contract', () => {
  it('renders named sections, actions and evidence', () => {
    const view = render(Host);
    expect(view.getByRole('region', { name: 'Stock risk' })).toBeTruthy();
    expect(view.getByRole('region', { name: 'Inventory chart' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'Open products' })).toBeTruthy();
    expect(view.getByRole('article', { name: 'Source' }).textContent).toContain('Receipt 123');
  });
  it.each(['loading', 'empty', 'error', 'forbidden'] as const)('hides data in %s state', state => {
    const view = render(Host, { dataState: state });
    expect(view.queryByText('Loaded inventory')).toBeNull();
    expect(view.queryByText('Loaded chart')).toBeNull();
    if (state === 'forbidden') expect(view.queryByRole('button', { name: 'Open products' })).toBeNull();
  });
  it.each(['partial', 'readonly'] as const)('preserves data with %s feedback', state => {
    const view = render(Host, { dataState: state });
    expect(view.getByText('Loaded inventory')).toBeTruthy();
    expect(view.getByText('Loaded chart')).toBeTruthy();
    expect(view.container.querySelector(`[role="status"][data-state="${state}"]`)).not.toBeNull();
  });
  it('retries only through the callback supplied by the affected section', async () => {
    const retry = vi.fn();
    const view = render(Host, { dataState: 'partial', retry });
    const section = view.getByRole('region', { name: 'Stock risk' });
    const button = section.querySelector('.svadmin-audit-notice button');
    expect(button).not.toBeNull();
    if (button) await fireEvent.click(button);
    expect(retry).toHaveBeenCalledTimes(1);
  });
  it('updates pill semantics without dropping localized labels', async () => {
    const view = render(StatusPill, { label: '已完成', tone: 'success' });
    expect(view.getByText('已完成').getAttribute('data-svadmin-status')).toBe('success');
    await view.rerender({ label: '待核对', tone: 'warning' });
    expect(view.getByText('待核对').getAttribute('data-svadmin-status')).toBe('warning');
  });
});

describe('Mobile filter sheet', () => {
  it('moves filters into a named dialog and retains bound input after close', async () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true, media: '(max-width: 767px)', onchange: null,
      addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => true,
    });
    const view = render(Host);
    expect(view.queryByLabelText('Status')).toBeNull();
    await fireEvent.click(view.getByRole('button', { name: 'Inventory filters' }));
    expect(view.getByRole('dialog', { name: 'Inventory filters' })).toBeTruthy();
    await fireEvent.input(view.getByLabelText('Status'), { target: { value: 'active' } });
    await fireEvent.keyDown(document, { key: 'Escape' });
    expect(view.queryByRole('dialog')).toBeNull();
    await fireEvent.click(view.getByRole('button', { name: 'Inventory filters' }));
    expect((view.getByLabelText('Status') as HTMLInputElement).value).toBe('active');
  });
});

describe('Coverage matrix', () => {
  it('keeps headers associated with keyed values after reordering and ignores extra keys', async () => {
    const rows = [{ id: 'shell', title: 'Shell', cells: { desktop: 'Full', mobile: 'Compact', ignored: 'Hidden' } }];
    const view = render(CoverageMatrix, { caption: 'Coverage', rowLabel: 'Domain', columns: [{ key: 'mobile', label: 'Mobile' }, { key: 'desktop', label: 'Desktop' }], rows });
    expect(view.getByRole('table', { name: 'Coverage' })).toBeTruthy();
    expect(view.getByRole('rowheader', { name: 'Shell' }).getAttribute('scope')).toBe('row');
    expect(view.getAllByRole('cell').map(cell => cell.textContent)).toEqual(['Compact', 'Full']);
    expect(view.queryByText('Hidden')).toBeNull();
    await view.rerender({ caption: 'Coverage', rowLabel: 'Domain', columns: [{ key: 'missing', label: 'Other' }], rows });
    expect(view.getByRole('cell').textContent).toBe('—');
    expect(view.getByRole('region', { name: 'Coverage' }).getAttribute('tabindex')).toBe('0');
  });
  it('never renders protected values in the forbidden state', () => {
    const view = render(CoverageMatrix, { caption: 'Restricted', columns: [{ key: 'name', label: 'Name' }], rows: [{ id: '1', title: 'Secret', cells: { name: 'Sensitive' } }], state: 'forbidden' });
    expect(view.queryByText('Sensitive')).toBeNull();
    expect(view.queryByRole('table')).toBeNull();
  });
  it('shows empty feedback without an empty table', () => {
    const view = render(CoverageMatrix, { caption: 'Coverage', columns: [], rows: [] });
    expect(view.queryByRole('table')).toBeNull();
    expect(view.getByRole('status')).toBeTruthy();
  });
});
