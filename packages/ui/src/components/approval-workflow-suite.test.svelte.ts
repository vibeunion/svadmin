import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ApprovalTimeline, { type ApprovalStep } from './ApprovalTimeline.svelte';
import WorkflowProcessCard from './WorkflowProcessCard.svelte';

describe('ApprovalTimeline', () => {
  const steps: ApprovalStep[] = [
    {
      id: 'step-1',
      title: 'Submit Application',
      approverName: 'Alice Initiator',
      approverRole: 'Department Staff',
      status: 'approved',
      time: '2026-11-10 09:00',
      comment: 'Initial submission verified.',
    },
    {
      id: 'step-2',
      title: 'Manager Review',
      approverName: 'Bob Manager',
      approverRole: 'Engineering Lead',
      status: 'running',
      time: '2026-11-10 10:30',
      comment: 'Evaluating budget impact.',
    },
    {
      id: 'step-3',
      title: 'Finance Settlement',
      approverName: 'Carol Finance',
      approverRole: 'CFO',
      status: 'pending',
    },
  ];

  it('renders steps with title, approvers, and statuses', () => {
    const { container } = render(ApprovalTimeline, {
      steps,
    });

    expect(screen.getByText('Submit Application')).toBeTruthy();
    expect(screen.getByText('Alice Initiator')).toBeTruthy();
    expect(screen.getByText('(Department Staff)')).toBeTruthy();
    expect(screen.getByText('Initial submission verified.')).toBeTruthy();

    expect(screen.getByText('Manager Review')).toBeTruthy();
    expect(screen.getByText('Bob Manager')).toBeTruthy();
    expect(screen.getByText('Evaluating budget impact.')).toBeTruthy();

    expect(screen.getByText('Finance Settlement')).toBeTruthy();
    expect(container.querySelector('[data-svadmin-component="ApprovalTimeline"]')).toBeTruthy();
  });
});

describe('WorkflowProcessCard', () => {
  it('renders process card with ticket number, status badge, and inner timeline', () => {
    render(WorkflowProcessCard, {
      title: 'Quarterly Procurement Request',
      ticketNo: 'PR-2026-8899',
      initiator: 'David Ops',
      status: 'running',
      steps: [
        {
          id: 'step-1',
          title: 'Direct Supervisor Approval',
          status: 'approved',
        },
      ],
    });

    expect(screen.getByText('Quarterly Procurement Request')).toBeTruthy();
    expect(screen.getByText('Ticket: #PR-2026-8899')).toBeTruthy();
    expect(screen.getByText('Initiator: David Ops')).toBeTruthy();
    expect(screen.getByText('In Progress')).toBeTruthy();
    expect(screen.getByText('Direct Supervisor Approval')).toBeTruthy();
  });
});
