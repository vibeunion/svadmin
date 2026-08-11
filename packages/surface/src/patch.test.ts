import { describe, expect, test, vi } from 'vitest';
import { z } from 'zod';
import {
  createMemorySurfaceStore,
  listSurfaceDocumentHistory,
  saveSurfaceDraft,
  type SurfaceDocumentDependencies,
  type SurfaceStore,
} from './document.js';
import {
  commitSurfacePatch,
  previewSurfacePatch,
  validateSurfacePatch,
} from './patch.js';
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

function dependencies(store = createMemorySurfaceStore()): SurfaceDocumentDependencies {
  return {
    store,
    catalog,
    policy,
    authorize: async () => ({ can: true }),
    now: () => new Date('2026-08-11T13:00:00.000Z'),
  };
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

describe('Surface Patch', () => {
  test('accepts only the strict RFC 6902 subset and safe roots', () => {
    expect(validateSurfacePatch([
      { op: 'test', path: '/title', value: 'Inventory' },
      { op: 'replace', path: '/title', value: 'Inventory overview' },
      { op: 'add', path: '/widgets/-', value: spec.widgets[0] },
      { op: 'remove', path: '/widgets/1' },
    ]).ok).toBe(true);

    for (const operations of [
      [{ op: 'move', from: '/title', path: '/layout' }],
      [{ op: 'replace', path: '/surfaceId', value: 'other' }],
      [{ op: 'add', path: '/widgets/0/__proto__/polluted', value: true }],
      [{ op: 'remove', path: '/widgets/01' }],
      [{ op: 'remove', path: '/widgets/-' }],
      [{ op: 'remove', path: '/title', value: 'extra' }],
    ]) {
      expect(validateSurfacePatch(operations)).toEqual(expect.objectContaining({ ok: false }));
    }
  });

  test('previews all operations on an isolated clone', () => {
    const preview = previewSurfacePatch({
      spec,
      catalog,
      policy,
      operations: [
        { op: 'test', path: '/title', value: 'Inventory' },
        { op: 'replace', path: '/title', value: 'Inventory overview' },
        { op: 'add', path: '/layout/gap', value: 'lg' },
      ],
    });

    expect(preview).toEqual({
      ok: true,
      preview: expect.objectContaining({
        changedPaths: ['/title', '/layout/gap'],
        before: expect.objectContaining({ title: 'Inventory', layout: { type: 'grid', columns: 12 } }),
        after: expect.objectContaining({
          title: 'Inventory overview',
          layout: { type: 'grid', columns: 12, gap: 'lg' },
        }),
      }),
    });
    expect(spec.title).toBe('Inventory');
    expect(spec.layout).toEqual({ type: 'grid', columns: 12 });
  });

  test('fails atomically when a test operation or final policy validation fails', () => {
    expect(previewSurfacePatch({
      spec,
      catalog,
      policy,
      operations: [
        { op: 'replace', path: '/title', value: 'Changed first' },
        { op: 'test', path: '/layout/gap', value: 'lg' },
      ],
    })).toEqual(expect.objectContaining({
      ok: false,
      error: expect.objectContaining({ code: 'patch_test_failed' }),
    }));

    expect(previewSurfacePatch({
      spec,
      catalog,
      policy,
      operations: [{
        op: 'add',
        path: '/dataSources/0/filters',
        value: [{ field: 'secret', operator: 'eq', value: 'x' }],
      }],
    })).toEqual(expect.objectContaining({
      ok: false,
      error: expect.objectContaining({ code: 'surface_invalid' }),
    }));
    expect(spec.title).toBe('Inventory');
  });

  test('commits a validated Patch as one CAS draft revision', async () => {
    const runtime = dependencies();
    await createDraft(runtime);
    const committed = await commitSurfacePatch({
      dependencies: runtime,
      scopeId: 'tenant-a',
      surfaceId: 'inventory',
      baseRevision: 1,
      actorId: 'editor',
      operationId: 'patch-1',
      operations: [{ op: 'replace', path: '/title', value: 'Inventory overview' }],
      reason: 'Clarify dashboard title',
    });

    expect(committed).toEqual({
      ok: true,
      document: expect.objectContaining({
        revision: 2,
        stage: 'draft',
        spec: expect.objectContaining({ title: 'Inventory overview' }),
        provenance: expect.objectContaining({
          operation: 'patch',
          operationId: 'patch-1',
          parentRevision: 1,
        }),
      }),
    });
  });

  test('performs zero writes for invalid, denied, and stale Patch requests', async () => {
    const backingStore = createMemorySurfaceStore();
    const append = vi.spyOn(backingStore, 'append');
    const runtime = dependencies(backingStore);
    await createDraft(runtime);
    append.mockClear();

    const invalid = await commitSurfacePatch({
      dependencies: runtime,
      scopeId: 'tenant-a',
      surfaceId: 'inventory',
      baseRevision: 1,
      actorId: 'editor',
      operationId: 'patch-invalid',
      operations: [{ op: 'replace', path: '/surfaceId', value: 'other' }],
    });
    expect(invalid.ok).toBe(false);
    expect(append).not.toHaveBeenCalled();

    const deniedDependencies = { ...runtime, authorize: async () => ({ can: false }) };
    const denied = await commitSurfacePatch({
      dependencies: deniedDependencies,
      scopeId: 'tenant-a',
      surfaceId: 'inventory',
      baseRevision: 1,
      actorId: 'editor',
      operationId: 'patch-denied',
      operations: [{ op: 'replace', path: '/title', value: 'Denied' }],
    });
    expect(denied.ok).toBe(false);
    expect(append).not.toHaveBeenCalled();

    const stale = await commitSurfacePatch({
      dependencies: runtime,
      scopeId: 'tenant-a',
      surfaceId: 'inventory',
      baseRevision: 0,
      actorId: 'editor',
      operationId: 'patch-stale',
      operations: [{ op: 'replace', path: '/title', value: 'Stale' }],
    });
    expect(stale).toEqual(expect.objectContaining({
      ok: false,
      error: expect.objectContaining({ code: 'revision_conflict', actualRevision: 1 }),
    }));
    expect(append).not.toHaveBeenCalled();
  });

  test('rejects malformed Store history without executing accessors', async () => {
    let accessorInvoked = false;
    const poisonedDocument = {};
    Object.defineProperty(poisonedDocument, 'spec', {
      enumerable: true,
      get() {
        accessorInvoked = true;
        return spec;
      },
    });
    const store: SurfaceStore = {
      read: async () => poisonedDocument as never,
      history: async () => [],
      append: vi.fn(),
    };
    const result = await commitSurfacePatch({
      dependencies: dependencies(store),
      scopeId: 'tenant-a',
      surfaceId: 'inventory',
      baseRevision: 1,
      actorId: 'editor',
      operationId: 'patch-poisoned',
      operations: [{ op: 'replace', path: '/title', value: 'Safe' }],
    });

    expect(result).toEqual(expect.objectContaining({
      ok: false,
      error: expect.objectContaining({ code: 'store_result_invalid' }),
    }));
    expect(accessorInvoked).toBe(false);
  });

  test('keeps exactly one new history entry after commit', async () => {
    const runtime = dependencies();
    await createDraft(runtime);
    await commitSurfacePatch({
      dependencies: runtime,
      scopeId: 'tenant-a',
      surfaceId: 'inventory',
      baseRevision: 1,
      actorId: 'editor',
      operationId: 'patch-1',
      operations: [{ op: 'replace', path: '/title', value: 'Inventory overview' }],
    });
    const history = await listSurfaceDocumentHistory({
      dependencies: runtime,
      scopeId: 'tenant-a',
      surfaceId: 'inventory',
    });
    expect(history.ok && history.documents).toHaveLength(2);
  });
});
