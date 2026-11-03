import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import ProDescriptions from './ProDescriptions.svelte';

describe('ProDescriptions', () => {
  const items = [
    { key: 'username', label: '用户名', value: 'ByteDancer' },
    { key: 'role', label: '角色', value: '管理员', type: 'tag' as const, tone: 'primary' as const },
    { key: 'status', label: '状态', value: '运行中', type: 'badge' as const, tone: 'success' as const },
    { key: 'bio', label: '个性签名', value: '全栈架构师', editable: true },
  ];

  it('renders descriptions with title, labels, and formatted values', () => {
    render(ProDescriptions, {
      title: '账户详情',
      items,
    });

    expect(screen.getByText('账户详情')).toBeTruthy();
    expect(screen.getByText('用户名')).toBeTruthy();
    expect(screen.getByText('ByteDancer')).toBeTruthy();
    expect(screen.getByText('角色')).toBeTruthy();
    expect(screen.getByText('管理员')).toBeTruthy();
    expect(screen.getByText('运行中')).toBeTruthy();
  });

  it('supports inline editing mode and triggers onedit callback', async () => {
    const onedit = vi.fn();
    render(ProDescriptions, {
      items,
      onedit,
    });

    const editBtn = screen.getByRole('button', { name: '编辑 个性签名' });
    await fireEvent.click(editBtn);

    const input = screen.getByDisplayValue('全栈架构师');
    await fireEvent.input(input, { target: { value: '前端专家' } });

    const saveBtn = screen.getByRole('button', { name: '保存' });
    await fireEvent.click(saveBtn);

    expect(onedit).toHaveBeenCalledWith('bio', '前端专家');
  });
});
