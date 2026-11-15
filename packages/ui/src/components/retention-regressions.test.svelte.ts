import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import DataRetentionPolicyEditor from './DataRetentionPolicyEditor.svelte';
import type { RetentionPolicy } from './retention-utils.js';

const base: RetentionPolicy = { id: 'caller', name: 'CALLER', resource: 'audit',
  retentionDays: 30, action: 'hard_delete', status: 'paused', estimatedRows: 42,
  estimatedStorageMb: 21, filterCondition: 'caller = true', targetStorage: 'old',
  lastExecutedAt: 'yesterday', scheduleCron: '0 2 * * *' };
describe('retention save safety', () => {
  it('does not invent active policies for an empty input', () => {
    const view = render(DataRetentionPolicyEditor, { policies: [] });
    expect(view.container.textContent).toContain('没有找到匹配');
    expect(view.queryByRole('button', { name: '编辑' })).toBeNull();
  });
  it.each(['paused', 'draft'] as const)('preserves %s status and actual estimates', async status => {
    const onSave = vi.fn();
    const view = render(DataRetentionPolicyEditor, { policies: [{ ...base, status }], onSave });
    await fireEvent.click(view.getByRole('button', { name: '编辑' }));
    await fireEvent.input(view.getByLabelText('条件过滤器 (可选 SQL/DSL 表达式)'), { target: { value: '' } });
    await fireEvent.click(view.getByRole('button', { name: '保存规则' }));
    expect(onSave).toHaveBeenCalledOnce();
    const saved = onSave.mock.calls[0]?.[0][0] as RetentionPolicy | undefined;
    expect(saved).toMatchObject({ status, estimatedRows: 42, estimatedStorageMb: 21,
      lastExecutedAt: 'yesterday', scheduleCron: '0 2 * * *' });
    expect(saved).not.toHaveProperty('filterCondition');
    expect(saved).not.toHaveProperty('targetStorage');
    expect(base.filterCondition).toBe('caller = true');
  });
  it.each(['', '-1', '0', '1.5'])('rejects invalid retention days %s at the save boundary', async days => {
    const onSave = vi.fn();
    const view = render(DataRetentionPolicyEditor, { policies: [base], onSave });
    await fireEvent.click(view.getByRole('button', { name: '编辑' }));
    await fireEvent.input(view.getByLabelText('保留期限 (天数)'), { target: { value: days } });
    await fireEvent.click(view.getByRole('button', { name: '保存规则' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(view.getByRole('alert').textContent).toContain('正整数');
  });
  it('requires a resource and a target for archival actions', async () => {
    const onSave = vi.fn();
    const view = render(DataRetentionPolicyEditor, { policies: [base], onSave });
    await fireEvent.click(view.getByRole('button', { name: '编辑' }));
    await fireEvent.input(view.getByLabelText('目标数据资源 (Resource)'), { target: { value: '' } });
    await fireEvent.click(view.getByRole('button', { name: '保存规则' }));
    expect(view.getByRole('alert').textContent).toContain('资源不能为空');
    await fireEvent.input(view.getByLabelText('目标数据资源 (Resource)'), { target: { value: 'audit' } });
    await fireEvent.change(view.getByLabelText('到期处置动作'), { target: { value: 'archive_cold_storage' } });
    await fireEvent.input(view.getByLabelText('归档目标存储路径'), { target: { value: '' } });
    await fireEvent.click(view.getByRole('button', { name: '保存规则' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(view.getByRole('alert').textContent).toContain('目标存储');
  });
  it('creates a draft with no fabricated volume estimates', async () => {
    const onSave = vi.fn();
    const view = render(DataRetentionPolicyEditor, { policies: [], onSave });
    await fireEvent.click(view.getByRole('button', { name: '新建留存规则' }));
    await fireEvent.input(view.getByLabelText('规则名称'), { target: { value: 'new' } });
    await fireEvent.input(view.getByLabelText('目标数据资源 (Resource)'), { target: { value: 'audit' } });
    await fireEvent.input(view.getByLabelText('归档目标存储路径'), { target: { value: 's3://caller/archive' } });
    await fireEvent.click(view.getByRole('button', { name: '保存规则' }));
    expect(onSave).toHaveBeenCalledWith([expect.objectContaining({
      status: 'draft', estimatedRows: 0, estimatedStorageMb: 0, targetStorage: 's3://caller/archive',
    })]);
  });
});
