import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import ApprovalActionCard from './ApprovalActionCard.svelte';

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
});
