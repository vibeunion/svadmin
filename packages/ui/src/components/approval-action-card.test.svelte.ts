import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
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

    await waitFor(() => expect(view.getByRole('alert').textContent).toContain('Approval service unavailable'));
    expect(view.getByRole('dialog')).toBeTruthy();
    expect(view.getByRole('button', { name: 'Confirm Approval' }).hasAttribute('disabled')).toBe(false);
  });

  it('uses unique dialog control ids for multiple approval cards', async () => {
    const view = render(ApprovalActionCard, { title: 'Request A', onapprove: vi.fn() });
    const second = render(ApprovalActionCard, { title: 'Request B', onapprove: vi.fn() });

    const [firstApprove] = view.getAllByRole('button', { name: 'Approve' });
    const secondApprove = second.getAllByRole('button', { name: 'Approve' })[1];
    if (!firstApprove || !secondApprove) throw new Error('approval cards must render an Approve button');
    await fireEvent.click(firstApprove);
    await fireEvent.click(secondApprove);

    const ids = [...document.querySelectorAll('textarea')].map(input => input.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
