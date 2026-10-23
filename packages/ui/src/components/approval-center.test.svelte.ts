import { cleanup, fireEvent, waitFor, within } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEnterpriseRequestContext, resetContext, type ApprovalProvider, type ApprovalRecord, type DataProvider } from '@svadmin/core';
import Host from './approval-center.test-host.svelte';
import { renderWithI18n as render } from '../../test/fixtures/render-with-i18n';

import { requireValue } from '../../../../scripts/test-assertions';
const record: ApprovalRecord = {
  id: 'request-1',
  version: 2,
  title: 'Expense request',
  applicant: 'Alice',
  status: 'pending',
  allowedActions: [
    { id: 'approve', label: 'Approve', commentRequired: false, targetRequired: false },
    { id: 'reject', label: 'Reject', commentRequired: true, targetRequired: false },
  ],
  attachments: [{ id: 'attachment-1', name: 'Invoice.pdf' }],
  history: [{
    id: 'event-1',
    action: 'submit',
    actor: 'Alice',
    at: '2026-09-20T01:00:00Z',
    comment: '',
  }],
};

const requestContext = createEnterpriseRequestContext({
  tenantId: 'tenant-a',
  requestId: 'request-1',
  traceId: 'trace-1',
});
const dataProvider: DataProvider = {
  getList: async () => ({ data: [], total: 0 }),
  getOne: async () => ({ data: {} }),
  create: async () => ({ data: {} }),
  update: async () => ({ data: {} }),
  deleteOne: async () => ({ data: {} }),
  getApiUrl: () => '',
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

function provider(overrides: Partial<ApprovalProvider> = {}): ApprovalProvider {
  return {
    list: vi.fn(async () => ({ data: [record], total: 1 })),
    get: vi.fn(async () => record),
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  resetContext();
});

describe('ApprovalCenter', () => {
  it('updates interface labels in Chinese while keeping provider action names', async () => {
    const source = provider({ transition: async () => ({ ok: true, record: { ...record, version: 3 } }) });
    const view = render(Host, {
      provider: dataProvider,
      settings: { provider: source, requestContext },
    });
    await view.findByRole('button', { name: 'Approve' });
    await view.wrapper.setLocale('zh-CN');
    await view.findByRole('heading', { name: '审批中心' });
    expect(view.getByRole('textbox', { name: '搜索审批' })).toBeTruthy();
    expect(view.getByRole('button', { name: '上一页' })).toBeTruthy();
    expect(view.queryByRole('button', { name: 'Next' })).toBeNull();
    await fireEvent.click(view.getByRole('button', { name: 'Reject' }));
    expect(view.getByRole('dialog', { name: 'Reject' })).toBeTruthy();
    expect(view.getByRole('textbox', { name: '意见' }).hasAttribute('required')).toBe(true);
    expect(view.getByRole('button', { name: '确定' }).hasAttribute('disabled')).toBe(true);
    await fireEvent.input(view.getByRole('textbox', { name: '意见' }), { target: { value: '请补充材料' } });
    expect(view.getByRole('button', { name: '确定' }).hasAttribute('disabled')).toBe(false);
    await fireEvent.click(view.getByRole('button', { name: '取消' }));
    expect(view.queryByRole('dialog')).toBeNull();
  });

  it('discards an old action receipt after replacing the provider', async () => {
    let finish!: (value: unknown) => void;
    const transition = vi.fn<NonNullable<ApprovalProvider['transition']>>(
      () => new Promise(resolve => { finish = resolve; }),
    );
    const source = provider({ transition });
    const view = render(Host, {
      provider: dataProvider,
      settings: { provider: source, requestContext },
    });
    await fireEvent.click(await view.findByRole('button', { name: 'Approve' }));
    await fireEvent.click(view.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(transition).toHaveBeenCalledOnce());
    const replacement = provider({
      list: vi.fn(async () => ({ data: [{ ...record, title: 'New tenant request' }], total: 1 })),
    });
    await view.rerender({ settings: { provider: replacement, requestContext } });
    await view.findByRole('heading', { name: 'New tenant request' });
    finish({ ok: true, record: { ...record, version: 3, title: 'Obsolete receipt' } });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(view.queryByText('Obsolete receipt')).toBeNull();
    expect(view.queryByRole('dialog')).toBeNull();
    expect(view.getByRole('heading', { name: 'New tenant request' })).toBeTruthy();
  });

  it('loads a list and renders the selected record details', async () => {
    const source = provider();
    const view = render(Host, {
      provider: dataProvider,
      settings: { provider: source, requestContext },
    });

    await waitFor(() => expect(view.getByRole('heading', { name: 'Expense request' })).toBeTruthy());
    expect(view.container.querySelector('[data-svadmin-approval-center]')?.getAttribute('data-svadmin-approval-state')).toBe('ready');
    expect(view.container.querySelector('[data-svadmin-approval-list]')).toBeTruthy();
    expect(view.container.querySelector('[data-svadmin-approval-detail]')).toBeTruthy();
    expect(view.getByText('Invoice.pdf')).toBeTruthy();
    expect(view.getByText('Alice · pending')).toBeTruthy();
    expect(source.list).toHaveBeenCalledWith(requestContext, {
      view: 'pending',
      page: 1,
      pageSize: 20,
      search: '',
    });
  });

  it('renders a distinct filtered-empty state for a search with no matches', async () => {
    const source = provider({
      list: vi.fn(async (_scope, options) => options.search
        ? { data: [], total: 0 }
        : { data: [record], total: 1 }),
    });
    const view = render(Host, {
      provider: dataProvider,
      settings: { provider: source, requestContext },
    });

    await view.findByRole('heading', { name: 'Expense request' });
    await fireEvent.input(view.getByRole('textbox', { name: 'Search approvals' }), { target: { value: 'missing-request' } });
    await new Promise(resolve => setTimeout(resolve, 300));

    await waitFor(() => expect(view.container.querySelector('[data-svadmin-data-state="filtered-empty"]')).toBeTruthy());
    expect(view.container.querySelector('[data-svadmin-approval-center]')?.getAttribute('data-svadmin-approval-state')).toBe('filtered-empty');
    expect(view.getByRole('button', { name: 'Clear' })).toBeTruthy();
    expect(source.list).toHaveBeenLastCalledWith(requestContext, {
      view: 'pending',
      page: 1,
      pageSize: 20,
      search: 'missing-request',
    });
  });

  it('submits only an allowed action with the current version and idempotency key', async () => {
    const transition = vi.fn<NonNullable<ApprovalProvider['transition']>>(async () => ({
      ok: true as const,
      record: { ...record, version: 3, status: 'approved' },
    }));
    const source = provider({ transition });
    const view = render(Host, {
      provider: dataProvider,
      settings: { provider: source, requestContext },
    });

    await waitFor(() => expect(view.getByRole('button', { name: 'Approve' })).toBeTruthy());
    await fireEvent.click(view.getByRole('button', { name: 'Approve' }));
    await fireEvent.click(view.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(transition).toHaveBeenCalledOnce());
    const input =requireValue( transition.mock.calls[0])[1];
    expect(input).toMatchObject({
      id: 'request-1',
      expectedVersion: 2,
      action: 'approve',
    });
    expect(input.idempotencyKey).toMatch(/^request-1:2:approve:/);
  });

  it('preserves the record when a transition returns a version conflict', async () => {
    const transition = vi.fn<NonNullable<ApprovalProvider['transition']>>(async () => ({
      ok: false as const,
      code: 'VERSION_CONFLICT' as const,
      current: { ...record, version: 3, status: 'rejected' },
    }));
    const source = provider({ transition });
    const view = render(Host, {
      provider: dataProvider,
      settings: { provider: source, requestContext },
    });

    await waitFor(() => expect(view.getByRole('button', { name: 'Approve' })).toBeTruthy());
    await fireEvent.click(view.getByRole('button', { name: 'Approve' }));
    await fireEvent.click(view.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(view.getByRole('alert').textContent).toContain('changed'));
    expect(view.getByText('Alice · pending')).toBeTruthy();
  });

  it('keeps the dialog, comment and pending record while showing a version conflict', async () => {
    const transition = vi.fn<NonNullable<ApprovalProvider['transition']>>(async () => ({
      ok: false as const,
      code: 'VERSION_CONFLICT' as const,
      current: { ...record, version: 3, status: 'approved' },
    }));
    const source = provider({ transition });
    const view = render(Host, {
      provider: dataProvider,
      settings: { provider: source, requestContext },
    });

    await waitFor(() => expect(view.getByRole('button', { name: 'Approve' })).toBeTruthy());
    await fireEvent.click(view.getByRole('button', { name: 'Approve' }));
    const dialog = view.getByRole('dialog', { name: 'Approve' });
    await fireEvent.input(within(dialog).getByRole('textbox', { name: 'Comment' }), {
      target: { value: 'Keep receipt' },
    });
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(transition).toHaveBeenCalledOnce());
    expect(requireValue(transition.mock.calls[0])[1]).toMatchObject({
      id: 'request-1',
      expectedVersion: 2,
      action: 'approve',
      comment: 'Keep receipt',
    });
    const conflictDialog = view.getByRole('dialog', { name: 'Approve' });
    expect(within(conflictDialog).getByRole('textbox', { name: 'Comment' })).toHaveProperty('value', 'Keep receipt');
    expect(within(conflictDialog).getByRole('alert').textContent).toContain('changed');
    expect(view.queryByText('approved')).toBeNull();
    expect(view.getByText('Alice · pending')).toBeTruthy();
    expect(view.getByRole('button', { name: 'Approve' })).toHaveProperty('disabled', false);
  });

  it('hides stale details while refreshing and restores the replacement record', async () => {
    const next = deferred<{ data: ApprovalRecord[]; total: number }>();
    const source = provider({
      list: vi.fn()
        .mockResolvedValueOnce({ data: [record], total: 1 })
        .mockReturnValueOnce(next.promise),
      transition: vi.fn(),
    });
    const view = render(Host, { provider: dataProvider, settings: { provider: source, requestContext } });
    await view.findByRole('heading', { name: 'Expense request' });
    const refresh = view.getByRole('button', { name: 'Refresh' });
    await fireEvent.click(view.getByRole('button', { name: 'Approve' }));
    expect(view.getByRole('dialog')).toBeTruthy();
    await fireEvent.click(refresh);
    await waitFor(() => expect(view.queryByRole('heading', { name: 'Expense request' })).toBeNull());
    expect(view.queryByRole('button', { name: 'Approve' })).toBeNull();
    expect(view.queryByRole('dialog')).toBeNull();
    expect(view.getByRole('button', { name: 'Refresh' })).toHaveProperty('disabled', true);
    await fireEvent.click(view.getByRole('button', { name: 'Refresh' }));
    expect(source.list).toHaveBeenCalledTimes(2);
    expect(source.transition).not.toHaveBeenCalled();
    next.resolve({ data: [{ ...record, title: 'Replacement request' }], total: 1 });
    await view.findByRole('heading', { name: 'Replacement request' });
  });

  it('keeps refresh disabled while a transition is pending', async () => {
    const pending = deferred<{ ok: true; record: ApprovalRecord }>();
    const transition = vi.fn(() => pending.promise);
    const source = provider({ transition });
    const view = render(Host, { provider: dataProvider, settings: { provider: source, requestContext } });
    await view.findByRole('button', { name: 'Approve' });
    await fireEvent.click(view.getByRole('button', { name: 'Approve' }));
    await fireEvent.click(view.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(transition).toHaveBeenCalledOnce());
    await fireEvent.click(view.getByRole('button', { name: 'Cancel' }));
    expect(view.getByRole('button', { name: 'Refresh' })).toHaveProperty('disabled', true);
    await fireEvent.click(view.getByRole('button', { name: 'Refresh' }));
    expect(source.list).toHaveBeenCalledTimes(1);
    pending.resolve({ ok: true, record: { ...record, version: 3, status: 'approved' } });
    await waitFor(() => expect(view.getByRole('button', { name: 'Refresh' })).toHaveProperty('disabled', false));
    expect(view.queryByRole('dialog')).toBeNull();
    expect(view.getByRole('button', { name: 'Approve' })).toHaveProperty('disabled', false);
    await fireEvent.click(view.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(source.list).toHaveBeenCalledTimes(2));
  });

  it.each(['diagnostic', 'empty', 'non-error'] as const)('keeps %s action failures in the dialog and retains the comment for retry', async failure => {
    const transition = vi.fn<NonNullable<ApprovalProvider['transition']>>()
      .mockRejectedValueOnce(failure === 'non-error' ? 'PRIVATE_APPROVAL_DIAGNOSTIC' : new Error(failure === 'empty' ? '' : 'PRIVATE_APPROVAL_DIAGNOSTIC'))
      .mockResolvedValue({ ok: true, record: { ...record, version: 3 } });
    const source = provider({ transition });
    const view = render(Host, { provider: dataProvider, settings: { provider: source, requestContext } });
    await view.findByRole('button', { name: 'Approve' });
    await fireEvent.click(view.getByRole('button', { name: 'Approve' }));
    await fireEvent.input(view.getByRole('textbox', { name: 'Comment' }), { target: { value: 'Checked invoice' } });
    await fireEvent.click(view.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(within(view.getByRole('dialog')).getByRole('alert').textContent).toContain('Unable to submit the action'));
    expect(document.body.textContent).not.toContain('PRIVATE_APPROVAL_DIAGNOSTIC');
    expect(view.getByRole('dialog')).toBeTruthy();
    expect(view.getByRole('button', { name: 'Confirm' })).toHaveProperty('disabled', false);
    expect(view.getByRole('textbox', { name: 'Comment' })).toHaveProperty('value', 'Checked invoice');
    expect(view.getAllByRole('alert')).toHaveLength(1);
    await fireEvent.click(view.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(view.queryByRole('dialog')).toBeNull());
    expect(transition).toHaveBeenCalledTimes(2);
    const firstInput = requireValue(transition.mock.calls[0])[1];
    const retryInput = requireValue(transition.mock.calls[1])[1];
    expect(retryInput).toMatchObject({ comment: 'Checked invoice', expectedVersion: 2 });
    expect(retryInput.idempotencyKey).toBe(firstInput.idempotencyKey);
    expect(view.queryByRole('alert')).toBeNull();
  });

  it('starts a new idempotency key when a failed action payload changes', async () => {
    const transition = vi.fn<NonNullable<ApprovalProvider['transition']>>()
      .mockRejectedValueOnce(new Error('temporary'))
      .mockResolvedValue({ ok: true, record: { ...record, version: 3 } });
    const source = provider({ transition });
    const view = render(Host, { provider: dataProvider, settings: { provider: source, requestContext } });
    await view.findByRole('button', { name: 'Reject' });
    await fireEvent.click(view.getByRole('button', { name: 'Reject' }));
    await fireEvent.input(view.getByRole('textbox', { name: 'Comment' }), { target: { value: 'First note' } });
    await fireEvent.click(view.getByRole('button', { name: 'Confirm' }));
    await view.findByRole('alert');
    await fireEvent.input(view.getByRole('textbox', { name: 'Comment' }), { target: { value: 'Updated note' } });
    await fireEvent.click(view.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(view.queryByRole('dialog')).toBeNull());
    const firstInput = requireValue(transition.mock.calls[0])[1];
    const changedInput = requireValue(transition.mock.calls[1])[1];
    expect(firstInput.idempotencyKey).not.toBe(changedInput.idempotencyKey);
    expect(changedInput.comment).toBe('Updated note');
  });

  it('reuses the key after an invalid receipt and reopening the same action', async () => {
    const transition = vi.fn<NonNullable<ApprovalProvider['transition']>>()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValue({ ok: true, record: { ...record, version: 3 } });
    const view = render(Host, { provider: dataProvider, settings: { provider: provider({ transition }), requestContext } });
    await fireEvent.click(await view.findByRole('button', { name: 'Approve' }));
    await fireEvent.click(view.getByRole('button', { name: 'Confirm' }));
    await view.findByRole('alert');
    await fireEvent.click(view.getByRole('button', { name: 'Cancel' }));
    await fireEvent.click(view.getByRole('button', { name: 'Approve' }));
    await fireEvent.click(view.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(view.queryByRole('dialog')).toBeNull());
    expect(requireValue(transition.mock.calls[1])[1]).toEqual(requireValue(transition.mock.calls[0])[1]);
  });

  it('reuses a normalized target but starts a new key when that target changes', async () => {
    const targetRecord: ApprovalRecord = {
      ...record,
      allowedActions: [{ id: 'transfer', label: 'Transfer', commentRequired: false, targetRequired: true }],
    };
    const transition = vi.fn<NonNullable<ApprovalProvider['transition']>>().mockRejectedValue(new Error('temporary'));
    const source = provider({ transition, list: vi.fn(async () => ({ data: [targetRecord], total: 1 })) });
    const view = render(Host, { provider: dataProvider, settings: { provider: source, requestContext } });
    await fireEvent.click(await view.findByRole('button', { name: 'Transfer' }));
    const target = view.getByRole('textbox', { name: 'Target' });
    for (const value of [' bob ', 'bob', 'carol']) {
      await fireEvent.input(target, { target: { value } });
      await fireEvent.click(view.getByRole('button', { name: 'Confirm' }));
      await view.findByRole('alert');
    }
    expect(transition).toHaveBeenCalledTimes(3);
    const first = requireValue(transition.mock.calls[0])[1];
    const second = requireValue(transition.mock.calls[1])[1];
    const third = requireValue(transition.mock.calls[2])[1];
    expect(first.targetId).toBe('bob');
    expect(second.idempotencyKey).toBe(first.idempotencyKey);
    expect(third.targetId).toBe('carol');
    expect(third.idempotencyKey).not.toBe(second.idempotencyKey);
  });

  it.each(['refresh', 'provider', 'scope', 'success'] as const)('retires the previous key after %s', async boundary => {
    const transition = vi.fn<NonNullable<ApprovalProvider['transition']>>();
    if (boundary === 'success') {
      transition.mockResolvedValue({ ok: true, record: { ...record, version: 3 } });
    } else {
      transition.mockRejectedValue(new Error('temporary'));
    }
    const source = provider({ transition });
    const view = render(Host, { provider: dataProvider, settings: { provider: source, requestContext } });
    await fireEvent.click(await view.findByRole('button', { name: 'Approve' }));
    await fireEvent.click(view.getByRole('button', { name: 'Confirm' }));
    if (boundary === 'success') {
      await waitFor(() => expect(view.queryByRole('dialog')).toBeNull());
    } else {
      await view.findByRole('alert');
      await fireEvent.click(view.getByRole('button', { name: 'Cancel' }));
    }
    if (boundary === 'provider') {
      await view.rerender({ settings: { provider: provider({ transition }), requestContext } });
    } else if (boundary === 'scope') {
      await view.rerender({ settings: {
        provider: source, requestContext: createEnterpriseRequestContext({ tenantId: 'tenant-b' }),
      } });
    } else if (boundary === 'refresh') {
      await fireEvent.click(view.getByRole('button', { name: 'Refresh' }));
    }
    await fireEvent.click(await view.findByRole('button', { name: 'Approve' }));
    await fireEvent.click(view.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(transition).toHaveBeenCalledTimes(2));
    expect(requireValue(transition.mock.calls[1])[1].idempotencyKey)
      .not.toBe(requireValue(transition.mock.calls[0])[1].idempotencyKey);
    if (boundary === 'scope') {
      expect(requireValue(transition.mock.calls[1])[0].tenantId).toBe('tenant-b');
    }
  });

  it('does not let a late old-scope receipt affect the new scope retry key', async () => {
    const oldReceipt = deferred<unknown>();
    const oldTransition = vi.fn<NonNullable<ApprovalProvider['transition']>>(() => oldReceipt.promise);
    const newTransition = vi.fn<NonNullable<ApprovalProvider['transition']>>()
      .mockRejectedValueOnce(new Error('temporary'))
      .mockResolvedValue({ ok: true, record: { ...record, version: 3 } });
    const oldSource = provider({ transition: oldTransition });
    const view = render(Host, { provider: dataProvider, settings: { provider: oldSource, requestContext } });
    await fireEvent.click(await view.findByRole('button', { name: 'Approve' }));
    await fireEvent.click(view.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(oldTransition).toHaveBeenCalledOnce());
    const oldInput = requireValue(oldTransition.mock.calls[0])[1];

    const newContext = createEnterpriseRequestContext({ tenantId: 'tenant-b' });
    await view.rerender({
      settings: { provider: provider({ transition: newTransition }), requestContext: newContext },
    });
    await view.findByRole('heading', { name: 'Expense request' });
    await fireEvent.click(view.getByRole('button', { name: 'Approve' }));
    await fireEvent.click(view.getByRole('button', { name: 'Confirm' }));
    await view.findByRole('alert');
    oldReceipt.resolve({ ok: true, record: { ...record, version: 3, title: 'Old scope receipt' } });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(view.queryByText('Old scope receipt')).toBeNull();
    await fireEvent.click(view.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(newTransition).toHaveBeenCalledTimes(2));
    const newInput = requireValue(newTransition.mock.calls[0])[1];
    const newRetry = requireValue(newTransition.mock.calls[1])[1];
    expect(newInput.idempotencyKey).not.toBe(oldInput.idempotencyKey);
    expect(newRetry.idempotencyKey).toBe(newInput.idempotencyKey);

  });
});
