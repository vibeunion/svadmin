import { describe, expect, test, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import AccessRevocationMatrix, {
  type TargetSystemAccess,
} from './AccessRevocationMatrix.svelte';

describe('AccessRevocationMatrix', () => {
  const mockSystems: TargetSystemAccess[] = [
    {
      id: 'sys-aws',
      systemName: 'AWS Global Production Infrastructure',
      systemType: 'cloud',
      accountIdentifier: 'iam/admin-zhangxw',
      privilegeLevel: 'superadmin',
      status: 'active',
      lastAccessedAt: '2026-11-14 09:12',
    },
    {
      id: 'sys-gitlab',
      systemName: 'GitLab Enterprise Core Repos',
      systemType: 'code',
      accountIdentifier: 'zhangxiaowei@corp.com',
      privilegeLevel: 'admin',
      status: 'revoked',
      revokedAt: '2026-11-14 11:30',
    },
    {
      id: 'sys-vpn',
      systemName: 'Corporate Zero-Trust VPN Gateway',
      systemType: 'vpn',
      accountIdentifier: 'cert:ztna-9021',
      privilegeLevel: 'write',
      status: 'failed',
      failureReason: 'SSO 认证中心节点网络超时',
    },
  ];

  test('renders header metrics and system access table', () => {
    render(AccessRevocationMatrix, {
      employeeId: 'EMP-9021',
      employeeName: '张晓薇',
      systems: mockSystems,
    });

    expect(screen.getByText('企业级特权访问权限回收矩阵')).toBeTruthy();
    expect(screen.getByText('张晓薇')).toBeTruthy();
    expect(screen.getByText('EMP-9021')).toBeTruthy();

    // 统计: 总受管系统 3, 超管权限 1, 完成率 33%, 失败 1
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getAllByText('1').length).toBe(2);
    expect(screen.getByText('33%')).toBeTruthy();

    // 表格内系统
    expect(screen.getByText('AWS Global Production Infrastructure')).toBeTruthy();
    expect(screen.getByText('超级管理员 (Root)')).toBeTruthy();
    expect(screen.getByText('GitLab Enterprise Core Repos')).toBeTruthy();
    expect(screen.getByText('已回收注销')).toBeTruthy();
    expect(screen.getByText(/SSO 认证中心节点网络超时/)).toBeTruthy();
  });

  test('triggers onRevokeSingle for active system', async () => {
    const onRevokeSingle = vi.fn();
    render(AccessRevocationMatrix, {
      employeeId: 'EMP-9021',
      employeeName: '张晓薇',
      systems: mockSystems,
      onRevokeSingle,
    });

    const revokeButtons = screen.getAllByRole('button', { name: '注销回收' });
    await fireEvent.click(revokeButtons[0]);

    expect(onRevokeSingle).toHaveBeenCalledWith('sys-aws');
  });

  test('triggers onRetryFailed for failed system', async () => {
    const onRetryFailed = vi.fn();
    render(AccessRevocationMatrix, {
      employeeId: 'EMP-9021',
      employeeName: '张晓薇',
      systems: mockSystems,
      onRetryFailed,
    });

    const retryBtn = screen.getByRole('button', { name: '重试回收' });
    await fireEvent.click(retryBtn);

    expect(onRetryFailed).toHaveBeenCalledWith('sys-vpn');
  });

  test('selects all unrevoked systems and executes batch revoke confirmation', async () => {
    const onRevokeBatch = vi.fn();
    render(AccessRevocationMatrix, {
      employeeId: 'EMP-9021',
      employeeName: '张晓薇',
      systems: mockSystems,
      onRevokeBatch,
    });

    // 点击全选
    const selectAllBtn = screen.getByRole('button', { name: /全选待回收系统/ });
    await fireEvent.click(selectAllBtn);

    // 批量注销按钮应该可用，包含 2 项 (sys-aws 和 sys-vpn，sys-gitlab 已回收)
    const batchBtn = screen.getByRole('button', { name: /一键批量注销 \(2\)/ });
    await fireEvent.click(batchBtn);

    // 确认弹窗
    expect(screen.getByText('确认批量注销回收特权账号？')).toBeTruthy();
    const confirmBtn = screen.getByRole('button', { name: '确认执行注销' });
    await fireEvent.click(confirmBtn);

    expect(onRevokeBatch).toHaveBeenCalledWith(['sys-aws', 'sys-vpn']);
  });

  test('triggers audit log export', async () => {
    const onAuditLogExport = vi.fn();
    render(AccessRevocationMatrix, {
      employeeId: 'EMP-9021',
      employeeName: '张晓薇',
      systems: mockSystems,
      onAuditLogExport,
    });

    const exportBtn = screen.getByRole('button', { name: '导出权限清退留痕审计书' });
    await fireEvent.click(exportBtn);

    expect(onAuditLogExport).toHaveBeenCalled();
  });
});
