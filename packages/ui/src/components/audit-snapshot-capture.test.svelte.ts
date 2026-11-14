import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import AuditSnapshotCapture from './AuditSnapshotCapture.svelte';

describe('AuditSnapshotCapture', () => {
  it('renders snapshot record and security metadata', () => {
    render(AuditSnapshotCapture, {
      props: {
        recordId: 'AUDIT-TEST-001',
        operatorName: '李四 (Li Si)',
        operatorId: 'EMP-90001',
        clientIp: '192.168.10.50',
        tenantName: '金融云专区',
        hash: 'abcd1234ef567890abcdef1234567890abcdef12',
      },
    });

    expect(screen.getByText('AUDIT-TEST-001')).toBeTruthy();
    expect(screen.getByText('李四 (Li Si)')).toBeTruthy();
    expect(screen.getByText('EMP-90001')).toBeTruthy();
    expect(screen.getByText('192.168.10.50')).toBeTruthy();
    expect(screen.getByText('金融云专区')).toBeTruthy();
    expect(screen.getByText('存证验真通过')).toBeTruthy();
  });

  it('renders field diff table accurately', () => {
    render(AuditSnapshotCapture, {
      props: {
        changes: [
          { field: 'status', label: '账户状态', before: 'active', after: 'suspended' },
          { field: 'creditLimit', label: '授信额度', before: 50000, after: 0 },
        ],
      },
    });

    expect(screen.getByText('status')).toBeTruthy();
    expect(screen.getByText('账户状态')).toBeTruthy();
    expect(screen.getByText('active')).toBeTruthy();
    expect(screen.getByText('suspended')).toBeTruthy();
  });

  it('invokes onexport when export buttons are clicked', async () => {
    const onexport = vi.fn();

    render(AuditSnapshotCapture, {
      props: {
        onexport,
      },
    });

    const pngBtn = screen.getByLabelText('导出 PNG 快照');
    await fireEvent.click(pngBtn);
    expect(onexport).toHaveBeenCalledWith('png');

    const svgBtn = screen.getByLabelText('导出 SVG 矢量图');
    await fireEvent.click(svgBtn);
    expect(onexport).toHaveBeenCalledWith('svg');
  });

  it('copies hash value on copy button click', async () => {
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);

    render(AuditSnapshotCapture, {
      props: {
        hash: 'test-hash-string-999',
      },
    });

    const copyBtn = screen.getByLabelText('复制哈希值');
    await fireEvent.click(copyBtn);

    expect(writeText).toHaveBeenCalledWith('test-hash-string-999');
    writeText.mockRestore();
  });
});
