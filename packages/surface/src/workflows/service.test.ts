// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Type } from '@sinclair/typebox';
import { defineSurfaceAction } from './action-contracts.js';
import { createInteractiveSurfaceDefinitions } from './catalog.js';
import { createSurfaceWorkflowService } from './service.js';
import { SqliteSurfaceWorkflowStore } from './sqlite-store.js';
import type { SurfaceApprovalPolicy, SurfaceWorkflowStore, SurfaceRegisteredAction } from './types.js';
import type { SurfaceSpec } from '../types.js';

const alice = { tenantId: 'tenant-a', actorId: 'alice' };
const bob = { tenantId: 'tenant-a', actorId: 'bob' };
const foreign = { tenantId: 'tenant-b', actorId: 'alice' };
const paths: string[] = [];
const stores: SqliteSurfaceWorkflowStore[] = [];
afterEach(() => { for (const store of stores.splice(0)) { try { store.close(); } catch { /* closed by restart test */ } } for (const path of paths.splice(0)) rmSync(path, { recursive: true, force: true }); });

function fixture(approval: SurfaceApprovalPolicy = 'confirm') {
  const path = mkdtempSync(join(tmpdir(), 'surface-workflow-')); paths.push(path);
  const file = join(path, 'workflow.sqlite');
  const store = new SqliteSurfaceWorkflowStore(file); stores.push(store);
  let clock = 10_000;
  let revoked: string | undefined;
  const execute = vi.fn(async () => ({ recordId: 'contact-1' }));
  const schema = Type.Object({
    profile: Type.Object({ name: Type.String({ minLength: 1 }), active: Type.Boolean() }, { additionalProperties: false }),
    addresses: Type.Array(Type.Object({ city: Type.String({ minLength: 1 }) }, { additionalProperties: false }), { maxItems: 4 }),
  }, { additionalProperties: false });
  const action = defineSurfaceAction({ id: 'contacts.create', version: 'v1', label: 'Create contact', approval,
    inputSchema: schema,
    authorize: ({ context, phase, requesterId }) => context.tenantId === 'tenant-a' && context.actorId !== revoked
      && (phase === 'approve' && approval === 'four-eyes' ? context.actorId === 'bob' : context.actorId === requesterId),
    execute,
  });
  const catalog = createInteractiveSurfaceDefinitions([action], { version: 'fixture/v1', widgets: [] });
  const spec: SurfaceSpec = { schemaVersion: 'surface/v1', catalogVersion: catalog.version, surfaceId: 'contacts', title: 'Contacts',
    layout: { type: 'grid', columns: 12 }, dataSources: [], widgets: [{ id: 'create', type: 'resource-form', props: { actionId: action.id } }] };
  const args = { profile: { name: 'Synthetic User', active: true }, addresses: [{ city: 'Test City' }] };
  function service(backing: SurfaceWorkflowStore = store, registered: SurfaceRegisteredAction = action) {
    return createSurfaceWorkflowService({ store: backing, actions: [registered], now: () => clock,
      authorizeSurface: ({ context }) => context.tenantId === 'tenant-a' && context.actorId !== revoked ? { catalog, policy: { resources: {} } } : null,
      proposalLifetimeMs: 5000 });
  }
  const api = service();
  const request = { actionId: action.id, args, surfaceId: 'contacts', surfaceRevision: 1, requestKey: 'request-1' };
  async function pending() { await api.saveSurface(alice, { spec, expectedRevision: 0 }); return api.propose(alice, request); }
  async function approved() { const p = await pending(); return api.approve(approval === 'confirm' ? alice : bob, p.id, p.digest); }
  return { api, action, schema, catalog, spec, args, request, store, file, execute, service, pending, approved,
    tick: () => { clock += 6000; }, revoke: (actor: string) => { revoked = actor; } };
}

describe('durable Surface approval and execution boundary', () => {
  it('requires separate proposal, approval and execution and survives database restart', async () => {
    const f = fixture(); const p = await f.pending(); expect(f.execute).not.toHaveBeenCalled();
    const approved = await f.api.approve(alice, p.id, p.digest); expect(approved.status).toBe('approved'); expect(f.execute).not.toHaveBeenCalled();
    const done = await f.api.execute(alice, p.id, p.digest); expect(done.status).toBe('succeeded');
    expect(f.execute).toHaveBeenCalledTimes(1); expect(f.execute).toHaveBeenCalledWith(expect.objectContaining({ idempotencyKey: p.id, args: f.args }));
    f.store.close(); const reopened = new SqliteSurfaceWorkflowStore(f.file); stores.push(reopened); const api = f.service(reopened);
    expect((await api.readSurface(alice, 'contacts')).revision).toBe(1);
    expect((await api.execute(alice, p.id, p.digest)).result).toEqual({ recordId: 'contact-1' }); expect(f.execute).toHaveBeenCalledTimes(1);
    const audit = await api.audit(alice, 'contacts');
    expect(audit.map((event) => event.event)).toEqual(['surface.saved', 'action.proposed', 'action.approved', 'action.executing', 'action.succeeded']);
    expect(JSON.stringify(audit)).not.toContain('Synthetic User'); expect(JSON.stringify(audit)).not.toContain('Test City');
  });
  it('requires independent four-eyes approval and only the requester executes', async () => {
    const f = fixture('four-eyes'); const p = await f.pending();
    await expect(f.api.approve(alice, p.id, p.digest)).rejects.toMatchObject({ code: 'denied' });
    await f.api.approve(bob, p.id, p.digest);
    await expect(f.api.execute(bob, p.id, p.digest)).rejects.toMatchObject({ code: 'denied' });
    await f.api.execute(alice, p.id, p.digest); expect(f.execute).toHaveBeenCalledTimes(1);
  });
  it.each(['alice', 'bob'])('rechecks revoked %s permission after approval', async (actor) => {
    const f = fixture('four-eyes'); const p = await f.approved(); f.revoke(actor);
    await expect(f.api.execute(alice, p.id, p.digest)).rejects.toMatchObject({ code: 'denied' }); expect(f.execute).not.toHaveBeenCalled();
  });
  it('denies cross-tenant reads, writes, proposal lookup and audit', async () => {
    const f = fixture(); const p = await f.pending();
    await expect(f.api.readSurface(foreign, 'contacts')).rejects.toMatchObject({ code: 'denied' });
    await expect(f.api.propose(foreign, f.request)).rejects.toMatchObject({ code: 'denied' });
    await expect(f.api.inspect(foreign, p.id)).rejects.toMatchObject({ code: 'not_found' });
    await expect(f.api.audit(foreign, 'contacts')).rejects.toMatchObject({ code: 'denied' });
    expect(f.store.getRevision('tenant-b', 'contacts')).toBeUndefined(); expect(f.execute).not.toHaveBeenCalled();
  });
  it('deduplicates retries but rejects reused keys with different arguments', async () => {
    const f = fixture(); const p = await f.pending();
    expect((await f.api.propose(alice, f.request)).id).toBe(p.id);
    await expect(f.api.propose(alice, { ...f.request, args: { ...f.args, profile: { name: 'Changed', active: true } } })).rejects.toMatchObject({ code: 'conflict' });
    expect((await f.api.audit(alice, 'contacts')).filter((e) => e.event === 'action.proposed')).toHaveLength(1);
  });
  it('checks digest, expiry and optimistic surface revision', async () => {
    const f = fixture(); const p = await f.pending();
    await expect(f.api.approve(alice, p.id, 'different')).rejects.toMatchObject({ code: 'conflict' });
    await expect(f.api.saveSurface(alice, { spec: f.spec, expectedRevision: 0 })).rejects.toMatchObject({ code: 'conflict' });
    await f.api.saveSurface(alice, { spec: { ...f.spec, title: 'Updated' }, expectedRevision: 1 });
    await expect(f.api.approve(alice, p.id, p.digest)).rejects.toMatchObject({ code: 'conflict' });
    const p2 = await f.api.propose(alice, { ...f.request, surfaceRevision: 2, requestKey: 'request-2' }); f.tick();
    await expect(f.api.approve(alice, p2.id, p2.digest)).rejects.toMatchObject({ code: 'expired' }); expect(f.execute).not.toHaveBeenCalled();
  });
  it('denies a pending proposal when the action contract version changes', async () => {
    const f = fixture(); const p = await f.pending();
    const next = f.service(f.store, defineSurfaceAction({ ...f.action, version: 'v2' }));
    await expect(next.approve(alice, p.id, p.digest)).rejects.toMatchObject({ code: 'conflict' });
  });
  it('claims execution atomically across two database connections', async () => {
    const f = fixture(); const p = await f.approved();
    let release!: () => void; let started!: () => void;
    const entered = new Promise<void>((resolve) => { started = resolve; });
    f.execute.mockImplementationOnce(async () => { started(); await new Promise<void>((resolve) => { release = resolve; }); return { recordId: 'contact-1' }; });
    const second = new SqliteSurfaceWorkflowStore(f.file); stores.push(second);
    const firstRun = f.api.execute(alice, p.id, p.digest); await entered;
    await expect(f.service(second).execute(alice, p.id, p.digest)).rejects.toMatchObject({ code: 'invalid_state' });
    release(); await firstRun; expect(f.execute).toHaveBeenCalledTimes(1);
  });
  it('never retries an indeterminate business effect', async () => {
    const f = fixture(); const p = await f.approved(); f.execute.mockRejectedValueOnce(new Error('Response lost after business commit'));
    await expect(f.api.execute(alice, p.id, p.digest)).rejects.toMatchObject({ code: 'indeterminate' });
    expect((await f.api.inspect(alice, p.id)).status).toBe('indeterminate');
    await expect(f.api.execute(alice, p.id, p.digest)).rejects.toMatchObject({ code: 'invalid_state' }); expect(f.execute).toHaveBeenCalledTimes(1);
  });
  it('keeps the executing claim if recording the business result fails', async () => {
    const f = fixture(); const p = await f.approved();
    const audit = f.store.audit.bind(f.store);
    vi.spyOn(f.store, 'audit').mockImplementation((event) => { if (event.event === 'action.succeeded') throw new Error('disk full'); audit(event); });
    await expect(f.api.execute(alice, p.id, p.digest)).rejects.toMatchObject({ code: 'indeterminate' });
    expect((await f.api.inspect(alice, p.id)).status).toBe('executing');
    await expect(f.api.execute(alice, p.id, p.digest)).rejects.toMatchObject({ code: 'invalid_state' }); expect(f.execute).toHaveBeenCalledTimes(1);
  });
  it('rolls back a revision when its audit write fails', async () => {
    const f = fixture(); vi.spyOn(f.store, 'audit').mockImplementation(() => { throw new Error('audit unavailable'); });
    await expect(f.api.saveSurface(alice, { spec: f.spec, expectedRevision: 0 })).rejects.toThrow('audit unavailable');
    expect(f.store.getRevision('tenant-a', 'contacts')).toBeUndefined();
  });
  it('rejects fabricated fields, prototype properties and actions not present on the saved surface', async () => {
    const f = fixture(); await f.api.saveSurface(alice, { spec: f.spec, expectedRevision: 0 });
    for (const args of [{ ...f.args, admin: true }, JSON.parse('{"__proto__":{}}'), { profile: { name: '' }, addresses: [] }]) {
      await expect(f.api.propose(alice, { ...f.request, args })).rejects.toMatchObject({ code: 'invalid_input' });
    }
    await f.api.saveSurface(alice, { spec: { ...f.spec, widgets: [] }, expectedRevision: 1 });
    await expect(f.api.propose(alice, { ...f.request, surfaceRevision: 2 })).rejects.toMatchObject({ code: 'denied' });
    expect(f.execute).not.toHaveBeenCalled();
  });
  it('copies submitted arguments before awaiting authorization', async () => {
    const f = fixture(); await f.api.saveSurface(alice, { spec: f.spec, expectedRevision: 0 });
    const work = f.api.propose(alice, f.request); f.args.profile.name = 'Changed after submission';
    expect((await work).args.profile).toEqual({ name: 'Synthetic User', active: true });
  });
  it('cancels without executing and uses a separate reject authorization phase', async () => {
    const f = fixture(); const p = await f.pending(); await f.api.reject(alice, p.id, p.digest);
    await expect(f.api.approve(alice, p.id, p.digest)).rejects.toMatchObject({ code: 'invalid_state' }); expect(f.execute).not.toHaveBeenCalled();
  });
});
