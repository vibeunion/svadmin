/**
 * @svadmin/devtools — headless diagnostics core.
 *
 * Folds the `@svadmin/devtools-contract` snapshot/event/diagnostic vocabulary
 * into a small runtime collector plus pure diagnostic builders. UI rendering
 * stays in `@svadmin/ui`; this package is what adapters, SSR, and the CLI can
 * use to publish redacted, JSON-safe diagnostics.
 */
export { createDevtoolsSnapshot, redactDevtoolsRecord } from '@svadmin/devtools-contract';
export type {
  DevtoolsCacheDiagnostics,
  DevtoolsDiagnostic,
  DevtoolsEvent,
  DevtoolsLocation,
  DevtoolsProviderDiagnostic,
  DevtoolsQueryDiagnostic,
  DevtoolsSeverity,
  DevtoolsSnapshot,
  DevtoolsSource,
  DevtoolsTraceContext,
  SvadminDevtoolsSnapshot,
} from '@svadmin/devtools-contract';

import {
  createDevtoolsSnapshot,
  type DevtoolsDiagnostic,
  type DevtoolsEvent,
  type DevtoolsProviderDiagnostic,
  type DevtoolsSnapshot,
  type DevtoolsSource,
  type DevtoolsTraceContext,
} from '@svadmin/devtools-contract';
import type { ProviderBundle, ResourceDefinition } from '@svadmin/core';

export interface DevtoolsCollectorOptions {
  source?: DevtoolsSource;
  maxEvents?: number;
  maxDiagnostics?: number;
  context?: DevtoolsTraceContext;
}

export interface DevtoolsCollector {
  readonly source: DevtoolsSource;
  recordEvent(event: DevtoolsEvent): void;
  recordDiagnostic(diagnostic: DevtoolsDiagnostic): void;
  clear(): void;
  snapshot(context?: DevtoolsTraceContext): DevtoolsSnapshot;
  subscribe(listener: (snapshot: DevtoolsSnapshot) => void): () => void;
}

function mergeContext(base: DevtoolsTraceContext, extra: DevtoolsTraceContext): DevtoolsTraceContext {
  const requestId = extra.requestId ?? base.requestId;
  const traceId = extra.traceId ?? base.traceId;
  const correlationId = extra.correlationId ?? base.correlationId;
  return {
    ...(requestId !== undefined ? { requestId } : {}),
    ...(traceId !== undefined ? { traceId } : {}),
    ...(correlationId !== undefined ? { correlationId } : {}),
  };
}

/**
 * Bounded in-memory collector. Events and diagnostics are capped so a long-lived
 * admin session cannot grow without limit; snapshots are redacted on build.
 */
export function createDevtoolsCollector(options: DevtoolsCollectorOptions = {}): DevtoolsCollector {
  const source = options.source ?? 'frontend';
  const maxEvents = options.maxEvents ?? 500;
  const maxDiagnostics = options.maxDiagnostics ?? 200;
  const baseContext = options.context ?? {};
  let events: DevtoolsEvent[] = [];
  let diagnostics: DevtoolsDiagnostic[] = [];
  const listeners = new Set<(snapshot: DevtoolsSnapshot) => void>();

  function build(context: DevtoolsTraceContext = {}): DevtoolsSnapshot {
    const merged = mergeContext(baseContext, context);
    return createDevtoolsSnapshot({
      source,
      diagnostics,
      events,
      ...(merged.requestId !== undefined ? { requestId: merged.requestId } : {}),
      ...(merged.traceId !== undefined ? { traceId: merged.traceId } : {}),
      ...(merged.correlationId !== undefined ? { correlationId: merged.correlationId } : {}),
    });
  }

  function notify(): void {
    const snapshot = build();
    for (const listener of listeners) listener(snapshot);
  }

  return {
    source,
    recordEvent(event) {
      events = [...events, event].slice(-maxEvents);
      notify();
    },
    recordDiagnostic(diagnostic) {
      diagnostics = [...diagnostics, diagnostic].slice(-maxDiagnostics);
      notify();
    },
    clear() {
      events = [];
      diagnostics = [];
      notify();
    },
    snapshot(context) {
      return build(context);
    },
    subscribe(listener) {
      listeners.add(listener);
      if (events.length > 0 || diagnostics.length > 0) listener(build());
      return () => listeners.delete(listener);
    },
  };
}

const PROVIDER_CAPABILITIES: ReadonlyArray<readonly [keyof ProviderBundle, string]> = [
  ['dataProvider', 'data'],
  ['authProvider', 'auth'],
  ['accessControlProvider', 'access-control'],
  ['liveProvider', 'live'],
  ['auditLogProvider', 'audit-log'],
  ['notificationProvider', 'notification'],
  ['chatProvider', 'ai'],
  ['agentProvider', 'ai'],
  ['taskProvider', 'task'],
  ['routerProvider', 'router'],
  ['tenantAdapter', 'tenant'],
  ['organizationProvider', 'organization'],
  ['identityGovernanceProvider', 'identity-governance'],
  ['sessionProvider', 'session'],
  ['credentialProvider', 'credentials'],
];

/** Builds provider diagnostics from a composed ProviderBundle. */
export function buildProviderDiagnostics(bundle: ProviderBundle): DevtoolsProviderDiagnostic[] {
  return PROVIDER_CAPABILITIES.map(([key, capability]) => ({
    name: key,
    configured: bundle[key] !== undefined && bundle[key] !== null,
    capabilities: capability,
  }));
}

export interface DevtoolsResourceOperations {
  list: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  show: boolean;
}

export interface DevtoolsResourceDiagnostic {
  name: string;
  label: string;
  showInMenu: boolean;
  operations: DevtoolsResourceOperations;
  dataProvider?: string;
}

export function buildResourceDiagnostics(
  resources: readonly ResourceDefinition[],
): DevtoolsResourceDiagnostic[] {
  return resources.map((resource) => ({
    name: resource.name,
    label: resource.label,
    showInMenu: resource.showInMenu ?? true,
    operations: {
      list: true,
      create: resource.canCreate ?? true,
      edit: resource.canEdit ?? true,
      delete: resource.canDelete ?? true,
      show: resource.canShow ?? true,
    },
    ...(resource.provider?.dataProviderName !== undefined
      ? { dataProvider: resource.provider.dataProviderName }
      : {}),
  }));
}

export interface DevtoolsRouteDiagnostic {
  resource: string;
  path: string;
}

export function buildRouteDiagnostics(
  resources: readonly ResourceDefinition[],
  basePath = '',
): DevtoolsRouteDiagnostic[] {
  const prefix = basePath.replace(/\/+$/u, '');
  return resources.map((resource) => ({ resource: resource.name, path: `${prefix}/${resource.name}` }));
}

export interface DevtoolsPermissionDiagnostic {
  resource: string;
  action: string;
  allowed: boolean;
  reason?: string;
}

export function toPermissionDiagnostic(
  resource: string,
  action: string,
  result: { can: boolean; reason?: string },
): DevtoolsPermissionDiagnostic {
  return {
    resource,
    action,
    allowed: result.can,
    ...(result.reason !== undefined ? { reason: result.reason } : {}),
  };
}