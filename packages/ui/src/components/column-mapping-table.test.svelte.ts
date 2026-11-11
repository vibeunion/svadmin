import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import ColumnMappingTable, { type TargetFieldConfig } from './ColumnMappingTable.svelte';

describe('ColumnMappingTable Component', () => {
  const targetFields: TargetFieldConfig[] = [
    { key: 'name', label: '客户姓名', required: true },
    { key: 'phone', label: '手机号', required: true },
    { key: 'notes', label: '备注', required: false },
  ];

  const sourceColumns = ['客户姓名', '移动电话', '备注信息'];

  it('auto-infers exact or fuzzy matching column mappings', () => {
    const { container } = render(ColumnMappingTable, {
      props: {
        targetFields,
        sourceColumns,
      },
    });

    const root = container.querySelector('[data-svadmin-component="ColumnMappingTable"]');
    expect(root).toBeTruthy();
    expect(container.textContent).toContain('字段映射配置表');
    expect(container.textContent).toContain('客户姓名');
    expect(container.textContent).toContain('手机号');

    // "客户姓名" matches "客户姓名"
    const selects = container.querySelectorAll('select');
    expect(selects[0]?.value).toBe('客户姓名');
  });

  it('triggers onmappingchange when user selects a different column', async () => {
    const onChange = vi.fn();
    const { container } = render(ColumnMappingTable, {
      props: {
        targetFields,
        sourceColumns,
        onmappingchange: onChange,
      },
    });

    const selects = container.querySelectorAll('select');
    const phoneSelect = selects[1];
    if (phoneSelect) {
      await fireEvent.change(phoneSelect, { target: { value: '移动电话' } });
      expect(onChange).toHaveBeenCalled();
    }
  });
});
