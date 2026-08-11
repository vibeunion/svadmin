import { cloneJsonValue } from './json.js';
import type { JsonValue } from './types.js';
import {
  SURFACE_DOCUMENT_VERSION,
  type SurfaceDocument,
  type SurfaceStore,
  type SurfaceStoreAppendRequest,
  type SurfaceStoreAppendResult,
  type SurfaceStoreHistoryRequest,
  type SurfaceStoreReadRequest,
} from './document-types.js';

function storeKey(scopeId: string, surfaceId: string): string {
  return JSON.stringify([scopeId, surfaceId]);
}

function cloneDocument(document: SurfaceDocument): SurfaceDocument {
  return cloneJsonValue(document as unknown as JsonValue) as unknown as SurfaceDocument;
}

function selectedDocument(
  history: readonly SurfaceDocument[],
  request: SurfaceStoreReadRequest,
): SurfaceDocument | null {
  if (request.revision !== undefined) {
    const document = history.find((candidate) => candidate.revision === request.revision) ?? null;
    return document && (request.stage === undefined || document.stage === request.stage) ? document : null;
  }
  const candidates = request.stage
    ? history.filter((document) => document.stage === request.stage)
    : history;
  return candidates.at(-1) ?? null;
}

/** Non-persistent single-process Store for tests and deterministic examples. */
export function createMemorySurfaceStore(): SurfaceStore {
  const revisions = new Map<string, SurfaceDocument[]>();

  return {
    async read(request: SurfaceStoreReadRequest): Promise<SurfaceDocument | null> {
      const history = revisions.get(storeKey(request.scopeId, request.surfaceId)) ?? [];
      const document = selectedDocument(history, request);
      return document ? cloneDocument(document) : null;
    },

    async history(request: SurfaceStoreHistoryRequest): Promise<readonly SurfaceDocument[]> {
      const history = revisions.get(storeKey(request.scopeId, request.surfaceId)) ?? [];
      return history.map(cloneDocument);
    },

    async append(request: SurfaceStoreAppendRequest): Promise<SurfaceStoreAppendResult> {
      const key = storeKey(request.scopeId, request.surfaceId);
      const history = revisions.get(key) ?? [];
      const actualRevision = history.at(-1)?.revision ?? 0;
      if (actualRevision !== request.expectedRevision) {
        return { ok: false, code: 'revision_conflict', actualRevision };
      }

      const document: SurfaceDocument = {
        documentVersion: SURFACE_DOCUMENT_VERSION,
        scopeId: request.scopeId,
        surfaceId: request.surfaceId,
        revision: actualRevision + 1,
        stage: request.stage,
        spec: cloneJsonValue(request.spec as unknown as JsonValue) as unknown as SurfaceDocument['spec'],
        createdAt: request.createdAt,
        provenance: {
          ...request.provenance,
          parentRevision: actualRevision === 0 ? null : actualRevision,
        },
      };
      history.push(document);
      revisions.set(key, history);
      return { ok: true, document: cloneDocument(document) };
    },
  };
}
