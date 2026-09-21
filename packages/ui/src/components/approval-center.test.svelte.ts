import { cleanup, fireEvent, waitFor } from '@testing-library/svelte';
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
    expect(view.getByText('Invoice.pdf')).toBeTruthy();
    expect(view.getByText('Alice · pending')).toBeTruthy();
    expect(source.list).toHaveBeenCalledWith(requestContext, {
      view: 'pending',
      page: 1,
      pageSize: 20,
      search: '',
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
});
