import { describe, expect, test, vi } from 'vitest';
import { z } from 'zod';
import type { AgentProvider, ChatMessage } from '@svadmin/core';
import {
  createMemorySurfaceStore,
  listSurfaceDocumentHistory,
  saveSurfaceDraft,
  type SurfaceDocumentDependencies,
} from '@svadmin/surface';
import {
  SURFACE_AGENT_COMPONENT,
  createSurfaceAgentWorkflow,
  requestSurfaceProposalFromAgent,
} from './index.js';
import type { SurfaceCatalog, SurfacePolicy, SurfaceSpec } from '@svadmin/surface';

const catalog = {
  version: 'tests/v1',
  widgets: [{
    type: 'metric',
    dataKind: 'scalar',
    propsSchema: z.object({ label: z.string() }).strict(),
  }],
} satisfies SurfaceCatalog;

const mutableResourcePolicy = {
  readFields: ['id', 'name', 'stock'],
  filterFields: ['stock'],
  maxPageSize: 20,
};
const policy = {
  resources: { products: mutableResourcePolicy },
} satisfies SurfacePolicy;

const spec: SurfaceSpec = {
  schemaVersion: 'surface/v1',
  catalogVersion: catalog.version,
  surfaceId: 'inventory',
  title: 'Inventory',
  layout: { type: 'grid', columns: 12 },
  dataSources: [{ id: 'products', type: 'resource-list', resource: 'products' }],
  widgets: [{
    id: 'product-count',
    type: 'metric',
    props: { label: 'Products' },
    binding: { sourceId: 'products', pointer: '/total' },
  }],
};

function dependencies() {
  const actions: string[] = [];
  const runtime: SurfaceDocumentDependencies = {
    store: createMemorySurfaceStore(),
    catalog,
    policy,
    authorize: async (request) => {
      actions.push(request.action);
      return { can: true };
    },
    now: () => new Date('2026-08-11T14:00:00.000Z'),
  };
  return { runtime, actions };
}

async function createDraft(runtime: SurfaceDocumentDependencies): Promise<void> {
  const saved = await saveSurfaceDraft({
    dependencies: runtime,
    scopeId: 'tenant-a',
    spec,
    expectedRevision: 0,
    actorId: 'author',
    operationId: 'save-1',
  });
  expect(saved.ok).toBe(true);
}

function proposal(operations: unknown = [{ op: 'replace', path: '/title', value: 'AI proposal' }]) {
  return {
    proposalVersion: 'surface-proposal/v1',
    surfaceId: 'inventory',
    baseRevision: 1,
    summary: 'Improve the dashboard title',
    operations,
  };
}

function workflow(runtime: SurfaceDocumentDependencies, now = () => Date.parse('2026-08-11T14:00:00.000Z')) {
  return createSurfaceAgentWorkflow({
    dependencies: runtime,
    scopeId: 'tenant-a',
    surfaceId: 'inventory',
    proposalId: () => 'proposal-1',
    digest: async () => 'sha256:test-digest',
    now,
    proposalTtlMs: 60_000,
  });
}

describe('Surface Agent workflow', () => {
  test('creates a host-bound preview without writing a revision', async () => {
    const { runtime, actions } = dependencies();
    await createDraft(runtime);
    actions.length = 0;
    const controller = workflow(runtime);
    const requested = await controller.request(proposal());

    expect(requested).toEqual({
      ok: true,
      review: expect.objectContaining({
        proposalId: 'proposal-1',
        scopeId: 'tenant-a',
        surfaceId: 'inventory',
        baseRevision: 1,
        catalogVersion: 'tests/v1',
        digest: 'sha256:test-digest',
        status: 'pending',
        changedPaths: ['/title'],
        before: expect.objectContaining({ title: 'Inventory' }),
        after: expect.objectContaining({ title: 'AI proposal' }),
      }),
    });
    const history = await listSurfaceDocumentHistory({
      dependencies: runtime,
      scopeId: 'tenant-a',
      surfaceId: 'inventory',
    });
    expect(history.ok && history.documents).toHaveLength(1);
    expect(actions).toEqual([]);
  });

  test('binds a duplicate proposal ID to only one concurrent Agent proposal', async () => {
    const { runtime } = dependencies();
    await createDraft(runtime);
    const digestResolvers = new Map<string, (digest: string) => void>();
    const controller = createSurfaceAgentWorkflow({
      dependencies: runtime,
      scopeId: 'tenant-a',
      surfaceId: 'inventory',
      proposalId: () => 'proposal-1',
      digest: async (binding) => new Promise<string>((resolve) => {
        const summary = (binding as { summary: string }).summary;
        digestResolvers.set(summary, resolve);
      }),
      now: () => Date.parse('2026-08-11T14:00:00.000Z'),
    });

    const firstRequest = controller.request({ ...proposal(), summary: 'First proposal' });
    const secondRequest = controller.request({ ...proposal(), summary: 'Second proposal' });
    await vi.waitFor(() => expect(digestResolvers.size).toBe(2));
    digestResolvers.get('First proposal')?.('sha256:first');
    const first = await firstRequest;
    digestResolvers.get('Second proposal')?.('sha256:second');
    const second = await secondRequest;

    const successful = [first, second].filter((result) => result.ok);
    const duplicate = [first, second].filter((result) => !result.ok);
    expect(successful).toHaveLength(1);
    expect(duplicate).toEqual([
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({ code: 'duplicate_proposal_id' }),
      }),
    ]);
    expect(controller.get('proposal-1')).toEqual(expect.objectContaining({
      summary: successful[0].ok ? successful[0].review.summary : '',
      digest: successful[0].ok ? successful[0].review.digest : '',
    }));

    const history = await listSurfaceDocumentHistory({
      dependencies: runtime,
      scopeId: 'tenant-a',
      surfaceId: 'inventory',
    });
    expect(history.ok && history.documents).toHaveLength(1);
  });

  test('requires explicit approval, then revalidates and writes exactly once', async () => {
    const { runtime, actions } = dependencies();
    await createDraft(runtime);
    actions.length = 0;
    const controller = workflow(runtime);
    await controller.request(proposal());

    const approved = await controller.approve({
      proposalId: 'proposal-1',
      actorId: 'reviewer',
      operationId: 'approve-1',
    });
    expect(approved).toEqual({
      ok: true,
      review: expect.objectContaining({
        status: 'applied',
        appliedRevision: 2,
        decision: expect.objectContaining({ actorId: 'reviewer', decision: 'approved' }),
      }),
    });
    expect(actions).toEqual(['approve', 'write']);

    const history = await listSurfaceDocumentHistory({
      dependencies: runtime,
      scopeId: 'tenant-a',
      surfaceId: 'inventory',
    });
    expect(history.ok && history.documents).toHaveLength(2);
    expect(history.ok && history.documents[1].provenance).toEqual(expect.objectContaining({
      origin: 'agent',
      proposalId: 'proposal-1',
      proposalDigest: 'sha256:test-digest',
      actorId: 'reviewer',
    }));

    const replay = await controller.approve({
      proposalId: 'proposal-1',
      actorId: 'reviewer',
      operationId: 'approve-2',
    });
    expect(replay).toEqual(expect.objectContaining({
      ok: false,
      error: expect.objectContaining({ code: 'proposal_not_pending' }),
    }));
    const replayHistory = await listSurfaceDocumentHistory({
      dependencies: runtime,
      scopeId: 'tenant-a',
      surfaceId: 'inventory',
    });
    expect(replayHistory.ok && replayHistory.documents).toHaveLength(2);
  });

  test('rejects and expires proposals with zero writes', async () => {
    const { runtime } = dependencies();
    await createDraft(runtime);
    let clock = Date.parse('2026-08-11T14:00:00.000Z');
    const controller = workflow(runtime, () => clock);
    await controller.request(proposal());
    const rejected = await controller.reject({
      proposalId: 'proposal-1',
      actorId: 'reviewer',
      reason: 'Needs product review',
    });
    expect(rejected.ok && rejected.review.status).toBe('rejected');

    const second = createSurfaceAgentWorkflow({
      dependencies: runtime,
      scopeId: 'tenant-a',
      surfaceId: 'inventory',
      proposalId: () => 'proposal-2',
      digest: async () => 'sha256:second',
      now: () => clock,
      proposalTtlMs: 1_000,
    });
    await second.request(proposal());
    clock += 1_000;
    const expired = await second.approve({
      proposalId: 'proposal-2',
      actorId: 'reviewer',
      operationId: 'approve-expired',
    });
    expect(expired).toEqual(expect.objectContaining({
      ok: false,
      error: expect.objectContaining({ code: 'proposal_expired' }),
    }));
    const history = await listSurfaceDocumentHistory({
      dependencies: runtime,
      scopeId: 'tenant-a',
      surfaceId: 'inventory',
    });
    expect(history.ok && history.documents).toHaveLength(1);
  });

  test('allows only one concurrent rejection decision and writes no document revision', async () => {
    const { runtime } = dependencies();
    await createDraft(runtime);
    let enterAuthorization!: () => void;
    let releaseAuthorization!: () => void;
    const authorizationEntered = new Promise<void>((resolve) => {
      enterAuthorization = resolve;
    });
    const authorizationGate = new Promise<void>((resolve) => {
      releaseAuthorization = resolve;
    });
    const authorizationActions: string[] = [];
    const gatedRuntime: SurfaceDocumentDependencies = {
      ...runtime,
      authorize: async (request) => {
        authorizationActions.push(request.action);
        enterAuthorization();
        await authorizationGate;
        return { can: true };
      },
    };
    const controller = workflow(gatedRuntime);
    await controller.request(proposal());

    const firstDecision = controller.reject({
      proposalId: 'proposal-1',
      actorId: 'reviewer-1',
      reason: 'First decision wins',
    });
    await authorizationEntered;
    const concurrentDecision = controller.reject({
      proposalId: 'proposal-1',
      actorId: 'reviewer-2',
      reason: 'Must not overwrite the first decision',
    });
    await Promise.resolve();
    releaseAuthorization();

    const [first, concurrent] = await Promise.all([firstDecision, concurrentDecision]);
    expect(first).toEqual(expect.objectContaining({
      ok: true,
      review: expect.objectContaining({
        status: 'rejected',
        decision: expect.objectContaining({ actorId: 'reviewer-1' }),
      }),
    }));
    expect(concurrent).toEqual(expect.objectContaining({
      ok: false,
      error: expect.objectContaining({ code: 'proposal_not_pending' }),
    }));
    expect(authorizationActions).toEqual(['approve']);
    expect(controller.get('proposal-1')).toEqual(expect.objectContaining({
      status: 'rejected',
      decision: expect.objectContaining({ actorId: 'reviewer-1' }),
    }));

    const history = await listSurfaceDocumentHistory({
      dependencies: runtime,
      scopeId: 'tenant-a',
      surfaceId: 'inventory',
    });
    expect(history.ok && history.documents).toHaveLength(1);
  });

  test('captures the approval timestamp before the durable write completes', async () => {
    const { runtime } = dependencies();
    await createDraft(runtime);
    const timestamp = Date.parse('2026-08-11T14:00:00.000Z');
    let clockReads = 0;
    const controller = workflow(runtime, () => {
      clockReads += 1;
      if (clockReads > 2) throw new Error('Clock became unavailable');
      return timestamp;
    });
    await controller.request(proposal());

    const approved = await controller.approve({
      proposalId: 'proposal-1',
      actorId: 'reviewer',
      operationId: 'approve-clock',
    });
    expect(approved.ok && approved.review.decision?.decidedAt).toBe('2026-08-11T14:00:00.000Z');
    expect(clockReads).toBe(2);
    const history = await listSurfaceDocumentHistory({
      dependencies: runtime,
      scopeId: 'tenant-a',
      surfaceId: 'inventory',
    });
    expect(history.ok && history.documents).toHaveLength(2);
  });

  test('rejects malformed approval identity before authorization or writing', async () => {
    const { runtime, actions } = dependencies();
    await createDraft(runtime);
    actions.length = 0;
    const controller = workflow(runtime);
    await controller.request(proposal());

    const denied = await controller.approve({
      proposalId: 'proposal-1',
      actorId: '',
      operationId: 'approve-invalid',
    });
    expect(denied).toEqual(expect.objectContaining({
      ok: false,
      error: expect.objectContaining({ code: 'invalid_decision' }),
    }));
    expect(actions).toEqual([]);
    const history = await listSurfaceDocumentHistory({
      dependencies: runtime,
      scopeId: 'tenant-a',
      surfaceId: 'inventory',
    });
    expect(history.ok && history.documents).toHaveLength(1);
  });

  test('fails closed when Policy changes after preview', async () => {
    const { runtime } = dependencies();
    await createDraft(runtime);
    const controller = workflow(runtime);
    const requested = await controller.request(proposal([{
      op: 'add',
      path: '/dataSources/0/filters',
      value: [{ field: 'stock', operator: 'gte', value: 5 }],
    }]));
    expect(requested.ok).toBe(true);

    mutableResourcePolicy.filterFields = [];
    const approved = await controller.approve({
      proposalId: 'proposal-1',
      actorId: 'reviewer',
      operationId: 'approve-policy-change',
    });
    expect(approved).toEqual(expect.objectContaining({
      ok: false,
      error: expect.objectContaining({ code: 'surface_invalid' }),
    }));
    mutableResourcePolicy.filterFields = ['stock'];

    const history = await listSurfaceDocumentHistory({
      dependencies: runtime,
      scopeId: 'tenant-a',
      surfaceId: 'inventory',
    });
    expect(history.ok && history.documents).toHaveLength(1);
  });

  test('rejects Agent attempts to provide scope, actor, or a different surface', async () => {
    const { runtime } = dependencies();
    await createDraft(runtime);
    const controller = workflow(runtime);
    expect((await controller.request({ ...proposal(), scopeId: 'tenant-b' })).ok).toBe(false);
    expect((await controller.request({ ...proposal(), actorId: 'agent' })).ok).toBe(false);
    expect((await controller.request({ ...proposal(), surfaceId: 'other' })).ok).toBe(false);
  });

  test('accepts one proposal component and rejects Agent tool events', async () => {
    const { runtime } = dependencies();
    await createDraft(runtime);
    const controller = workflow(runtime);
    const messages: ChatMessage[] = [{
      id: 'message-1',
      role: 'user',
      content: 'Improve the dashboard',
      timestamp: 1,
    }];
    const provider: AgentProvider = {
      async *chat() {
        yield { type: 'text', content: 'Preparing a proposal' };
        yield { type: 'component', name: SURFACE_AGENT_COMPONENT, props: proposal() };
        yield { type: 'done' };
      },
    };
    const requested = await requestSurfaceProposalFromAgent({ provider, messages, workflow: controller });
    expect(requested.ok && requested.review.status).toBe('pending');

    const toolProvider: AgentProvider = {
      async *chat() {
        yield { type: 'tool_call', tool: 'deleteRecords', args: { ids: [1] } };
        yield { type: 'done' };
      },
    };
    const denied = await requestSurfaceProposalFromAgent({
      provider: toolProvider,
      messages,
      workflow: controller,
    });
    expect(denied).toEqual(expect.objectContaining({
      ok: false,
      error: expect.objectContaining({ code: 'agent_tool_event_denied' }),
    }));
  });
});
