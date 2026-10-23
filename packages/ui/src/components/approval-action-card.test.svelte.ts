import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ApprovalActionCard from './ApprovalActionCard.svelte';

afterEach(cleanup);

describe('ApprovalActionCard Component', () => {
  it('renders pending approval status by default', () => {
    const view = render(ApprovalActionCard, {
      title: 'Expense Reimbursement',
      status: 'pending',
      applicant: { name: 'Bob', department: 'Finance' },
    });
    expect(view.container.textContent).toContain('Expense Reimbursement');
    expect(view.container.textContent).toContain('Pending Approval');
    expect(view.container.textContent).toContain('Bob');
  });

  it('renders approve, reject, transfer buttons when callbacks provided', () => {
    const onapprove = vi.fn();
    const onreject = vi.fn();
    const ontransfer = vi.fn();

    const view = render(ApprovalActionCard, {
      title: 'Leave Request',
      status: 'pending',
      onapprove,
      onreject,
      ontransfer,
    });

    expect(view.container.textContent).toContain('Approve');
    expect(view.container.textContent).toContain('Reject');
    expect(view.container.textContent).toContain('Transfer');
  });

  it('keeps the action dialog open and exposes a retryable error when approval fails', async () => {
    const onapprove = vi.fn(async () => { throw new Error('Approval service unavailable'); });
    const view = render(ApprovalActionCard, { title: 'Leave Request', onapprove });

    await fireEvent.click(view.getByRole('button', { name: 'Approve' }));
    await fireEvent.click(view.getByRole('button', { name: 'Confirm Approval' }));

    await waitFor(() => expect(view.getByRole('alert').textContent).toContain('Operation failed'));
    expect(document.body.textContent).not.toContain('Approval service unavailable');
    expect(view.getByRole('dialog')).toBeTruthy();
    expect(view.getByRole('button', { name: 'Confirm Approval' }).hasAttribute('disabled')).toBe(false);
  });

  it('uses unique dialog control ids for multiple approval cards', async () => {
    const view = render(ApprovalActionCard, { title: 'Request A', onapprove: vi.fn() });
    const second = render(ApprovalActionCard, { title: 'Request B', onapprove: vi.fn() });

    const firstTrigger = within(view.container).getByRole('button', { name: 'Approve' });
    const secondTrigger = within(second.container).getByRole('button', { name: 'Approve' });
    await fireEvent.click(firstTrigger);
    await fireEvent.click(secondTrigger);

    const ids = [...document.querySelectorAll('textarea')].map(input => input.id);
    expect(ids).toHaveLength(2);
    expect(ids.every(id => id.length > 0)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
    const labels = [...document.querySelectorAll('label')];
    for (const id of ids) {
      expect(labels.some(label => label.htmlFor === id && label.textContent === 'Optional Approval Comment')).toBe(true);
    }
  });

  describe.each([
    { action: 'Approve', confirm: 'Confirm Approval', label: 'Optional Approval Comment', draft: 'Verified', key: 'onapprove' },
    { action: 'Reject', confirm: 'Confirm Rejection', label: 'Rejection Reason (Required)', draft: 'Missing attachment', key: 'onreject' },
    { action: 'Transfer', confirm: 'Transfer', label: 'Target Approver Email / Username', draft: 'reviewer@example.com', key: 'ontransfer' },
  ] as const)('$action failure recovery', ({ action, confirm, label, draft, key }) => {
    it.each(['diagnostic', 'empty', 'non-error'] as const)('sanitizes %s failures and retains the draft for retry', async failure => {
      const callback = vi.fn<(value?: string) => Promise<void>>().mockResolvedValue(undefined)
        .mockRejectedValueOnce(failure === 'non-error' ? 'PRIVATE_APPROVAL_DIAGNOSTIC' : new Error(failure === 'empty' ? '' : 'PRIVATE_APPROVAL_DIAGNOSTIC'));
      const view = render(ApprovalActionCard, { [key]: callback });
      await fireEvent.click(view.getByRole('button', { name: action, exact: true }));
      const dialog = within(view.getByRole('dialog'));
      const field = dialog.getByLabelText(label);
      if (key !== 'onapprove') {
        expect(dialog.getByRole('button', { name: confirm, exact: true })).toHaveProperty('disabled', true);
        expect(callback).not.toHaveBeenCalled();
      }
      await fireEvent.input(field, { target: { value: draft } });
      await fireEvent.click(dialog.getByRole('button', { name: confirm, exact: true }));
      await waitFor(() => expect(dialog.getByRole('alert').textContent).toBe('Operation failed'));
      expect(document.body.textContent).not.toContain('PRIVATE_APPROVAL_DIAGNOSTIC');
      expect(field).toHaveProperty('value', draft);
      expect(dialog.getByRole('button', { name: confirm, exact: true })).toHaveProperty('disabled', false);
      await fireEvent.click(dialog.getByRole('button', { name: confirm, exact: true }));
      await waitFor(() => expect(view.queryByRole('dialog')).toBeNull());
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenNthCalledWith(2, draft);
      await fireEvent.click(view.getByRole('button', { name: action, exact: true }));
      expect(view.getByLabelText(label)).toHaveProperty('value', '');
      expect(view.queryByRole('alert')).toBeNull();
    });
  });
});
