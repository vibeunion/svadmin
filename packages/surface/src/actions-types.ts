import type { ZodType } from 'zod';
import type {
  JsonObject,
  SurfaceCatalog,
  SurfaceFilter,
  SurfacePolicy,
  SurfaceSpec,
} from './types.js';

export type SurfaceAction =
  | { readonly type: 'refreshSource'; readonly sourceId?: string }
  | { readonly type: 'setFilter'; readonly sourceId: string; readonly filter: SurfaceFilter }
  | { readonly type: 'clearFilter'; readonly sourceId: string }
  | { readonly type: 'navigateResource'; readonly resource: string; readonly recordId?: string | number };

export interface SurfaceNavigationRequest {
  readonly resource: string;
  readonly recordId?: string | number;
}

export interface SurfaceActionContext {
  readonly spec: SurfaceSpec;
  readonly catalog: SurfaceCatalog;
  readonly policy: SurfacePolicy;
  readonly getTransientFilters: (sourceId: string) => readonly SurfaceFilter[];
  readonly applyTransientFilters: (
    sourceId: string,
    filters: readonly SurfaceFilter[],
  ) => void | Promise<void>;
  readonly refresh: (sourceId?: string) => void | Promise<void>;
  readonly navigateResource?: (request: SurfaceNavigationRequest) => void | Promise<void>;
}

export interface SurfaceActionDefinition {
  readonly type: string;
  readonly schema: ZodType<unknown>;
  readonly handler: (
    action: JsonObject,
    context: SurfaceActionContext,
  ) => void | Promise<void>;
}

export interface SurfaceActionRegistry {
  readonly actions: readonly SurfaceActionDefinition[];
}

export type SurfaceActionErrorCode =
  | 'action_denied'
  | 'action_failed'
  | 'action_unavailable'
  | 'invalid_action'
  | 'unknown_action';

export interface SurfaceActionError {
  readonly code: SurfaceActionErrorCode;
  readonly message: string;
}

export type SurfaceActionResult =
  | { readonly ok: true; readonly actionType: string }
  | { readonly ok: false; readonly error: SurfaceActionError };
