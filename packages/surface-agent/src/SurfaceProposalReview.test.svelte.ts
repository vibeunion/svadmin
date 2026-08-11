import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { describe, expect, test, vi } from 'vitest';
import SurfaceProposalReview from './components/SurfaceProposalReview.svelte';
import type { SurfaceProposalReview as ProposalReview } from './types.js';

const review: ProposalReview = {
  proposalVersion: 'surface-proposal/v1',
  proposalId: 'proposal-1',
  scopeId: 'tenant-a',
  surfaceId: 'inventory',
  baseRevision: 1,
  catalogVersion: 'tests/v1',
  summary: 'Improve the dashboard title',
  operations: [{ op: 'replace', path: '/title', value: 'AI proposal' }],
  digest: 'sha256:test-digest',
  status: 'pending',
  createdAt: '2026-08-11T14:00:00.000Z',
  expiresAt: '2026-08-11T14:15:00.000Z',
  changedPaths: ['/title'],
  before: {
    schemaVersion: 'surface/v1',
    catalogVersion: 'tests/v1',
    surfaceId: 'inventory',
    title: 'Inventory',
    layout: { type: 'grid', columns: 12 },
    dataSources: [],
    widgets: [],
  },
  after: {
    schemaVersion: 'surface/v1',
    catalogVersion: 'tests/v1',
    surfaceId: 'inventory',
    title: 'AI proposal',
    layout: { type: 'grid', columns: 12 },
    dataSources: [],
    widgets: [],
  },
};

describe('SurfaceProposalReview', () => {
  test('renders a semantic, escaped and visible proposal diff', () => {
    render(SurfaceProposalReview, { review });

    expect(screen.getByRole('heading', { name: 'Surface change proposal' })).not.toBeNull();
    expect(screen.getByText('Improve the dashboard title')).not.toBeNull();
    expect(screen.getByText('/title')).not.toBeNull();
    expect(screen.getByRole('region', { name: 'Before SurfaceSpec JSON' }).textContent).toContain('Inventory');
    expect(screen.getByRole('region', { name: 'After SurfaceSpec JSON' }).textContent).toContain('AI proposal');
    expect(screen.getByRole('button', { name: 'Approve proposal' })).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Reject proposal' })).not.toBeNull();
  });

  test('runs only the chosen host approval callback and disables decisions while pending', async () => {
    let resolveApproval!: () => void;
    const approval = new Promise<void>((resolve) => {
      resolveApproval = resolve;
    });
    const onApprove = vi.fn(async () => approval);
    const onReject = vi.fn();
    render(SurfaceProposalReview, { review, onApprove, onReject });

    await fireEvent.click(screen.getByRole('button', { name: 'Approve proposal' }));
    expect(onApprove).toHaveBeenCalledWith(review);
    expect(onReject).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Approve proposal' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'Reject proposal' }).hasAttribute('disabled')).toBe(true);

    resolveApproval();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Approve proposal' }).hasAttribute('disabled')).toBe(false);
    });
  });

  test('does not expose decision buttons for completed proposals', () => {
    render(SurfaceProposalReview, { review: { ...review, status: 'applied', appliedRevision: 2 } });

    expect(screen.queryByRole('button', { name: 'Approve proposal' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reject proposal' })).toBeNull();
    expect(screen.getByText('applied')).not.toBeNull();
  });
});
