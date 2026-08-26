/** 企业级管理能力的正式 Provider 契约。 */

export interface EnterpriseActionError {
  message: string;
  code?: string;
}

export interface EnterpriseActionResult {
  success: boolean;
  error?: EnterpriseActionError;
}

/** 每次企业能力调用都必须显式携带当前请求树的租户与追踪上下文。 */
export interface EnterpriseRequestContext {
  tenantId?: string | number;
  requestId?: string;
  traceId?: string;
  meta?: Readonly<Record<string, unknown>>;
}

/** Provider 调用使用的严格请求上下文；三项边界标识不可省略。 */
export interface StrictEnterpriseRequestContext {
  tenantId: string | number;
  requestId: string;
  traceId: string;
  meta?: Readonly<Record<string, unknown>>;
}

export interface EnterpriseRequestContextInput {
  tenantId: string | number;
  requestId?: string;
  traceId?: string;
  meta?: Readonly<Record<string, unknown>>;
}

function nonEmpty(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} must not be empty.`);
  return normalized;
}

function validatedTenantId(tenantId: string | number): string | number {
  if (typeof tenantId === 'string') return nonEmpty(tenantId, 'tenantId');
  if (!Number.isFinite(tenantId)) throw new Error('tenantId must be a finite number.');
  return tenantId;
}

function createRequestId(): string {
  const randomUUID = globalThis.crypto?.randomUUID;
  if (!randomUUID) throw new Error('crypto.randomUUID is required to create an enterprise request context.');
  return randomUUID.call(globalThis.crypto);
}

/** Create a validated provider context while preserving one trace across the request tree. */
export function createEnterpriseRequestContext(
  input: EnterpriseRequestContextInput,
): StrictEnterpriseRequestContext {
  const requestId = input.requestId === undefined
    ? createRequestId()
    : nonEmpty(input.requestId, 'requestId');
  return {
    tenantId: validatedTenantId(input.tenantId),
    requestId,
    traceId: input.traceId === undefined ? requestId : nonEmpty(input.traceId, 'traceId'),
    ...(input.meta ? { meta: input.meta } : {}),
  };
}

/** Narrow a legacy optional context at the provider boundary and fail closed on missing identity. */
export function assertEnterpriseRequestContext(
  context: EnterpriseRequestContext,
): asserts context is StrictEnterpriseRequestContext {
  if (context.tenantId === undefined || context.tenantId === null) {
    throw new Error('tenantId must not be empty.');
  }
  validatedTenantId(context.tenantId);
  nonEmpty(context.requestId ?? '', 'requestId');
  nonEmpty(context.traceId ?? '', 'traceId');
}

export type EnterpriseProviderRequestContext = StrictEnterpriseRequestContext;

export interface Organization {
  id: string;
  name: string;
  slug?: string;
  domain?: string;
  metadata?: Record<string, unknown>;
}

export interface OrganizationProvider {
  getCurrentOrganization: (context: EnterpriseRequestContext) => Promise<Organization | null>;
  updateCurrentOrganization?: (
    input: Partial<Omit<Organization, 'id'>>,
    context: EnterpriseRequestContext,
  ) => Promise<Organization>;
}

export interface EnterpriseSecurityPolicy {
  sessionTimeoutMinutes: number;
  auditRetentionDays: number;
  auditLoggingEnabled: boolean;
  requireSso: boolean;
}

export type IdentityProviderProtocol = 'oidc' | 'saml' | (string & {});
export type IdentityProviderStatus = 'connected' | 'disabled' | 'error' | (string & {});

export interface IdentityProviderSummary {
  id: string;
  name: string;
  protocol: IdentityProviderProtocol;
  status: IdentityProviderStatus;
  metadataUrl?: string;
  domain?: string;
}

export interface EnterpriseSecurityEvent {
  id: string;
  event: string;
  actor?: string;
  location?: string;
  createdAt: string | Date;
  severity?: 'info' | 'warning' | 'critical';
  tenantId?: string | number;
  requestId?: string;
  traceId?: string;
  metadata?: Record<string, unknown>;
}

export interface IdentityGovernanceProvider {
  getSecurityPolicy: (context: EnterpriseRequestContext) => Promise<EnterpriseSecurityPolicy>;
  updateSecurityPolicy: (
    policy: EnterpriseSecurityPolicy,
    context: EnterpriseRequestContext,
  ) => Promise<EnterpriseSecurityPolicy>;
  listIdentityProviders: (context: EnterpriseRequestContext) => Promise<IdentityProviderSummary[]>;
  testIdentityProvider: (params: {
    id?: string;
    protocol?: IdentityProviderProtocol;
    metadataUrl?: string;
  }, context: EnterpriseRequestContext) => Promise<EnterpriseActionResult>;
  listSecurityEvents?: (params: {
    page?: number;
    pageSize?: number;
  } | undefined, context: EnterpriseRequestContext) => Promise<{ data: EnterpriseSecurityEvent[]; total: number }>;
}

export interface SessionInfo {
  id: string;
  os?: string;
  browser?: string;
  ipAddress?: string;
  lastActiveAt?: string | Date;
  current: boolean;
}

export interface MfaState {
  enabled: boolean;
  methods?: string[];
}

export interface SessionProvider {
  listSessions: (context: EnterpriseRequestContext) => Promise<SessionInfo[]>;
  revokeSession: (sessionId: string, context: EnterpriseRequestContext) => Promise<EnterpriseActionResult>;
  revokeOtherSessions: (context: EnterpriseRequestContext) => Promise<EnterpriseActionResult>;
  getMfaState?: (context: EnterpriseRequestContext) => Promise<MfaState>;
  setMfaEnabled?: (enabled: boolean, context: EnterpriseRequestContext) => Promise<MfaState>;
}

export interface ApiCredentialSummary {
  id: string;
  name: string;
  prefix: string;
  createdAt: string | Date;
  lastUsedAt?: string | Date;
  permissions: string[];
}

export interface CreatedApiCredential {
  credential: ApiCredentialSummary;
  /** 只在创建时返回一次；列表接口不得返回此字段。 */
  secret: string;
}

export interface WebhookSummary {
  id: string;
  name: string;
  url: string;
  eventType: string;
  enabled?: boolean;
}

export interface CredentialProvider {
  listApiCredentials: (context: EnterpriseRequestContext) => Promise<ApiCredentialSummary[]>;
  createApiCredential: (params: {
    name: string;
    permissions: string[];
  }, context: EnterpriseRequestContext) => Promise<CreatedApiCredential>;
  revokeApiCredential: (credentialId: string, context: EnterpriseRequestContext) => Promise<EnterpriseActionResult>;
  listWebhooks: (context: EnterpriseRequestContext) => Promise<WebhookSummary[]>;
  createWebhook: (params: {
    name: string;
    url: string;
    eventType: string;
  }, context: EnterpriseRequestContext) => Promise<WebhookSummary>;
  deleteWebhook: (webhookId: string, context: EnterpriseRequestContext) => Promise<EnterpriseActionResult>;
}
