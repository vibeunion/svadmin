import { describe, expect, test, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import EmployeeOffboardingAuditor, {
  type OffboardingEmployee,
  type OffboardingItem,
} from './EmployeeOffboardingAuditor.svelte';

describe('EmployeeOffboardingAuditor', () => {
  const mockEmployee: OffboardingEmployee = {
    id: 'EMP-9021',
    name: '张晓薇',
    department: '架构设计中心',
    role: '资深平台工程师',
    lastWorkingDate: '2026-12-31',
    handoverTarget: '李明 (Staff Engineer)',
  };

  const mockItems: OffboardingItem[] = [
    {
      id: 'item-1',
      category: 'hardware',
      title: 'MacBook Pro 16 & 4K 办公显示器',
      description: '归还公司配置的笔记本与拓展坞外设至 IT 资产库房',
      status: 'pending',
      assignee: 'IT 资产管理员',
      updatedAt: '2026-11-14 10:00',
    },
    {
      id: 'item-2',
      category: 'document',
      title: '核心架构系统设计文档与 RFC',
      description: '将个人维度的技术沉淀文档归档至团队公共 Wiki 空间',
      status: 'completed',
      assignee: '李明',
      updatedAt: '2026-11-14 14:30',
    },
    {
      id: 'item-3',
      category: 'finance',
      title: '第四季度因公出差备用金清退',
      description: '核销差旅发票并结算未完成借款',
      status: 'blocked',
      assignee: '财务会计审核员',
      updatedAt: '2026-11-14 16:00',
      blockedReason: '存在未冲账的 5,200 元机票代垫款项',
    },
  ];

  test('renders employee profile and progress indicator', () => {
    render(EmployeeOffboardingAuditor, {
      employee: mockEmployee,
      items: mockItems,
    });

    expect(screen.getByText('张晓薇')).toBeTruthy();
    expect(screen.getByText(/架构设计中心 · 资深平台工程师/)).toBeTruthy();
    expect(screen.getByText('2026-12-31')).toBeTruthy();
    expect(screen.getByText('李明 (Staff Engineer)')).toBeTruthy();

    // 进度: 1 完成 / 3 总数 = 33%
    expect(screen.getByText('33%')).toBeTruthy();
    expect(screen.getByText('1 项阻断')).toBeTruthy();
  });

  test('filters items by category tab', async () => {
    render(EmployeeOffboardingAuditor, {
      employee: mockEmployee,
      items: mockItems,
    });

    // 初始状态下全部事项都显示
    expect(screen.getByText('MacBook Pro 16 & 4K 办公显示器')).toBeTruthy();
    expect(screen.getByText('核心架构系统设计文档与 RFC')).toBeTruthy();

    // 点击“文档资料”标签
    const docTab = screen.getByRole('tab', { name: '文档资料' });
    await fireEvent.click(docTab);

    // 文档存在，但硬件设备条目被过滤
    expect(screen.getByText('核心架构系统设计文档与 RFC')).toBeTruthy();
    expect(screen.queryByText('MacBook Pro 16 & 4K 办公显示器')).toBeNull();
  });

  test('invokes onItemStatusChange when clicking status buttons', async () => {
    const onItemStatusChange = vi.fn();
    render(EmployeeOffboardingAuditor, {
      employee: mockEmployee,
      items: mockItems,
      onItemStatusChange,
    });

    // 点击第一项的“设为交接中”
    const inProgressButtons = screen.getAllByRole('button', { name: '设为交接中' });
    const first = inProgressButtons[0];
    if (!first) throw new Error('missing element');
    await fireEvent.click(first);

    expect(onItemStatusChange).toHaveBeenCalledWith(mockItems[0], 'in_progress');
  });

  test('opens block modal and submits blocked reason', async () => {
    const onItemStatusChange = vi.fn();
    render(EmployeeOffboardingAuditor, {
      employee: mockEmployee,
      items: mockItems,
      onItemStatusChange,
    });

    // 点击第一项的“阻断异常”
    const blockButtons = screen.getAllByRole('button', { name: '阻断异常' });
    const first = blockButtons[0];
    if (!first) throw new Error('missing element');
    await fireEvent.click(first);

    // 检查弹层
    expect(screen.getByText('标记交接事项阻断与异常')).toBeTruthy();
    const textarea = screen.getByPlaceholderText('请输入详细阻断原因...');
    await fireEvent.input(textarea, { target: { value: '设备屏幕存在划痕需要定损' } });

    const confirmButton = screen.getByRole('button', { name: '确认阻断' });
    await fireEvent.click(confirmButton);

    expect(onItemStatusChange).toHaveBeenCalledWith(
      mockItems[0],
      'blocked',
      '设备屏幕存在划痕需要定损',
    );
  });

  test('triggers department signoff and export audit report', async () => {
    const onSignoff = vi.fn();
    const onExportAuditReport = vi.fn();

    render(EmployeeOffboardingAuditor, {
      employee: mockEmployee,
      items: mockItems,
      signoffStatus: {
        hrApproved: false,
        managerApproved: true,
        itApproved: false,
        financeApproved: false,
      },
      onSignoff,
      onExportAuditReport,
    });

    // 部门主管已确认，IT 待签署
    const signButtons = screen.getAllByRole('button', { name: '点击盖章签署' });
    const first = signButtons[0];
    if (!first) throw new Error('missing element');
    await fireEvent.click(first); // 第一个是 IT 或直属根据已确认项过滤

    expect(onSignoff).toHaveBeenCalled();

    // 点击导出
    const exportBtn = screen.getByRole('button', { name: '导出离职审计报告' });
    await fireEvent.click(exportBtn);
    expect(onExportAuditReport).toHaveBeenCalled();
  });
});
