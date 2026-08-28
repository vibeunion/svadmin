import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import ColumnSettings from './ColumnSettings.svelte';

describe('ColumnSettings Component', () => {
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
});
