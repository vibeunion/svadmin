import { definedOptions } from './defined-options';
import {
  accessControlFailure, prepareCanCheck, prepareCanBatchCheck, snapshotCanParams,
  supersededAccessControl, captureAccessControlProvider,
} from './access-control-contract';
import { HttpError } from './types';
import { parseFeatureGateUser, snapshotFeatureGateConfig } from './feature-gate-contract';
// Permission / Access Control

// ─── Types ────────────────────────────────────────────────────

/** Actions that can be checked for access control. Extensible via string literal union. */
export type Action='list'|'show'|'create'|'edit'|'delete'|'export'|'field'|(string&{});

export interface CanParams {
  resource: string;
  action: Action;
  params?: { id?: string|number;[key: string]: unknown };
  meta?: Record<string,unknown>;
}

export interface CanResult {
  can: boolean;
  reason?: string;
}



/**
 * UI access-control integration point.
 * It can mirror a backend policy decision for navigation and controls, but browser
 * checks never authorize an API request. The backend must enforce the same policy.
 *
 * @example
 * ```ts
 * const accessControlProvider: AccessControlProvider = {
 *   can: async ({ resource, action, params }) => {
 *     if (resource === 'users' && action === 'delete') {
 *       return { can: false, reason: 'Cannot delete users' };
 *     }
 *     return { can: true };
 *   },
 *   options: {
 *     buttons: { enableAccessControl: true, hideIfUnauthorized: false },
 *   },
 * };
 * ```
 */
export interface AccessControlProvider {
  can: (params: CanParams) => Promise<CanResult>;
  /** Optional native batch capability; otherwise the framework checks each item through can. */
  canMany?: (params: readonly CanParams[]) => Promise<CanResult[]>;
  options?: {
    buttons?: {
      /** Enable access control checks on CRUD buttons globally. Default: false */
      enableAccessControl?: boolean;
      /** Hide buttons when unauthorized instead of disabling. Default: false */
      hideIfUnauthorized?: boolean;
    };
  };
}

export interface AccessControlOptions {
  readonly buttons?: {
    readonly enableAccessControl?: boolean;
    readonly hideIfUnauthorized?: boolean;
  };
}

/** Checked, immutable projection. Use a new input object when changing provider configuration. */
export interface RegisteredAccessControlProvider {
  readonly can: AccessControlProvider['can'];
  readonly canMany?: NonNullable<AccessControlProvider['canMany']>;
  readonly options: AccessControlOptions;
}

// ─── State ────────────────────────────────────────────────────

let provider: RegisteredAccessControlProvider|null=$state.raw(null);
let providerRevision = 0;
let registrationIntent = 0;
const emptyOptions: AccessControlOptions = Object.freeze({});

// ─── API ──────────────────────────────────────────────────────

/**
 * Register a checked snapshot. Input object identity denotes immutable configuration.
 */
export function setAccessControlProvider(p: AccessControlProvider): void {
  const intent = ++registrationIntent;
  let candidate: RegisteredAccessControlProvider;
  try {
    candidate = captureAccessControlProvider(p);
  } catch (error) {
    if (intent !== registrationIntent) throw supersededAccessControl();
    throw error;
  }
  if (intent !== registrationIntent) throw supersededAccessControl();
  providerRevision++;
  provider=candidate;
}

/** Get the current AccessControlProvider (or null) */
export function getAccessControlProvider(): RegisteredAccessControlProvider|null {
  return provider;
}

export function resetAccessControlProvider(): void {
  registrationIntent++;
  providerRevision++;
  provider=null;
}

/** Get global button options from the AccessControlProvider */
export function getAccessControlOptions(): AccessControlOptions {
  return provider?.options??emptyOptions;
}

/**
 * UI access check supporting single capabilities or a batch.
 * Its result can change browser presentation but never authorizes the backend action.
 */
export async function canAccessAsync(params: readonly CanParams[]): Promise<CanResult[]>;
export async function canAccessAsync(resource: string,action: Action,params?: CanParams['params'],meta?: CanParams['meta']): Promise<CanResult>;
export async function canAccessAsync(resourceOrBatch: string|readonly CanParams[],action?: Action,params?: CanParams['params'],meta?: CanParams['meta']): Promise<CanResult|CanResult[]> {
  const captured = provider;
  const revision = providerRevision;
  const current = () => provider === captured && providerRevision === revision;
  const checkCurrent = () => { if (!current()) throw supersededAccessControl(); };
  try {
    let execute: () => Promise<CanResult | CanResult[]>;
    if (typeof resourceOrBatch === 'string') {
      const request = snapshotCanParams({
        resource: resourceOrBatch, ...definedOptions({ action, params, meta }),
      });
      execute = prepareCanCheck(captured, request);
    } else {
      if (action !== undefined || params !== undefined || meta !== undefined) {
        throw new HttpError('Invalid access control request', 422, undefined, { code: 'INVALID_ACCESS_CONTROL_INPUT' });
      }
      execute = prepareCanBatchCheck(captured, resourceOrBatch, current);
    }
    checkCurrent();
    const result = await execute();
    checkCurrent();
    return result;
  } catch (error) {
    const failure = accessControlFailure(error);
    checkCurrent();
    throw failure;
  }
}

// ─── Feature Gate ─────────────────────────────────────────────

interface FeatureGateConstraints {
  /** Role list used only for frontend presentation. */
  readonly roles?: readonly string[];
  /** Permission list used only for frontend presentation; all entries must match. */
  readonly permissions?: readonly string[];
}

export type FeatureGateConfig = FeatureGateConstraints & (
  | {
    /** Minimum required role, including all higher roles. Must occur in roleHierarchy. */
    readonly minRole: string;
    /** Nonempty unique roles, ordered from highest to lowest privilege. */
    readonly roleHierarchy: readonly string[];
  }
  | { readonly minRole?: never; readonly roleHierarchy?: never }
);

/** Browser-side role and permission hints, not authorization credentials. */
export interface FeatureGateUser {
  readonly role: string;
  readonly permissions: readonly string[];
}

/**
 * Creates a feature gate used only for frontend presentation.
 * Configuration is captured as a checked snapshot. User hints remain client-side
 * presentation data; the backend must independently authorize operations.
 * It assumes no role hierarchy and does not interpret wildcard permissions.
 *
 * @example
 * ```ts
 * const HIERARCHY = ['admin', 'editor', 'viewer'];
 * const canEdit = createFeatureGate({
 *   minRole: 'editor',
 *   roleHierarchy: HIERARCHY,
 *   permissions: ['content:write'],
 * });
 *
 * if (canEdit(user)) { ... }
 * ```
 */
export function createFeatureGate(config: FeatureGateConfig): (user: FeatureGateUser) => boolean {
  const rule = snapshotFeatureGateConfig(config);
  return (user: FeatureGateUser): boolean => {
    const subject = parseFeatureGateUser(user);
    if (!subject) return false;
    if(rule.roles&&!rule.roles.includes(subject.role)) {
      return false;
    }

    if(rule.minRole !== undefined) {
      const userIndex=rule.roleHierarchy.indexOf(subject.role);
      const minIndex=rule.roleHierarchy.indexOf(rule.minRole);
      if(userIndex===-1||userIndex>minIndex) return false;
    }

    if(rule.permissions&&rule.permissions.length>0) {
      if(!rule.permissions.every((permission) => subject.permissions.includes(permission))) return false;
    }

    return true;
  };
}
