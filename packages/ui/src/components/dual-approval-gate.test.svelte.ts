import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import DualApprovalGate from './DualApprovalGate.svelte';

describe('DualApprovalGate Component', () => {
  it('renders modal with actionTitle and required role', () => {
    const view = render(DualApprovalGate, {
      open: true,
      actionTitle: '清空核心生产审计日志',
      requiredRole: '首席合规官 / CCO',
    });

    expect(view.container.textContent).toContain('清空核心生产审计日志');
    expect(view.container.textContent).toContain('首席合规官 / CCO');
    expect(view.container.textContent).toContain('Two-Person Rule Required');
  });

  it('blocks approval when verifyReviewer rejects', async () => {
    const verifyReviewer = vi.fn().mockResolvedValue(false);
    const onApproved = vi.fn();

    const view = render(DualApprovalGate, {
      open: true,
      actionTitle: '大额资金调拨',
      verifyReviewer,
      onApproved,
    });

    const idInput = view.container.querySelector('input#reviewer-id') as HTMLInputElement;
    const secretInput = view.container.querySelector('input#reviewer-secret') as HTMLInputElement;

    await fireEvent.input(idInput, { target: { value: 'ADM-99' } });
    await fireEvent.input(secretInput, { target: { value: 'wrong-pass' } });

    const submitBtn = Array.from(view.container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('确认双人联签') || b.textContent?.includes('Dual Approve'),
    );
    expect(submitBtn).toBeTruthy();
    if (submitBtn) {
      await fireEvent.click(submitBtn);
      expect(verifyReviewer).toHaveBeenCalledWith(
        expect.objectContaining({
          reviewerId: 'ADM-99',
          secret: 'wrong-pass',
        }),
      );
      expect(onApproved).not.toHaveBeenCalled();
      expect(view.container.textContent).toContain('Reviewer authorization failed');
    }
  });

  it('completes dual approval with full audit record when credentials match', async () => {
    const verifyReviewer = vi.fn().mockResolvedValue(true);
    const onApproved = vi.fn();

    const view = render(DualApprovalGate, {
      open: true,
      actionTitle: '生成并轮换主网关签名秘钥',
      requiredRole: '安全主管',
      verifyReviewer,
      onApproved,
    });

    const idInput = view.container.querySelector('input#reviewer-id') as HTMLInputElement;
    const secretInput = view.container.querySelector('input#reviewer-secret') as HTMLInputElement;

    await fireEvent.input(idInput, { target: { value: 'SEC-007' } });
    await fireEvent.input(secretInput, { target: { value: 'otp-123456' } });

    const submitBtn = Array.from(view.container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('确认双人联签') || b.textContent?.includes('Dual Approve'),
    );
    expect(submitBtn).toBeTruthy();
    if (submitBtn) {
      await fireEvent.click(submitBtn);
      expect(onApproved).toHaveBeenCalledWith(
        expect.objectContaining({
          reviewerId: 'SEC-007',
          reviewerRole: '安全主管',
          mode: 'onsite',
          actionTitle: '生成并轮换主网关签名秘钥',
          auditHash: expect.stringMatching(/^SHA-[0-9a-f]+$/),
        }),
      );
    }
  });
});
