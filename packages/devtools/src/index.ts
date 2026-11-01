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

export type DevtoolsHealthStatus = 'healthy' | 'warning' | 'error';

export interface DevtoolsHealthSummary {
  status: DevtoolsHealthStatus;
  errors: number;
  warnings: number;
  info: number;
  configuredProviders: number;
  totalProviders: number;
  resources: number;
  routes: number;
}

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

export interface DevtoolsAppDiagnostics {
  snapshot: DevtoolsSnapshot;
  providers: DevtoolsProviderDiagnostic[];
  resources: DevtoolsResourceDiagnostic[];
  routes: DevtoolsRouteDiagnostic[];
  health: DevtoolsHealthSummary;
}

export interface BuildAdminDiagnosticsOptions {
  providers: ProviderBundle;
  resources: readonly ResourceDefinition[];
  diagnostics?: readonly DevtoolsDiagnostic[];
  events?: readonly DevtoolsEvent[];
  source?: DevtoolsSource;
  context?: DevtoolsTraceContext;
  basePath?: string;
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

export function buildDevtoolsHealthSummary(input: {
  diagnostics: readonly DevtoolsDiagnostic[];
  providers: readonly DevtoolsProviderDiagnostic[];
  resources: readonly DevtoolsResourceDiagnostic[];
  routes: readonly DevtoolsRouteDiagnostic[];
}): DevtoolsHealthSummary {
  const errors = input.diagnostics.filter((diagnostic) => diagnostic.severity === 'error').length;
  const warnings = input.diagnostics.filter((diagnostic) => diagnostic.severity === 'warning').length;
  const info = input.diagnostics.filter((diagnostic) => diagnostic.severity === 'info').length;
  const status: DevtoolsHealthStatus = errors > 0
    ? 'error'
    : warnings > 0
      ? 'warning'
      : 'healthy';

  return {
    status,
    errors,
    warnings,
    info,
    configuredProviders: input.providers.filter((provider) => provider.configured).length,
    totalProviders: input.providers.length,
    resources: input.resources.length,
    routes: input.routes.length,
  };
}

/**
 * Builds the complete JSON-safe application diagnostic view used by DevTools,
 * the CLI, and integration tests. The input contains only provider/resource
 * metadata and already-sanitized diagnostics/events; no runtime payloads are
 * copied into the result.
 */
export function buildAdminDiagnostics(
  options: BuildAdminDiagnosticsOptions,
): DevtoolsAppDiagnostics {
  const providers = buildProviderDiagnostics(options.providers);
  const resources = buildResourceDiagnostics(options.resources);
  const routes = buildRouteDiagnostics(options.resources, options.basePath);
  const diagnostics = [...(options.diagnostics ?? [])];
  const events = [...(options.events ?? [])];
  const context = options.context ?? {};
  const snapshot = createDevtoolsSnapshot({
    source: options.source ?? 'frontend',
    diagnostics,
    events,
    ...(context.requestId !== undefined ? { requestId: context.requestId } : {}),
    ...(context.traceId !== undefined ? { traceId: context.traceId } : {}),
    ...(context.correlationId !== undefined ? { correlationId: context.correlationId } : {}),
  });

  return {
    snapshot,
    providers,
    resources,
    routes,
    health: buildDevtoolsHealthSummary({ diagnostics, providers, resources, routes }),
  };
}

// ─── Self-Healing Runtime Diagnostics ────────────────────────

export interface SelfHealingIssue {
  category: 'PERMISSION_DENIED' | 'SCHEMA_MISMATCH' | 'NETWORK_ERROR' | 'RUNTIME_EXCEPTION';
  code: string;
  message: string;
  resource?: string;
  operation?: string;
  suggestedAction: string;
  location?: DevtoolsLocation;
}

export interface SelfHealingReport {
  hasErrors: boolean;
  errorCount: number;
  issues: SelfHealingIssue[];
  agentPrompt: string;
}

export interface CaptureRuntimeErrorOptions {
  source?: DevtoolsSource;
  resource?: string;
  operation?: string;
  traceId?: string;
  requestId?: string;
  correlationId?: string;
  location?: DevtoolsLocation;
}

/**
 * Normalizes any runtime exception or API failure into a structured DevtoolsDiagnostic
 * with machine-actionable category and remediation guidance.
 */
export function captureRuntimeError(
  error: unknown,
  context: CaptureRuntimeErrorOptions = {},
): DevtoolsDiagnostic {
  let message = 'Unknown runtime error';
  let code = 'runtime.error';
  let category: SelfHealingIssue['category'] = 'RUNTIME_EXCEPTION';
  let suggestedAction = 'Inspect component logic and error stack trace.';

  if (error instanceof Error) {
    message = error.message;
    if (/403|forbidden|permission|unauthorized|access denied/i.test(message)) {
      code = 'auth.forbidden';
      category = 'PERMISSION_DENIED';
      suggestedAction = context.resource
        ? `Grant permission for operation '${context.operation ?? 'read'}' on resource '${context.resource}' in AccessControlProvider or AuthProvider`
        : 'Verify user credentials, active permissions, or AccessControlProvider rules';
    } else if (/404|not found/i.test(message)) {
      code = 'resource.not_found';
      category = 'NETWORK_ERROR';
      suggestedAction = context.resource
        ? `Verify record ID and endpoint URL for resource '${context.resource}' in DataProvider`
        : 'Verify endpoint URL and routing configuration';
    } else if (/schema|invalid|type|validation|must be/i.test(message)) {
      code = 'schema.mismatch';
      category = 'SCHEMA_MISMATCH';
      suggestedAction = context.resource
        ? `Check field definitions and type validation rules for resource '${context.resource}' in ResourceDefinition`
        : 'Ensure payload data matches expected schema definition';
    } else if (/network|failed to fetch|econnrefused|timeout/i.test(message)) {
      code = 'network.failure';
      category = 'NETWORK_ERROR';
      suggestedAction = 'Check backend server health, CORS headers, and network connectivity';
    }
  } else if (typeof error === 'string') {
    message = error;
  } else if (error && typeof error === 'object' && 'message' in error) {
    message = String((error as { message: unknown }).message);
  }

  return {
    code,
    source: context.source ?? 'frontend',
    severity: 'error',
    message,
    ...(context.traceId !== undefined ? { traceId: context.traceId } : {}),
    ...(context.requestId !== undefined ? { requestId: context.requestId } : {}),
    ...(context.correlationId !== undefined ? { correlationId: context.correlationId } : {}),
    ...(context.location !== undefined ? { location: context.location } : {}),
    fix: {
      kind: category,
      safe: false,
      input: {
        suggestedAction,
        ...(context.resource ? { resource: context.resource } : {}),
        ...(context.operation ? { operation: context.operation } : {}),
      },
    },
  };
}

/**
 * Builds an AI-ready self-healing report from captured diagnostics, formatting
 * the failure root-causes and providing a direct prompt for AI Agent remediation.
 */
export function buildSelfHealingReport(
  diagnostics: readonly DevtoolsDiagnostic[],
  _events?: readonly DevtoolsEvent[],
): SelfHealingReport {
  const errorDiagnostics = diagnostics.filter((d) => d.severity === 'error');
  const issues: SelfHealingIssue[] = errorDiagnostics.map((d) => {
    let category: SelfHealingIssue['category'] = 'RUNTIME_EXCEPTION';
    let suggestedAction = 'Inspect component logic and stack trace.';
    const resource = d.fix?.input?.['resource'] as string | undefined;
    const operation = d.fix?.input?.['operation'] as string | undefined;

    if (
      d.fix?.kind &&
      ['PERMISSION_DENIED', 'SCHEMA_MISMATCH', 'NETWORK_ERROR', 'RUNTIME_EXCEPTION'].includes(
        d.fix.kind as string,
      )
    ) {
      category = d.fix.kind as SelfHealingIssue['category'];
      suggestedAction = (d.fix.input?.['suggestedAction'] as string) || suggestedAction;
    } else if (/auth|forbidden|permission|403/i.test(d.code + ' ' + d.message)) {
      category = 'PERMISSION_DENIED';
      suggestedAction = 'Check AccessControlProvider or AuthProvider permissions.';
    } else if (/schema|type|validation/i.test(d.code + ' ' + d.message)) {
      category = 'SCHEMA_MISMATCH';
      suggestedAction = 'Check field definitions in ResourceDefinition against backend schema.';
    } else if (/network|404|500|fetch/i.test(d.code + ' ' + d.message)) {
      category = 'NETWORK_ERROR';
      suggestedAction = 'Check API endpoint URL and network connectivity.';
    }

    return {
      category,
      code: d.code,
      message: d.message,
      ...(resource ? { resource } : {}),
      ...(operation ? { operation } : {}),
      suggestedAction,
      ...(d.location ? { location: d.location } : {}),
    };
  });

  const hasErrors = issues.length > 0;
  let agentPrompt = '';

  if (hasErrors) {
    const issueLines = issues
      .map((issue, idx) => {
        const target = issue.resource
          ? ` (Resource: ${issue.resource}${issue.operation ? `, Operation: ${issue.operation}` : ''})`
          : '';
        const loc = issue.location?.file
          ? ` at ${issue.location.file}:${issue.location.line ?? 1}`
          : '';
        return `${idx + 1}. [${issue.category}] ${issue.code}${target}${loc}: ${issue.message}\n   Suggested Fix: ${issue.suggestedAction}`;
      })
      .join('\n');

    agentPrompt = `## SVAdmin Runtime Error Self-Healing Report\n\nThe following ${issues.length} runtime error(s) were captured by SVAdmin DevTools:\n\n${issueLines}\n\nPlease analyze the root causes and generate the exact code fix required to resolve these issues.`;
  } else {
    agentPrompt = 'No active runtime errors found in SVAdmin DevTools.';
  }

  return {
    hasErrors,
    errorCount: issues.length,
    issues,
    agentPrompt,
  };
}
