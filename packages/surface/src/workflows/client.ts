import type { JsonObject } from '../types.js';
import type { SurfaceActionProposal, SurfaceActionDescriptor } from './types.js';

/** HTTP bindings are trusted host code. Authenticate and apply CSRF/origin checks
 * on every server route. Never expose service identity as a model-editable field.
 */
export interface SurfaceWorkflowTransport {
  propose(input: { actionId: string; args: JsonObject; surfaceId: string; surfaceRevision: number; requestKey: string }, signal: AbortSignal): Promise<SurfaceActionProposal>;
  inspect(id: string, signal: AbortSignal): Promise<SurfaceActionProposal>;
  approve(id: string, digest: string, signal: AbortSignal): Promise<SurfaceActionProposal>;
  reject(id: string, digest: string, signal: AbortSignal): Promise<SurfaceActionProposal>;
  execute(id: string, digest: string, signal: AbortSignal): Promise<SurfaceActionProposal>;
}
export interface SurfaceWorkflowClientScope {
  readonly scopeKey: string;
  readonly surfaceId: string;
  readonly revision: number;
  readonly enabled: boolean;
  readonly transport: SurfaceWorkflowTransport;
}
export type SurfaceWorkflowClientState = {
  readonly busy: boolean; readonly proposal?: SurfaceActionProposal; readonly error?: string;
};

/** Independent of Svelte so races and late responses can be tested directly. */
export function createSurfaceFormController(options: {
  action: SurfaceActionDescriptor;
  getScope: () => SurfaceWorkflowClientScope;
  onState: (state: SurfaceWorkflowClientState) => void;
  onCommitted?: (proposal: SurfaceActionProposal) => void;
}) {
  let state: SurfaceWorkflowClientState = { busy: false };
  let generation = 0;
  let abort = new AbortController();
  let disposed = false;
  let notified: string | undefined;
  let draft: { serialized: string; requestKey: string } | undefined;
  const action = options.action;
  function publish(next: SurfaceWorkflowClientState) { state = next; options.onState(next); }
  function same(a: SurfaceWorkflowClientScope, b: SurfaceWorkflowClientScope): boolean {
    return a.scopeKey === b.scopeKey && a.surfaceId === b.surfaceId && a.revision === b.revision && a.transport === b.transport && b.enabled;
  }
  async function run(work: (scope: SurfaceWorkflowClientScope, signal: AbortSignal) => Promise<SurfaceActionProposal>) {
    const scope = options.getScope();
    if (disposed || state.busy || !scope.enabled) return;
    const ticket = ++generation;
    publish({ ...state, busy: true, error: undefined });
    try {
      const proposal = await work(scope, abort.signal);
      if (disposed || ticket !== generation) return;
      if (!same(scope, options.getScope())) { publish({ busy: false }); return; }
      if (proposal.actionId !== action.id || proposal.actionVersion !== action.version || proposal.surfaceId !== scope.surfaceId || proposal.surfaceRevision !== scope.revision) {
        throw new Error('Proposal does not belong to the active form');
      }
      publish({ busy: false, proposal });
      if (proposal.status === 'succeeded' && proposal.id !== notified) {
        notified = proposal.id;
        try { options.onCommitted?.(proposal); } catch { /* A host refresh failure must not misreport a successful write. */ }
      }
    } catch {
      if (disposed || ticket !== generation) return;
      if (!same(scope, options.getScope())) { publish({ busy: false }); return; }
      publish({ ...state, busy: false, error: 'Operation failed. Check status before retrying.' });
    }
  }
  return {
    submit(args: JsonObject) {
      if (disposed || state.busy || state.proposal || !options.getScope().enabled) return Promise.resolve();
      const captured = structuredClone(args);
      const serialized = JSON.stringify(captured);
      if (draft?.serialized !== serialized) draft = { serialized, requestKey: crypto.randomUUID() };
      const requestKey = draft.requestKey;
      return run((scope, signal) => scope.transport.propose({ actionId: action.id, args: captured,
        surfaceId: scope.surfaceId, surfaceRevision: scope.revision, requestKey }, signal));
    },
    confirm() {
      const p = state.proposal;
      if (!p || p.status !== 'pending' || p.approval !== 'confirm') return Promise.resolve();
      return run((scope, signal) => scope.transport.approve(p.id, p.digest, signal));
    },
    execute() {
      const p = state.proposal;
      if (!p || p.status !== 'approved') return Promise.resolve();
      return run((scope, signal) => scope.transport.execute(p.id, p.digest, signal));
    },
    refresh() {
      const p = state.proposal;
      if (!p) return Promise.resolve();
      return run((scope, signal) => scope.transport.inspect(p.id, signal));
    },
    reject() {
      const p = state.proposal;
      if (!p || !['pending', 'approved'].includes(p.status)) return Promise.resolve();
      return run((scope, signal) => scope.transport.reject(p.id, p.digest, signal));
    },
    reset() {
      generation += 1;
      draft = undefined;
      abort.abort(); abort = new AbortController();
      publish({ busy: false });
    },
    dispose() { disposed = true; generation += 1; abort.abort(); },
  };
}
