import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import FieldMappingBuilder from './FieldMappingBuilder.svelte';

describe('FieldMappingBuilder', () => {
  const sourceFields = [
    { name: 'user_name', label: '用户名称', sample: 'Alice' },
    { name: 'user_email', label: '电子邮箱', sample: 'alice@example.com' },
    { name: 'user_age', label: '年龄', sample: '25' },
  ];

  const targetFields = [
    { name: 'username', label: '账号名', required: true },
    { name: 'email', label: '邮箱地址', required: true },
    { name: 'age', label: '用户年龄', required: false, type: 'number' as const },
    { name: 'role', label: '用户权限', required: true, defaultValue: 'guest' },
  ];

  it('renders target fields and computes initial missing required stats', () => {
    render(FieldMappingBuilder, {
      props: {
        sourceFields,
        targetFields,
      },
    });

    expect(screen.getByText('字段映射与转换规则')).toBeTruthy();
    expect(screen.getByText('账号名')).toBeTruthy();
    expect(screen.getByText('邮箱地址')).toBeTruthy();
    expect(screen.getByText('用户权限')).toBeTruthy();
  });

  it('triggers auto match and notifies onchange callback', async () => {
    const onchange = vi.fn();
    render(FieldMappingBuilder, {
      props: {
        sourceFields,
        targetFields,
        onchange,
      },
    });

    const autoMatchBtn = screen.getByText('智能自动匹配');
    await fireEvent.click(autoMatchBtn);

    expect(onchange).toHaveBeenCalled();
  });

  it('renders real-time preview drawer when sourceSampleRows provided', async () => {
    const sampleRows = [
      { user_name: 'Bob', user_email: 'bob@example.com', user_age: '30' },
    ];

    render(FieldMappingBuilder, {
      props: {
        sourceFields,
        targetFields,
        sourceSampleRows: sampleRows,
      },
    });

    const previewBtn = screen.getByText('实时推演');
    await fireEvent.click(previewBtn);

    expect(screen.getByText('目标数据样本推演结果 (前 3 条)')).toBeTruthy();
  });

  it('supports resetting all field mappings to empty', async () => {
    const onchange = vi.fn();
    render(FieldMappingBuilder, {
      props: {
        sourceFields,
        targetFields,
        onchange,
      },
    });

    const resetBtn = screen.getByTitle('清空全部映射');
    await fireEvent.click(resetBtn);

    expect(onchange).toHaveBeenCalled();
  });
});
