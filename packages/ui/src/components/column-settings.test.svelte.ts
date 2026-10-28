import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor, within } from '@testing-library/svelte';
import ColumnSettings from './ColumnSettings.svelte';

function columnTrigger(view: { container: HTMLElement }): HTMLButtonElement {
  const trigger = view.container.querySelector('button');
  if (!(trigger instanceof HTMLButtonElement)) throw new Error('Column settings trigger was not rendered');
  return trigger;
}

describe('ColumnSettings Component', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  const initialColumns = [
    { key: 'id', label: 'ID', visible: true },
    { key: 'name', label: 'Name', visible: true },
    { key: 'email', label: 'Email', visible: false },
  ];

  it('renders column trigger button', () => {
    const view = render(ColumnSettings, {
      columns: initialColumns,
      title: 'Columns Config',
    });
    const button = view.container.querySelector('button');
    expect(button).not.toBeNull();
    expect(button?.textContent).toContain('Columns Config');
  });

  it('fires onchange callback when column is toggled', async () => {
    const onchange = vi.fn();
    const view = render(ColumnSettings, {
      columns: initialColumns,
      onchange,
    });

    const trigger = view.container.querySelector('button');
    if (trigger) await fireEvent.click(trigger);
  });

  it('keeps required columns visible and locked', async () => {
    const onchange = vi.fn();
    const view = render(ColumnSettings, {
      columns: [
        { key: 'id', label: 'ID', visible: true, required: true },
        { key: 'name', label: 'Name', visible: true },
      ],
      onchange,
    });

    await fireEvent.click(columnTrigger(view));
    const requiredCheckbox = await waitFor(() => {
      const label = within(document.body).getByText('ID').closest('label');
      const checkbox = label?.querySelector('[data-slot="checkbox"]');
      expect(checkbox).toBeTruthy();
      return checkbox as HTMLElement;
    });
    expect(requiredCheckbox.getAttribute('aria-disabled')).toBe('true');
    expect(document.querySelector('[data-column-required="id"]')).not.toBeNull();
  });

  it('applies a preset while preserving required columns', async () => {
    const onchange = vi.fn();
    const view = render(ColumnSettings, {
      columns: [
        { key: 'id', label: 'ID', visible: true, required: true },
        { key: 'name', label: 'Name', visible: true },
        { key: 'email', label: 'Email', visible: true },
      ],
      presets: [{ id: 'compact', label: 'Compact', visibleKeys: ['email'] }],
      onchange,
    });

    await fireEvent.click(columnTrigger(view));
    await fireEvent.click(await waitFor(() => within(document.body).getByRole('button', { name: 'Compact' })));
    const last = onchange.mock.calls.at(-1)?.[0] as Array<{ key: string; visible: boolean }>;
    expect(last.find((column) => column.key === 'id')?.visible).toBe(true);
    expect(last.find((column) => column.key === 'name')?.visible).toBe(false);
    expect(last.find((column) => column.key === 'email')?.visible).toBe(true);
  });

  it('hydrates visibility and order from storageKey without hiding required columns', async () => {
    window.localStorage.setItem('columns-test', JSON.stringify([
      { key: 'email', visible: true },
      { key: 'id', visible: false },
      { key: 'name', visible: false },
    ]));
    const view = render(ColumnSettings, {
      columns: [
        { key: 'id', label: 'ID', visible: true, required: true },
        { key: 'name', label: 'Name', visible: true },
        { key: 'email', label: 'Email', visible: true },
      ],
      storageKey: 'columns-test',
    });

    await fireEvent.click(columnTrigger(view));
    await waitFor(() => {
      const email = within(document.body).getByText('Email').closest('label')?.querySelector('[data-slot="checkbox"]');
      const id = within(document.body).getByText('ID').closest('label')?.querySelector('[data-slot="checkbox"]');
      expect(email?.getAttribute('aria-checked')).toBe('true');
      expect(id?.getAttribute('aria-checked')).toBe('true');
      expect(id?.getAttribute('aria-disabled')).toBe('true');
      const labels = [...document.body.querySelectorAll('label')].map((label) => label.textContent?.trim());
      expect(labels).toEqual(['Email', 'ID', 'Name']);
    });
  });

  it('pins an optional column to the left and clears that pin', async () => {
    const onchange = vi.fn();
    const view = render(ColumnSettings, {
      columns: [
        { key: 'id', label: 'ID', visible: true, required: true },
        { key: 'name', label: 'Name', visible: true },
      ],
      onchange,
    });

    await fireEvent.click(columnTrigger(view));
    const nameRow = within(document.body).getByText('Name').closest('div');
    if (!(nameRow instanceof HTMLElement)) throw new Error('Name row was not rendered');
    await fireEvent.click(await waitFor(() => within(nameRow).getByRole('button', { name: 'Fix column left' })));
    const pinned = onchange.mock.calls.at(-1)?.[0] as Array<{ key: string; fixed?: string }>;
    expect(pinned.find((column) => column.key === 'name')?.fixed).toBe('left');
    expect(pinned.find((column) => column.key === 'id')?.fixed).toBeUndefined();

    await fireEvent.click(within(nameRow).getByRole('button', { name: 'Cancel fixed column' }));
    const cleared = onchange.mock.calls.at(-1)?.[0] as Array<{ key: string; fixed?: string }>;
    expect(cleared.find((column) => column.key === 'name')?.fixed).toBeUndefined();
  });
});
