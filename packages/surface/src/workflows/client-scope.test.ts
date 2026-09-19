import { describe, expect, it, vi } from 'vitest';
import { Type } from '@sinclair/typebox';
import { createSurfaceFormController, type SurfaceWorkflowTransport, type SurfaceWorkflowClientScope } from './client.js';
import type { SurfaceActionProposal } from './types.js';
const action = { id: 'contacts.create', version: '1', label: 'Create', approval: 'confirm' as const, inputSchema: Type.Object({}, { additionalProperties: false }) };
const proposal: SurfaceActionProposal = { id: 'p', tenantId: 't', requesterId: 'u', requestKey: 'r', surfaceId: 's', surfaceRevision: 1,
  actionId: action.id, actionVersion: '1', actionLabel: 'Create', args: {}, digest: 'digest', approval: 'confirm', status: 'pending', createdAt: 1, expiresAt: 999999 };
function fixture() {
  const transport: SurfaceWorkflowTransport = { propose: vi.fn(async () => proposal), inspect: vi.fn(async () => proposal),
    approve: vi.fn(async () => ({ ...proposal, status: 'approved' as const })), reject: vi.fn(async () => ({ ...proposal, status: 'rejected' as const })),
    execute: vi.fn(async () => ({ ...proposal, status: 'succeeded' as const })) };
  const scope: SurfaceWorkflowClientScope = { scopeKey: 'session1', surfaceId: 's', revision: 1, transport, enabled: true };
  const onState = vi.fn(), onCommitted = vi.fn();
  const controller = createSurfaceFormController({ action, getScope: () => scope, onState, onCommitted });
  return { transport, scope, onState, onCommitted, controller };
}
describe('scope ownership before workflow dispatch', () => {
  it.each(['confirm', 'execute', 'refresh', 'reject'] as const)('blocks stale %s before sending a request', async method => {
    const f = fixture(); await f.controller.submit({});
    if (method === 'execute') await f.controller.confirm();
    Object.assign(f.scope, { scopeKey: 'session2' });
    const calls = Object.values(f.transport).map(fn => vi.mocked(fn).mock.calls.length);
    await f.controller[method]();
    expect(Object.values(f.transport).map(fn => vi.mocked(fn).mock.calls.length)).toEqual(calls);
    expect(f.onState).toHaveBeenLastCalledWith({ busy: false });
  });
  it('snapshots a mutable scope object before awaiting the proposal', async () => {
    const f = fixture();
    let resolve: (p: SurfaceActionProposal) => void = () => { throw new Error('Not started'); };
    vi.mocked(f.transport.propose).mockReturnValue(new Promise(done => { resolve = done; }));
    const pending = f.controller.submit({}); Object.assign(f.scope, { revision: 2 });
    resolve(proposal); await pending;
    expect(f.onState).toHaveBeenLastCalledWith({ busy: false }); expect(f.onCommitted).not.toHaveBeenCalled();
  });
  it('uses a fresh request identity after the authority scope changes', async () => {
    const f = fixture(); vi.mocked(f.transport.propose).mockRejectedValue(new Error('lost response'));
    await f.controller.submit({}); Object.assign(f.scope, { scopeKey: 'session2' }); await f.controller.submit({});
    const [first, second] = vi.mocked(f.transport.propose).mock.calls;
    if (!first || !second) throw new Error('Expected both attempts');
    expect(first[0].requestKey).not.toBe(second[0].requestKey);
  });
  it('does not notify after disposal even if the host changes scope', async () => {
    const f = fixture(); f.controller.dispose(); Object.assign(f.scope, { revision: 2 });
    await f.controller.submit({}); await f.controller.refresh(); f.controller.reset();
    expect(f.onState).not.toHaveBeenCalled(); expect(f.transport.propose).not.toHaveBeenCalled();
  });
});
