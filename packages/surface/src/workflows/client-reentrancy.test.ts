import { describe, expect, it, vi } from 'vitest';
import { Type } from '@sinclair/typebox';
import { createSurfaceFormController, type SurfaceWorkflowClientScope, type SurfaceWorkflowClientState, type SurfaceWorkflowTransport } from './client.js';
import type { SurfaceActionDescriptor, SurfaceActionProposal } from './types.js';

const action: SurfaceActionDescriptor = {
  id: 'contacts.create', version: '1', label: 'Create contact', approval: 'confirm',
  inputSchema: Type.Object({}, { additionalProperties: false }),
};
const proposal: SurfaceActionProposal = {
  id: 'first', tenantId: 'tenant-a', requesterId: 'alice', requestKey: 'request',
  actionId: action.id, actionVersion: action.version, actionLabel: action.label,
  surfaceId: 'contacts', surfaceRevision: 1, args: {}, digest: 'digest',
  approval: 'confirm', status: 'pending', createdAt: 1, expiresAt: 999999,
};

function fixture() {
  const transport: SurfaceWorkflowTransport = {
    propose: vi.fn(async () => proposal), inspect: vi.fn(async () => proposal),
    approve: vi.fn(async () => ({ ...proposal, status: 'approved' as const })),
    reject: vi.fn(async () => ({ ...proposal, status: 'rejected' as const })),
    execute: vi.fn(async () => ({ ...proposal, status: 'succeeded' as const })),
  };
  let scope: SurfaceWorkflowClientScope = {
    scopeKey: 'tenant-a:alice', surfaceId: 'contacts', revision: 1, enabled: true, transport,
  };
  let current: SurfaceWorkflowClientState = { busy: false };
  const onState = vi.fn((next: SurfaceWorkflowClientState) => { current = next; });
  const onCommitted = vi.fn();
  const controller = createSurfaceFormController({ action, getScope: () => scope, onState, onCommitted });
  return { controller, transport, onState, onCommitted, current: () => current,
    switchTenant: () => { scope = { ...scope, scopeKey: 'tenant-b:alice' }; } };
}

describe('form controller synchronous host callbacks', () => {
  const methods = [
    ['submit', 'propose'], ['confirm', 'approve'], ['execute', 'execute'],
    ['refresh', 'inspect'], ['reject', 'reject'],
  ] as const;
  for (const [method, request] of methods) {
    it.each(['reset', 'dispose'] as const)(`${method} does not dispatch after a busy-state callback calls %s`, async (invalidate) => {
      const f = fixture();
      if (method !== 'submit') await f.controller.submit({});
      if (method === 'execute') await f.controller.confirm();
      vi.mocked(f.transport[request]).mockClear();
      f.onState.mockImplementation((next) => { if (next.busy) f.controller[invalidate](); });
      if (method === 'submit') await f.controller.submit({});
      else await f.controller[method]();
      expect(f.transport[request]).not.toHaveBeenCalled();
      expect(f.onCommitted).not.toHaveBeenCalled();
    });
  }

  it.each(['reset', 'dispose', 'tenant'] as const)('does not notify completion after the success-state callback changes %s', async (invalidate) => {
    const f = fixture();
    await f.controller.submit({});
    await f.controller.confirm();
    f.onState.mockImplementation((next) => {
      if (next.proposal?.status !== 'succeeded') return;
      if (invalidate === 'tenant') f.switchTenant();
      else f.controller[invalidate]();
    });
    await f.controller.execute();
    expect(f.transport.execute).toHaveBeenCalledTimes(1);
    expect(f.onCommitted).not.toHaveBeenCalled();
    if (invalidate === 'tenant') expect(f.onState).toHaveBeenLastCalledWith({ busy: false });
  });

  it('leaves a reentrant replacement request in control of state and completion', async () => {
    const f = fixture();
    await f.controller.submit({});
    await f.controller.confirm();
    vi.mocked(f.transport.propose).mockResolvedValue({ ...proposal, id: 'replacement' });
    let replacement: Promise<void> | undefined;
    let current: SurfaceWorkflowClientState = { busy: false };
    f.onState.mockImplementation((next) => {
      current = next;
      if (next.proposal?.status === 'succeeded') {
        f.controller.reset();
        replacement = f.controller.submit({});
      }
    });
    await f.controller.execute();
    await replacement;
    expect(replacement).toBeDefined();
    expect(current).toMatchObject({ busy: false, proposal: { id: 'replacement', status: 'pending' } });
    expect(f.onCommitted).not.toHaveBeenCalled();
  });
});
