import { createHash, randomUUID } from 'node:crypto';
import { jsonValueIssue } from '../json.js';
import { validateSurfaceSpec } from '../validation.js';
import type { JsonObject, JsonValue } from '../types.js';
import { SurfaceWorkflowError } from './types.js';
import { defineSurfaceAction } from './action-contracts.js';
import type {
  SurfaceWorkflowContext, SurfaceWorkflowOptions, SurfaceActionProposal, SurfaceRegisteredAction,
  SurfaceWorkflowTransaction, SurfaceActionPhase, SurfaceStoredRevision,
} from './types.js';

const clone = <T>(value: T): T => structuredClone(value);
function frozen<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) frozen(child);
    Object.freeze(value);
  }
  return value;
}
function canonical(value: JsonValue): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  const object = value as JsonObject;
  return '{' + Object.entries(object).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0).map(([key, child]) => JSON.stringify(key) + ':' + canonical(child)).join(',') + '}';
}
function json(input: unknown): asserts input is JsonValue {
  if (jsonValueIssue(input) || JSON.stringify(input).length > 131_072) throw new SurfaceWorkflowError('invalid_input', 'Expected bounded, plain JSON');
}
function key(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/u.test(value)) throw new SurfaceWorkflowError('invalid_input', 'Invalid identifier');
}
function context(input: SurfaceWorkflowContext): SurfaceWorkflowContext {
  key(input.tenantId); key(input.actorId);
  return Object.freeze({ tenantId: input.tenantId, actorId: input.actorId });
}
function digest(value: JsonValue): string { return createHash('sha256').update(canonical(value)).digest('hex'); }
function argumentDigest(p: Pick<SurfaceActionProposal, 'tenantId' | 'requesterId' | 'surfaceId' | 'surfaceRevision' | 'actionId' | 'actionVersion' | 'args' | 'approval'>): string {
  return digest({ tenantId: p.tenantId, requesterId: p.requesterId, surfaceId: p.surfaceId,
    surfaceRevision: p.surfaceRevision, actionId: p.actionId, actionVersion: p.actionVersion, args: p.args, approval: p.approval });
}

/** Server-only orchestration; no functions from this file belong in a browser bundle. */
export function createSurfaceWorkflowService(options: SurfaceWorkflowOptions) {
  const { store } = options;
  const now = options.now ?? Date.now;
  const lifetime = options.proposalLifetimeMs ?? 900_000;
  if (!Number.isFinite(lifetime) || lifetime < 1000 || lifetime > 86_400_000) throw new Error('Invalid proposal lifetime');
  const actions = new Map<string, SurfaceRegisteredAction>();
  for (const action of options.actions) {
    if (actions.has(action.id)) throw new Error(`Duplicate Surface action: ${action.id}`);
    actions.set(action.id, defineSurfaceAction(action));
  }
  function registered(id: string): SurfaceRegisteredAction {
    const action = actions.get(id);
    if (!action) throw new SurfaceWorkflowError('denied');
    return action;
  }
  async function access(ctx: SurfaceWorkflowContext, surfaceId: string, operation: 'read' | 'save' | 'audit') {
    key(surfaceId);
    const result = await options.authorizeSurface({ context: ctx, operation, surfaceId });
    if (!result) throw new SurfaceWorkflowError('denied');
    return result;
  }
  async function authorize(ctx: SurfaceWorkflowContext, action: SurfaceRegisteredAction, phase: SurfaceActionPhase, args: JsonObject, requesterId: string) {
    if (!await action.authorize({ context: ctx, phase, args: frozen(clone(args)), requesterId })) throw new SurfaceWorkflowError('denied');
  }
  function event(tx: SurfaceWorkflowTransaction, ctx: SurfaceWorkflowContext, name: string, p: SurfaceActionProposal) {
    tx.audit({ tenantId: ctx.tenantId, surfaceId: p.surfaceId, proposalId: p.id, actorId: ctx.actorId,
      event: name, at: now(), metadata: { actionId: p.actionId, revision: p.surfaceRevision, digest: p.digest } });
  }
  function latest(tx: SurfaceWorkflowTransaction, ctx: SurfaceWorkflowContext, surfaceId: string, revision: number): SurfaceStoredRevision {
    const saved = tx.getRevision(ctx.tenantId, surfaceId);
    if (!saved || saved.revision !== revision) throw new SurfaceWorkflowError('conflict', 'Surface revision changed');
    return saved;
  }
  function proposal(tx: SurfaceWorkflowTransaction, ctx: SurfaceWorkflowContext, id: string): SurfaceActionProposal {
    key(id);
    const p = tx.getProposal(ctx.tenantId, id);
    if (!p) throw new SurfaceWorkflowError('not_found');
    return p;
  }
  function current(tx: SurfaceWorkflowTransaction, ctx: SurfaceWorkflowContext, p: SurfaceActionProposal, action: SurfaceRegisteredAction) {
    if (p.actionVersion !== action.version || p.approval !== action.approval || p.digest !== argumentDigest(p)) throw new SurfaceWorkflowError('conflict', 'Action contract changed');
    if (p.expiresAt <= now()) throw new SurfaceWorkflowError('expired');
    if (!action.validateInput(p.args)) throw new SurfaceWorkflowError('invalid_input');
    const saved = latest(tx, ctx, p.surfaceId, p.surfaceRevision);
    if (!saved.spec.widgets.some((w) => w.type === 'resource-form' && w.props['actionId'] === action.id)) throw new SurfaceWorkflowError('denied');
  }

  return {
    async saveSurface(identity: SurfaceWorkflowContext, input: { spec: unknown; expectedRevision: number }): Promise<SurfaceStoredRevision> {
      const ctx = context(identity);
      input = { spec: input.spec, expectedRevision: input.expectedRevision };
      json(input.spec);
      const spec = clone(input.spec);
      const surfaceId = (spec as JsonObject)?.['surfaceId'];
      key(surfaceId);
      if (!Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0) throw new SurfaceWorkflowError('invalid_input');
      const { catalog, policy } = await access(ctx, surfaceId, 'save');
      const checked = validateSurfaceSpec(spec, catalog, policy);
      if (!checked.ok) throw new SurfaceWorkflowError('invalid_input', 'Surface failed policy validation');
      return store.transaction((tx) => {
        const previous = tx.getRevision(ctx.tenantId, surfaceId);
        if ((previous?.revision ?? 0) !== input.expectedRevision) throw new SurfaceWorkflowError('conflict');
        const revision = { tenantId: ctx.tenantId, surfaceId, revision: input.expectedRevision + 1,
          spec: clone(checked.value), actorId: ctx.actorId, createdAt: now() };
        tx.putRevision(revision);
        tx.audit({ tenantId: ctx.tenantId, surfaceId, actorId: ctx.actorId, event: 'surface.saved', at: now(), metadata: { revision: revision.revision } });
        return clone(revision);
      });
    },
    async readSurface(identity: SurfaceWorkflowContext, surfaceId: string, revision?: number) {
      const ctx = context(identity);
      const { catalog, policy } = await access(ctx, surfaceId, 'read');
      if (revision !== undefined && (!Number.isSafeInteger(revision) || revision < 1)) throw new SurfaceWorkflowError('invalid_input');
      const saved = store.getRevision(ctx.tenantId, surfaceId, revision);
      if (!saved) throw new SurfaceWorkflowError('not_found');
      if (!validateSurfaceSpec(saved.spec, catalog, policy).ok) throw new SurfaceWorkflowError('denied');
      return clone(saved);
    },
    async propose(identity: SurfaceWorkflowContext, input: {
      actionId: string; args: unknown; surfaceId: string; surfaceRevision: number; requestKey: string;
    }): Promise<SurfaceActionProposal> {
      const ctx = context(identity);
      input = { ...input };
      key(input.requestKey); key(input.actionId);
      if (!Number.isSafeInteger(input.surfaceRevision) || input.surfaceRevision < 1) throw new SurfaceWorkflowError('invalid_input');
      json(input.args);
      const args = clone(input.args);
      const action = registered(input.actionId);
      if (!action.validateInput(args)) throw new SurfaceWorkflowError('invalid_input');
      const { catalog, policy } = await access(ctx, input.surfaceId, 'read');
      await authorize(ctx, action, 'propose', args as JsonObject, ctx.actorId);
      const candidate: SurfaceActionProposal = {
        id: randomUUID(), tenantId: ctx.tenantId, requesterId: ctx.actorId, requestKey: input.requestKey,
        surfaceId: input.surfaceId, surfaceRevision: input.surfaceRevision,
        actionId: action.id, actionVersion: action.version, actionLabel: action.label,
        args: args as JsonObject, approval: action.approval, status: 'pending',
        createdAt: now(), expiresAt: now() + lifetime, digest: '',
      };
      const next = { ...candidate, digest: argumentDigest(candidate) };
      return store.transaction((tx) => {
        const saved = latest(tx, ctx, input.surfaceId, input.surfaceRevision);
        if (!validateSurfaceSpec(saved.spec, catalog, policy).ok) throw new SurfaceWorkflowError('denied');
        current(tx, ctx, next, action);
        const existing = tx.findRequest(ctx.tenantId, ctx.actorId, input.requestKey);
        if (existing) {
          if (existing.digest !== next.digest) throw new SurfaceWorkflowError('conflict', 'Idempotency key reused with different input');
          return clone(existing);
        }
        tx.putProposal(next); event(tx, ctx, 'action.proposed', next);
        return clone(next);
      });
    },
    async inspect(identity: SurfaceWorkflowContext, id: string) {
      const ctx = context(identity);
      const p = proposal(store, ctx, id);
      await access(ctx, p.surfaceId, 'read');
      await authorize(ctx, registered(p.actionId), 'read', p.args, p.requesterId);
      return clone(p);
    },
    async approve(identity: SurfaceWorkflowContext, id: string, expectedDigest: string) {
      const ctx = context(identity);
      const before = proposal(store, ctx, id);
      const action = registered(before.actionId);
      const { catalog, policy } = await access(ctx, before.surfaceId, 'read');
      await authorize(ctx, action, 'approve', before.args, before.requesterId);
      if (action.approval === 'confirm' ? ctx.actorId !== before.requesterId : ctx.actorId === before.requesterId) throw new SurfaceWorkflowError('denied');
      return store.transaction((tx) => {
        const p = proposal(tx, ctx, id);
        current(tx, ctx, p, action);
        if (!validateSurfaceSpec(latest(tx, ctx, p.surfaceId, p.surfaceRevision).spec, catalog, policy).ok) throw new SurfaceWorkflowError('denied');
        if (expectedDigest !== p.digest) throw new SurfaceWorkflowError('conflict');
        if (p.status !== 'pending') throw new SurfaceWorkflowError('invalid_state');
        const next = { ...p, status: 'approved' as const, approvedBy: ctx.actorId };
        tx.putProposal(next); event(tx, ctx, 'action.approved', next);
        return clone(next);
      });
    },
    async reject(identity: SurfaceWorkflowContext, id: string, expectedDigest: string) {
      const ctx = context(identity);
      const before = proposal(store, ctx, id);
      await access(ctx, before.surfaceId, 'read');
      await authorize(ctx, registered(before.actionId), 'reject', before.args, before.requesterId);
      return store.transaction((tx) => {
        const p = proposal(tx, ctx, id);
        if (p.digest !== expectedDigest) throw new SurfaceWorkflowError('conflict');
        if (p.status !== 'pending' && p.status !== 'approved') throw new SurfaceWorkflowError('invalid_state');
        const next = { ...p, status: 'rejected' as const };
        tx.putProposal(next); event(tx, ctx, 'action.rejected', next);
        return clone(next);
      });
    },
    async execute(identity: SurfaceWorkflowContext, id: string, expectedDigest: string): Promise<SurfaceActionProposal> {
      const ctx = context(identity);
      const before = proposal(store, ctx, id);
      const action = registered(before.actionId);
      if (before.requesterId !== ctx.actorId) throw new SurfaceWorkflowError('denied');
      if (before.status !== 'approved' && before.status !== 'succeeded') throw new SurfaceWorkflowError('invalid_state');
      const { catalog, policy } = await access(ctx, before.surfaceId, 'read');
      await authorize(ctx, action, 'execute', before.args, before.requesterId);
      if (before.status === 'approved' && before.approvedBy) {
        await authorize(context({ ...ctx, actorId: before.approvedBy }), action, 'approve', before.args, before.requesterId);
      }
      const claimed = store.transaction((tx) => {
        const p = proposal(tx, ctx, id);
        if (p.digest !== expectedDigest) throw new SurfaceWorkflowError('conflict');
        // Repeated successful requests return the recorded result, never rerun.
        if (p.status === 'succeeded') return p;
        current(tx, ctx, p, action);
        const saved = latest(tx, ctx, p.surfaceId, p.surfaceRevision);
        if (!validateSurfaceSpec(saved.spec, catalog, policy).ok) throw new SurfaceWorkflowError('denied');
        if (p.status !== 'approved' || !p.approvedBy) throw new SurfaceWorkflowError('invalid_state');
        if (p.approval === 'confirm' ? p.approvedBy !== p.requesterId : p.approvedBy === p.requesterId) throw new SurfaceWorkflowError('denied');
        const next = { ...p, status: 'executing' as const };
        tx.putProposal(next); event(tx, ctx, 'action.executing', next);
        return next;
      });
      if (claimed.status === 'succeeded') return clone(claimed);
      let result: JsonValue;
      try {
        const value = await action.execute({ context: ctx, args: frozen(clone(claimed.args)), idempotencyKey: claimed.id });
        json(value);
        result = clone(value);
      } catch {
        try {
          store.transaction((tx) => {
            const p = proposal(tx, ctx, id);
            tx.putProposal({ ...p, status: 'indeterminate' });
            event(tx, ctx, 'action.indeterminate', p);
          });
        } catch { /* The durable executing claim still prevents a duplicate effect. */ }
        throw new SurfaceWorkflowError('indeterminate', 'Business effect may have occurred; reconciliation is required before any retry');
      }
      try {
        return store.transaction((tx) => {
          const p = proposal(tx, ctx, id);
          if (p.status !== 'executing') throw new SurfaceWorkflowError('invalid_state');
          const next = { ...p, status: 'succeeded' as const, result };
          tx.putProposal(next); event(tx, ctx, 'action.succeeded', next);
          return clone(next);
        });
      } catch {
        throw new SurfaceWorkflowError('indeterminate', 'Business effect completed but recording failed; do not retry the business effect');
      }
    },
    async audit(identity: SurfaceWorkflowContext, surfaceId: string, after = 0, limit = 50) {
      const ctx = context(identity);
      await access(ctx, surfaceId, 'audit');
      if (!Number.isSafeInteger(after) || after < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new SurfaceWorkflowError('invalid_input');
      return clone(store.listAudit(ctx.tenantId, surfaceId, after, limit));
    },
  };
}
