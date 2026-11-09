import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import OrgTreePicker, { type OrgDepartment, type OrgMember } from './OrgTreePicker.svelte';

const testDepartments: OrgDepartment[] = [
  { id: 'd1', name: '技术工程事业部' },
  { id: 'd2', name: '财务结算中心' },
];

const testMembers: OrgMember[] = [
  { id: 'u1', name: '张小凡', departmentId: 'd1', jobTitle: '资深全栈工程师', email: 'zhang@example.com' },
  { id: 'u2', name: '陆雪琪', departmentId: 'd1', jobTitle: '前端专家', email: 'lu@example.com' },
  { id: 'u3', name: '碧瑶', departmentId: 'd2', jobTitle: '高级财务主管', email: 'bi@example.com' },
];

describe('OrgTreePicker', () => {
  it('renders correctly with departments and active department members', () => {
    const { container } = render(OrgTreePicker, {
      departments: testDepartments,
      members: testMembers,
      selectedUserIds: ['u1'],
    });

    const root = container.querySelector('[data-svadmin-component="OrgTreePicker"]');
    expect(root).toBeTruthy();
    expect(screen.getByText('技术工程事业部')).toBeTruthy();
    expect(screen.getByText('财务结算中心')).toBeTruthy();
    expect(screen.getAllByText('张小凡').length).toBeGreaterThanOrEqual(1);
  });

  it('selects member and calls onchange callback', async () => {
    const onchange = vi.fn();
    render(OrgTreePicker, {
      departments: testDepartments,
      members: testMembers,
      selectedUserIds: [],
      onchange,
    });

    const memberItem = screen.getByText('张小凡');
    await fireEvent.click(memberItem);

    expect(onchange).toHaveBeenCalledTimes(1);
    expect(onchange).toHaveBeenCalledWith(
      ['u1'],
      [expect.objectContaining({ id: 'u1', name: '张小凡' })],
    );
  });

  it('switches department to view members', async () => {
    render(OrgTreePicker, {
      departments: testDepartments,
      members: testMembers,
      selectedUserIds: [],
    });

    const financeDept = screen.getByText('财务结算中心');
    await fireEvent.click(financeDept);

    expect(screen.getByText('碧瑶')).toBeTruthy();
  });
});
