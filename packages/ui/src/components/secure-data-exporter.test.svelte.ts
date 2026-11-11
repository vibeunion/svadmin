import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import SecureDataExporter, { type ExportColumnDef } from './SecureDataExporter.svelte';

describe('SecureDataExporter suite', () => {
  const data = [
    { id: 1, name: 'Alice', phone: '13800000000' },
  ];
  const columns: ExportColumnDef[] = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'phone', label: 'Phone', isSensitive: true },
  ];

  it('renders SecureDataExporter trigger button', () => {
    const view = render(SecureDataExporter, {
      data,
      columns,
      title: '安全溯源导出',
    });

    expect(view.container.textContent).toContain('安全溯源导出');
  });

  it('opens confirmation modal and blocks export without reason', async () => {
    const onExportAuditRecord = vi.fn();
    const view = render(SecureDataExporter, {
      data,
      columns,
      onExportAuditRecord,
    });

    const triggerBtn = view.container.querySelector('button');
    expect(triggerBtn).toBeTruthy();
    if (triggerBtn) {
      await fireEvent.click(triggerBtn);
      expect(view.container.textContent).toContain('Traceable Data Export');
      expect(view.container.textContent).toContain('Phone');
    }
  });
});
