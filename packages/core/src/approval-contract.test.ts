import { describe, expect, test } from 'bun:test';
import { decodeApprovalRecord, decodeApprovalList, decodeApprovalTransition, decodeApprovalReceipt,
  type ApprovalRecord } from './approval-contract';

import { requireValue } from '../../../scripts/test-assertions';
const record: ApprovalRecord = {
  id: 'expense-1', version: 2, title: 'Expense', applicant: 'Alice', status: 'pending',
  allowedActions: [{ id: 'reject', label: 'Reject', commentRequired: true, targetRequired: false }],
  attachments: [{ id: 'file-1', name: 'Invoice.pdf' }],
  history: [{ id: 'event-1', action: 'submit', actor: 'Alice', at: '2026-09-20T01:00:00Z', comment: '' }],
};
const input = { id: record.id, expectedVersion: 2, action: 'reject', comment: 'Missing receipt', idempotencyKey: 'request-1' };

describe('approval contracts', () => {
  test('detaches records and preserves domain-defined status and actions', () => {
    const result = decodeApprovalRecord(record);requireValue(
    result.attachments[0]).name = 'Changed';
    expect(requireValue(record.attachments[0]).name).toBe('Invoice.pdf');
    expect(decodeApprovalTransition(input, record)).toEqual(input);
  });
  test.each([
    { version: 0 }, { id: ' ' }, { extra: true },
    { allowedActions: [...record.allowedActions, ...record.allowedActions] },
    { attachments: [{ id: 'a', name: 'File', url: 'javascript:alert(1)' }] },
    { history: [{ ...record.history[0], at: '2026-02-30T00:00:00Z' }] },
  ])('rejects malformed records %j', patch => {
    expect(() => decodeApprovalRecord({ ...record, ...patch })).toThrow();
  });
  test.each([
    { action: 'approve' }, { expectedVersion: 1 }, { comment: ' ' },
    { targetId: 'bob' }, { id: 'other' }, { idempotencyKey: '' },
  ])('rejects forbidden or stale transitions %j', patch => {
    expect(() => decodeApprovalTransition({ ...input, ...patch }, record)).toThrow();
  });
  test('requires a transfer target only when the action declares it', () => {
    const current = { ...record, allowedActions: [{ id: 'transfer', label: 'Transfer', commentRequired: false, targetRequired: true }] };
    expect(() => decodeApprovalTransition({ ...input, action: 'transfer' }, current)).toThrow();
    expect(decodeApprovalTransition({ ...input, action: 'transfer', targetId: 'bob' }, current).targetId).toBe('bob');
  });
  test('checks list totals and duplicate IDs', () => {
    expect(decodeApprovalList({ data: [record], total: 10 }).total).toBe(10);
    expect(() => decodeApprovalList({ data: [record], total: 0 })).toThrow();
    expect(() => decodeApprovalList({ data: [record, record], total: 2 })).toThrow();
  });
  test('correlates success and conflicts without inferring domain state transitions', () => {
    expect(decodeApprovalReceipt({ ok: true, record: { ...record, version: 3, status: 'review' } }, input).ok).toBe(true);
    expect(decodeApprovalReceipt({ ok: false, code: 'VERSION_CONFLICT', current: record }, input).ok).toBe(false);
    expect(() => decodeApprovalReceipt({ ok: true, record }, input)).toThrow();
    expect(() => decodeApprovalReceipt({ ok: true, record: { ...record, id: 'other', version: 3 } }, input)).toThrow();
    expect(() => decodeApprovalReceipt({ ok: true, record: { ...record, version: 3 }, secret: 'private' }, input)).toThrow();
  });
  test('never invokes getters', () => {
    let invoked = false;
    expect(() => decodeApprovalRecord({ get id() { invoked = true; return 'expense-1'; } })).toThrow();
    expect(invoked).toBe(false);
  });
});
