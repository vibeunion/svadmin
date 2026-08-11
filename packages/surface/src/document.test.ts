import { describe, expect, test, vi } from 'vitest';
import { z } from 'zod';
import {
  createMemorySurfaceStore,
  listSurfaceDocumentHistory,
  publishSurfaceDocument,
  readSurfaceDocument,
  rollbackSurfaceDocument,
  saveSurfaceDraft,
  type SurfaceDocumentDependencies,
  type SurfaceStore,
} from './document.js';
import type { SurfaceCatalog, SurfacePolicy, SurfaceSpec } from './types.js';

const catalog = {
  version: 'tests/v1',
  widgets: [{
    type: 'metric',
    dataKind: 'scalar',
    propsSchema: z.object({ label: z.string() }).strict(),
  }],
} satisfies SurfaceCatalog;

const policy = {
  resources: {
    products: {
      readFields: ['id', 'name'],
      filterFields: ['name'],
      maxPageSize: 20,
    },
  },
} satisfies SurfacePolicy;

function surfaceSpec(title: string): SurfaceSpec {
  return {
    schemaVersion: 'surface/v1',
    catalogVersion: catalog.version,
    surfaceId: 'inventory',
    title,
    layout: { type: 'grid', columns: 12 },
    dataSources: [{ id: 'products', type: 'resource-list', resource: 'products' }],
    widgets: [{
      id: 'product-count',
      type: 'metric',
      props: { label: 'Products' },
      binding: { sourceId: 'products', pointer: '/total' },
    }],
  };
}

function dependencies(store = createMemorySurfaceStore()): SurfaceDocumentDependencies {
  return {
    store,
    catalog,
    policy,
    authorize: async () => ({ can: true }),
    now: () => new Date('2026-08-11T12:00:00.000Z'),
  };
}

describe('SurfaceDocument revisions', () => {
  test('saves immutable drafts with trusted provenance', async () => {
    const runtime = dependencies();
    const saved = await saveSurfaceDraft({
      dependencies: runtime,
      scopeId: 'tenant-a',
      spec: surfaceSpec('Inventory'),
      expectedRevision: 0,
      actorId: 'user-1',
      operationId: 'save-1',
      reason: 'Initial draft',
    });

    expect(saved).toEqual({
      ok: true,
      document: expect.objectContaining({
        documentVersion: 'surface-document/v1',
        scopeId: 'tenant-a',
        surfaceId: 'inventory',
        revision: 1,
        stage: 'draft',
        createdAt: '2026-08-11T12:00:00.000Z',
        provenance: {
          actorId: 'user-1',
          operationId: 'save-1',
          operation: 'draft.save',
          origin: 'host',
          parentRevision: null,
          reason: 'Initial draft',
        },
      }),
    });

    const loaded = await readSurfaceDocument({
      dependencies: runtime,
      scopeId: 'tenant-a',
      surfaceId: 'inventory',
    });
    expect(loaded).toEqual(saved);
  });

  test('keeps the latest published revision while a newer draft exists', async () => {
    const runtime = dependencies();
    await saveSurfaceDraft({
      dependencies: runtime,
      scopeId: 'tenant-a',
      spec: surfaceSpec('Inventory v1'),
      expectedRevision: 0,
      actorId: 'author',
      operationId: 'save-1',
    });
    const published = await publishSurfaceDocument({
      dependencies: runtime,
      scopeId: 'tenant-a',
      surfaceId: 'inventory',
      expectedRevision: 1,
      actorId: 'publisher',
      operationId: 'publish-1',
    });
    await saveSurfaceDraft({
      dependencies: runtime,
      scopeId: 'tenant-a',
      spec: surfaceSpec('Inventory v2'),
      expectedRevision: 2,
      actorId: 'author',
      operationId: 'save-2',
    });

    expect(published.ok && published.document.revision).toBe(2);
    const latestPublished = await readSurfaceDocument({
      dependencies: runtime,
      scopeId: 'tenant-a',
      surfaceId: 'inventory',
      stage: 'published',
    });
    expect(latestPublished.ok && latestPublished.document.revision).toBe(2);
    const latest = await readSurfaceDocument({
      dependencies: runtime,
      scopeId: 'tenant-a',
      surfaceId: 'inventory',
    });
    expect(latest.ok && latest.document.revision).toBe(3);
    expect(latest.ok && latest.document.spec.title).toBe('Inventory v2');
  });

  test('rolls back by appending a new draft and preserves history', async () => {
    const runtime = dependencies();
    await saveSurfaceDraft({
      dependencies: runtime,
      scopeId: 'tenant-a',
      spec: surfaceSpec('Inventory v1'),
      expectedRevision: 0,
      actorId: 'author',
      operationId: 'save-1',
    });
    await saveSurfaceDraft({
      dependencies: runtime,
      scopeId: 'tenant-a',
      spec: surfaceSpec('Inventory v2'),
      expectedRevision: 1,
      actorId: 'author',
      operationId: 'save-2',
    });

    const rolledBack = await rollbackSurfaceDocument({
      dependencies: runtime,
      scopeId: 'tenant-a',
      surfaceId: 'inventory',
      targetRevision: 1,
      expectedRevision: 2,
      actorId: 'reviewer',
      operationId: 'rollback-1',
      reason: 'Restore the first draft',
    });
    expect(rolledBack.ok && rolledBack.document).toEqual(expect.objectContaining({
      revision: 3,
      stage: 'draft',
      spec: expect.objectContaining({ title: 'Inventory v1' }),
      provenance: expect.objectContaining({
        operation: 'rollback',
        parentRevision: 2,
        targetRevision: 1,
      }),
    }));

    const history = await listSurfaceDocumentHistory({
      dependencies: runtime,
      scopeId: 'tenant-a',
      surfaceId: 'inventory',
    });
    expect(history.ok && history.documents.map((document) => document.revision)).toEqual([1, 2, 3]);

    const noOpRollback = await rollbackSurfaceDocument({
      dependencies: runtime,
      scopeId: 'tenant-a',
      surfaceId: 'inventory',
      targetRevision: 3,
      expectedRevision: 3,
      actorId: 'reviewer',
      operationId: 'rollback-current',
    });
    expect(noOpRollback).toEqual(expect.objectContaining({
      ok: false,
      error: expect.objectContaining({ code: 'invalid_request' }),
    }));
  });

  test('allows only one writer for the same expected revision', async () => {
    const runtime = dependencies();
    await saveSurfaceDraft({
      dependencies: runtime,
      scopeId: 'tenant-a',
      spec: surfaceSpec('Inventory v1'),
      expectedRevision: 0,
      actorId: 'author',
      operationId: 'save-1',
    });

    const attempts = await Promise.all([
      saveSurfaceDraft({
        dependencies: runtime,
        scopeId: 'tenant-a',
        spec: surfaceSpec('Writer A'),
        expectedRevision: 1,
        actorId: 'writer-a',
        operationId: 'save-a',
      }),
      saveSurfaceDraft({
        dependencies: runtime,
        scopeId: 'tenant-a',
        spec: surfaceSpec('Writer B'),
        expectedRevision: 1,
        actorId: 'writer-b',
        operationId: 'save-b',
      }),
    ]);

    expect(attempts.filter((attempt) => attempt.ok)).toHaveLength(1);
    expect(attempts.filter((attempt) => !attempt.ok)).toEqual([
      expect.objectContaining({ ok: false, error: expect.objectContaining({ code: 'revision_conflict' }) }),
    ]);
  });

  test('isolates scopes and denies writes before the store is called', async () => {
    const append = vi.fn<SurfaceStore['append']>();
    const store: SurfaceStore = {
      read: vi.fn(async () => null),
      history: vi.fn(async () => []),
      append,
    };
    const runtime: SurfaceDocumentDependencies = {
      ...dependencies(store),
      authorize: async () => ({ can: false, reason: 'Denied' }),
    };
    const denied = await saveSurfaceDraft({
      dependencies: runtime,
      scopeId: 'tenant-b',
      spec: surfaceSpec('Denied'),
      expectedRevision: 0,
      actorId: 'intruder',
      operationId: 'denied-1',
    });

    expect(denied).toEqual({
      ok: false,
      error: { code: 'access_denied', message: 'Surface write was denied' },
    });
    expect(append).not.toHaveBeenCalled();
  });

  test('rejects cross-scope and non-contiguous Store results', async () => {
    const backingStore = createMemorySurfaceStore();
    const backingRuntime = dependencies(backingStore);
    await saveSurfaceDraft({
      dependencies: backingRuntime,
      scopeId: 'tenant-a',
      spec: surfaceSpec('Tenant A'),
      expectedRevision: 0,
      actorId: 'author',
      operationId: 'save-tenant-a',
    });
    const tenantDocument = await backingStore.read({ scopeId: 'tenant-a', surfaceId: 'inventory' });
    if (!tenantDocument) throw new Error('Expected the tenant document fixture');

    const leakingStore: SurfaceStore = {
      read: async () => tenantDocument,
      history: async () => [tenantDocument, tenantDocument],
      append: vi.fn(),
    };
    const leakingRuntime = dependencies(leakingStore);
    const crossScopeRead = await readSurfaceDocument({
      dependencies: leakingRuntime,
      scopeId: 'tenant-b',
      surfaceId: 'inventory',
    });
    expect(crossScopeRead).toEqual(expect.objectContaining({
      ok: false,
      error: expect.objectContaining({ code: 'store_result_invalid' }),
    }));

    const malformedHistory = await listSurfaceDocumentHistory({
      dependencies: leakingRuntime,
      scopeId: 'tenant-a',
      surfaceId: 'inventory',
    });
    expect(malformedHistory).toEqual(expect.objectContaining({
      ok: false,
      error: expect.objectContaining({ code: 'store_result_invalid' }),
    }));
  });

  test('rejects an append response that does not match the requested scope', async () => {
    const store: SurfaceStore = {
      read: async () => null,
      history: async () => [],
      append: async (request) => ({
        ok: true,
        document: {
          documentVersion: 'surface-document/v1',
          scopeId: 'tenant-b',
          surfaceId: request.surfaceId,
          revision: 1,
          stage: request.stage,
          spec: request.spec,
          createdAt: request.createdAt,
          provenance: { ...request.provenance, parentRevision: null },
        },
      }),
    };
    const saved = await saveSurfaceDraft({
      dependencies: dependencies(store),
      scopeId: 'tenant-a',
      spec: surfaceSpec('Tenant A'),
      expectedRevision: 0,
      actorId: 'author',
      operationId: 'save-tenant-a',
    });

    expect(saved).toEqual(expect.objectContaining({
      ok: false,
      error: expect.objectContaining({ code: 'store_result_invalid' }),
    }));
  });

  test('rejects malformed append result envelopes even when they contain a matching document', async () => {
    const responses = [
      (document: unknown) => ({ document }),
      (document: unknown) => ({ ok: false, code: 'other', document }),
      (document: unknown) => ({ ok: true, document, unexpected: true }),
    ];

    for (const response of responses) {
      const store: SurfaceStore = {
        read: async () => null,
        history: async () => [],
        append: (async (request) => response({
          documentVersion: 'surface-document/v1',
          scopeId: request.scopeId,
          surfaceId: request.surfaceId,
          revision: request.expectedRevision + 1,
          stage: request.stage,
          spec: request.spec,
          createdAt: request.createdAt,
          provenance: {
            ...request.provenance,
            parentRevision: request.expectedRevision === 0 ? null : request.expectedRevision,
          },
        })) as SurfaceStore['append'],
      };
      const saved = await saveSurfaceDraft({
        dependencies: dependencies(store),
        scopeId: 'tenant-a',
        spec: surfaceSpec('Tenant A'),
        expectedRevision: 0,
        actorId: 'author',
        operationId: 'save-tenant-a',
      });

      expect(saved).toEqual(expect.objectContaining({
        ok: false,
        error: expect.objectContaining({ code: 'store_result_invalid' }),
      }));
    }
  });
});
