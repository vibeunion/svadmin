import { describe, expect, it, vi } from 'vitest';
import { Type } from '@sinclair/typebox';
import { createSurfaceFormController, type SurfaceWorkflowClientScope, type SurfaceWorkflowTransport, type SurfaceWorkflowClientState } from './client.js';
import type { SurfaceActionProposal, SurfaceActionDescriptor } from './types.js';
const action: SurfaceActionDescriptor = { id: 'contacts.create', version: '1', label: 'Create contact', inputSchema: Type.Object({}, { additionalProperties: false }), approval: 'confirm' };
const proposal: SurfaceActionProposal = { id: 'p', actionId: action.id, actionVersion: '1', actionLabel: action.label,
  tenantId: 't', requesterId: 'u', requestKey: 'r', surfaceId: 's', surfaceRevision: 1,
  args: {}, digest: 'digest', approval: 'confirm', status: 'pending', createdAt: 1, expiresAt: 999999 };
function setup() {
  const transport: SurfaceWorkflowTransport = {
    propose: vi.fn(async () => proposal), inspect: vi.fn(async () => proposal),
    approve: vi.fn(async () => ({ ...proposal, status: 'approved' as const })),
    reject: vi.fn(async () => ({ ...proposal, status: 'rejected' as const })),
    execute: vi.fn(async () => ({ ...proposal, status: 'succeeded' as const, result: {} })),
  };
  let scope: SurfaceWorkflowClientScope = { scopeKey: 't:u:1', surfaceId: 's', revision: 1, enabled: true, transport };
  let state: SurfaceWorkflowClientState = { busy: false };
  const committed = vi.fn();
  const controller = createSurfaceFormController({ action, getScope: () => scope, onState: (next) => { state = next; }, onCommitted: committed });
  return { controller, transport, committed, state: () => state, scope: (next: Partial<SurfaceWorkflowClientScope>) => { scope = { ...scope, ...next }; } };
}
describe('resource form client lifecycle', () => {
  it('does not duplicate completion notifications or misreport a refresh callback failure', async () => {
    const h = setup(); h.committed.mockImplementation(() => { throw new Error('Host refresh failed'); });
    await h.controller.submit({}); await h.controller.confirm(); await h.controller.execute();
    expect(h.state().proposal?.status).toBe('succeeded'); expect(h.state().error).toBeUndefined();
    vi.mocked(h.transport.inspect).mockResolvedValue({ ...proposal, status: 'succeeded' });
    await h.controller.refresh(); expect(h.committed).toHaveBeenCalledTimes(1);
  });
  it('clears busy state when an obsolete request rejects without a component reset', async () => {
    const h = setup(); let reject!: (reason: Error) => void;
    vi.mocked(h.transport.propose).mockReturnValue(new Promise((_, failure) => { reject = failure; }));
    const pending = h.controller.submit({}); h.scope({ scopeKey: 'new-session' }); reject(new Error('late failure'));
    await pending; expect(h.state()).toEqual({ busy: false });
  });

  it('never executes during submission or confirmation', async () => {
    const h = setup();
    await h.controller.submit({});
    expect(h.state().proposal?.status).toBe('pending');
    expect(h.transport.approve).not.toHaveBeenCalled();
    expect(h.transport.execute).not.toHaveBeenCalled();
    await h.controller.confirm();
    expect(h.transport.execute).not.toHaveBeenCalled();
    await h.controller.execute();
    expect(h.transport.execute).toHaveBeenCalledTimes(1);
    expect(h.committed).toHaveBeenCalledTimes(1);
  });
  it('disables all requests in structural preview mode', async () => {
    const h = setup(); h.scope({ enabled: false });
    await h.controller.submit({}); await h.controller.confirm(); await h.controller.execute();
    expect(h.transport.propose).not.toHaveBeenCalled();
  });
  it('discards late proposals after tenant or revision changes', async () => {
    const h = setup();
    let release!: (p: SurfaceActionProposal) => void;
    vi.mocked(h.transport.propose).mockReturnValue(new Promise((resolve) => { release = resolve; }));
    const pending = h.controller.submit({});
    h.scope({ scopeKey: 'other-tenant' }); h.controller.reset();
    release(proposal); await pending;
    expect(h.state()).toEqual({ busy: false });
    expect(h.committed).not.toHaveBeenCalled();
  });
  it('reuses request identity when an unacknowledged submission is retried', async () => {
    const h = setup();
    vi.mocked(h.transport.propose).mockRejectedValueOnce(new Error('network'));
    await h.controller.submit({}); await h.controller.submit({});
    const calls = vi.mocked(h.transport.propose).mock.calls;
    const first = calls[0]; const second = calls[1];
    if (!first || !second) throw new Error('Expected two proposal attempts');
    expect(first[0].requestKey).toBe(second[0].requestKey);
  });
  it('coalesces double submission and rejects replies for another surface', async () => {
    const h = setup();
    vi.mocked(h.transport.propose).mockResolvedValue({ ...proposal, surfaceId: 'other' });
    await Promise.all([h.controller.submit({}), h.controller.submit({})]);
    expect(h.transport.propose).toHaveBeenCalledTimes(1);
    expect(h.state().proposal).toBeUndefined();
    expect(h.state().error).toBeTruthy();
  });
});
