import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import DualApprovalGate from './DualApprovalGate.svelte';

describe('DualApprovalGate Component', () => {
  it('renders the external-state approval contract', () => {
    const view = render(DualApprovalGate, {
      open: true,
      actionId: 'approval-request-42',
      actionTitle: '提交委托单审批',
      requiredRole: '审核主管',
      approvalState: 'pending',
    });

    expect(view.container.textContent).toContain('提交委托单审批');
    expect(view.container.textContent).toContain('审核主管');
    expect(view.container.textContent).toContain('The review request was submitted');
    expect(view.container.textContent).toContain('approval-request-42');
  });

  it('submits a review intent without fabricating an approval record', async () => {
    const verifyReviewer = vi.fn().mockResolvedValue(true);
    const onReviewRequest = vi.fn();
    const view = render(DualApprovalGate, {
      open: true,
      actionId: 'approval-request-7',
      actionTitle: '冻结委托单',
      requiredRole: '派单员',
      verifyReviewer,
      onReviewRequest,
    });

    const idInput = view.container.querySelector('input#reviewer-id') as HTMLInputElement;
    const secretInput = view.container.querySelector('input#reviewer-secret') as HTMLInputElement;
    await fireEvent.input(idInput, { target: { value: 'OP-07' } });
    await fireEvent.input(secretInput, { target: { value: 'otp-123456' } });

    const submitBtn = Array.from(view.container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Dual Approve'),
    );
    expect(submitBtn).toBeTruthy();
    if (submitBtn) await fireEvent.click(submitBtn);

    expect(verifyReviewer).toHaveBeenCalledTimes(1);
    expect(onReviewRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        actionId: 'approval-request-7',
        actionTitle: '冻结委托单',
        reviewerId: 'OP-07',
        secret: 'otp-123456',
        mode: 'onsite',
      }),
    );
    expect(view.container.textContent).not.toContain('模拟远程复核通过');
  });

  it('does not submit or close when no host approval service is configured', async () => {
    const verifyReviewer = vi.fn().mockResolvedValue(true);
    const view = render(DualApprovalGate, {
      open: true,
      actionId: 'approval-request-8',
      actionTitle: '删除受控记录',
      verifyReviewer,
    });

    const idInput = view.container.querySelector('input#reviewer-id') as HTMLInputElement;
    const secretInput = view.container.querySelector('input#reviewer-secret') as HTMLInputElement;
    await fireEvent.input(idInput, { target: { value: 'OP-08' } });
    await fireEvent.input(secretInput, { target: { value: 'otp-000000' } });

    const submitBtn = Array.from(view.container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Dual Approve'),
    );
    if (submitBtn) await fireEvent.click(submitBtn);

    expect(verifyReviewer).toHaveBeenCalledTimes(1);
    expect(view.container.querySelector('[data-svadmin-component="DualApprovalGate"]')).toBeTruthy();
  });

  it('requires a host supplied business request ID before submitting', async () => {
    const onReviewRequest = vi.fn();
    const view = render(DualApprovalGate, {
      open: true,
      actionTitle: '提交受控导出',
      onReviewRequest,
    });

    const idInput = view.container.querySelector('input#reviewer-id') as HTMLInputElement;
    const secretInput = view.container.querySelector('input#reviewer-secret') as HTMLInputElement;
    await fireEvent.input(idInput, { target: { value: 'OP-10' } });
    await fireEvent.input(secretInput, { target: { value: 'otp-101010' } });

    const submitBtn = Array.from(view.container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Dual Approve'),
    );
    if (submitBtn) await fireEvent.click(submitBtn);

    expect(onReviewRequest).not.toHaveBeenCalled();
    expect(view.container.textContent).toContain('A business request ID is required');
  });

  it('requests remote review instead of simulating approval', async () => {
    const onRemoteReviewRequest = vi.fn();
    const view = render(DualApprovalGate, {
      open: true,
      actionId: 'approval-request-9',
      actionTitle: '导出受控报告',
      onRemoteReviewRequest,
    });

    const remoteTab = Array.from(view.container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Remote QR Review'),
    );
    if (remoteTab) await fireEvent.click(remoteTab);

    const requestBtn = Array.from(view.container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Request Remote Review'),
    );
    expect(requestBtn).toBeTruthy();
    if (requestBtn) await fireEvent.click(requestBtn);

    expect(onRemoteReviewRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        actionId: 'approval-request-9',
        mode: 'remote',
      }),
    );
    expect(view.container.textContent).not.toContain('模拟远程复核通过');
  });
});
