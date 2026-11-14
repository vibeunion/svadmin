import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import StepUpAuthModal from './StepUpAuthModal.svelte';

describe('StepUpAuthModal', () => {
  it('renders modal dialog when open is true', () => {
    render(StepUpAuthModal, {
      props: {
        open: true,
        title: '高敏特权二次认证',
        operationName: '删除主集群数据节点',
        riskLevel: 'critical',
      },
    });

    expect(screen.getByText('高敏特权二次认证')).toBeInTheDocument();
    expect(screen.getByText('删除主集群数据节点')).toBeInTheDocument();
    expect(screen.getByText('严重高危')).toBeInTheDocument();
    expect(screen.getByText('动态口令 TOTP')).toBeInTheDocument();
  });

  it('switches verification method tabs', async () => {
    render(StepUpAuthModal, {
      props: {
        open: true,
        methods: ['totp', 'sms', 'supervisor'],
        phoneMask: '139****1234',
      },
    });

    const smsTab = screen.getByText('短信验证码');
    await fireEvent.click(smsTab);

    expect(screen.getByText(/139\*\*\*\*1234/)).toBeInTheDocument();
    expect(screen.getByText('获取验证码')).toBeInTheDocument();

    const supervisorTab = screen.getByText('主管授权码');
    await fireEvent.click(supervisorTab);

    expect(screen.getByPlaceholderText('SUPV-AUTH-XXXXXX')).toBeInTheDocument();
  });

  it('invokes onverify with entered code and handles successful verification', async () => {
    const onverify = vi.fn().mockResolvedValue(true);

    render(StepUpAuthModal, {
      props: {
        open: true,
        methods: ['supervisor'],
        defaultMethod: 'supervisor',
        onverify,
      },
    });

    const input = screen.getByPlaceholderText('SUPV-AUTH-XXXXXX');
    await fireEvent.input(input, { target: { value: 'SUPV-889922' } });

    const submitBtn = screen.getByRole('button', { name: /验证并执行/ });
    expect(submitBtn).not.toBeDisabled();
    await fireEvent.click(submitBtn);

    expect(onverify).toHaveBeenCalledWith({
      method: 'supervisor',
      code: 'SUPV-889922',
      supervisorToken: 'SUPV-889922',
    });
  });

  it('triggers lockout when max failed attempts reached', async () => {
    const onverify = vi.fn().mockResolvedValue(false);
    const onlockout = vi.fn();

    render(StepUpAuthModal, {
      props: {
        open: true,
        methods: ['supervisor'],
        defaultMethod: 'supervisor',
        maxAttempts: 1,
        onverify,
        onlockout,
      },
    });

    const input = screen.getByPlaceholderText('SUPV-AUTH-XXXXXX');
    await fireEvent.input(input, { target: { value: 'SUPV-WRONG' } });

    const submitBtn = screen.getByRole('button', { name: /验证并执行/ });
    await fireEvent.click(submitBtn);

    expect(onlockout).toHaveBeenCalled();
    expect(screen.getByText('特权鉴权通道已锁定')).toBeInTheDocument();
  });

  it('handles cancel callback when close button is clicked', async () => {
    const oncancel = vi.fn();

    render(StepUpAuthModal, {
      props: {
        open: true,
        oncancel,
      },
    });

    const closeBtn = screen.getByRole('button', { name: '关闭' });
    await fireEvent.click(closeBtn);

    expect(oncancel).toHaveBeenCalled();
  });
});
