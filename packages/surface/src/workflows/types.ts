import type { TSchema } from '@sinclair/typebox';
import type { JsonObject, JsonValue, SurfaceCatalog, SurfacePolicy, SurfaceSpec } from '../types.js';

/** Identity comes from authenticated server middleware, never from model JSON. */
export interface SurfaceWorkflowContext { readonly tenantId: string; readonly actorId: string }
export type SurfaceApprovalPolicy = 'confirm' | 'four-eyes';
export type SurfaceActionPhase = 'propose' | 'approve' | 'reject' | 'execute' | 'read';
export interface SurfaceActionDescriptor {
  readonly id: string;
  readonly version: string;
  readonly label: string;
  readonly inputSchema: TSchema;
  readonly approval: SurfaceApprovalPolicy;
}
export interface SurfaceRegisteredAction extends SurfaceActionDescriptor {
  readonly validateInput: (value: unknown) => boolean;
  readonly authorize: (request: {
    context: SurfaceWorkflowContext; phase: SurfaceActionPhase; args: JsonObject; requesterId: string;
  }) => boolean | Promise<boolean>;
  /** Reauthorize in the business backend too. Forward idempotencyKey to it.
   * The workflow cannot promise exactly-once effects across an external service.
   */
  readonly execute: (request: {
    context: SurfaceWorkflowContext; args: JsonObject; idempotencyKey: string;
  }) => JsonValue | Promise<JsonValue>;
}
export interface SurfaceStoredRevision {
  readonly tenantId: string; readonly surfaceId: string; readonly revision: number;
  readonly spec: SurfaceSpec; readonly actorId: string; readonly createdAt: number;
}
export type SurfaceActionStatus = 'pending' | 'approved' | 'executing' | 'succeeded' | 'indeterminate' | 'rejected';
export interface SurfaceActionProposal {
  readonly id: string; readonly tenantId: string; readonly requesterId: string;
  readonly requestKey: string; readonly surfaceId: string; readonly surfaceRevision: number;
  readonly actionId: string; readonly actionVersion: string; readonly actionLabel: string;
  readonly args: JsonObject; readonly digest: string; readonly approval: SurfaceApprovalPolicy;
  readonly status: SurfaceActionStatus; readonly createdAt: number; readonly expiresAt: number;
  readonly approvedBy?: string; readonly result?: JsonValue;
}
export interface SurfaceWorkflowAuditEvent {
  readonly sequence?: number; readonly tenantId: string; readonly surfaceId: string;
  readonly proposalId?: string; readonly actorId: string; readonly event: string;
  readonly at: number; readonly metadata: JsonObject;
}
export interface SurfaceWorkflowTransaction {
  getRevision(tenantId: string, surfaceId: string, revision?: number): SurfaceStoredRevision | undefined;
  putRevision(revision: SurfaceStoredRevision): void;
  getProposal(tenantId: string, id: string): SurfaceActionProposal | undefined;
  findRequest(tenantId: string, requesterId: string, requestKey: string): SurfaceActionProposal | undefined;
  putProposal(proposal: SurfaceActionProposal): void;
  audit(event: SurfaceWorkflowAuditEvent): void;
}
export interface SurfaceWorkflowStore extends SurfaceWorkflowTransaction {
  /** Synchronous atomic transaction. Must roll back on exceptions; no await. */
  transaction<T>(work: (tx: SurfaceWorkflowTransaction) => T): T;
  listAudit(tenantId: string, surfaceId: string, after: number, limit: number): readonly SurfaceWorkflowAuditEvent[];
}
export interface SurfaceWorkflowAccess { readonly catalog: SurfaceCatalog; readonly policy: SurfacePolicy }
export interface SurfaceWorkflowOptions {
  readonly store: SurfaceWorkflowStore;
  readonly actions: readonly SurfaceRegisteredAction[];
  readonly authorizeSurface: (request: {
    context: SurfaceWorkflowContext; operation: 'read' | 'save' | 'audit'; surfaceId: string;
  }) => SurfaceWorkflowAccess | null | Promise<SurfaceWorkflowAccess | null>;
  readonly now?: () => number;
  readonly proposalLifetimeMs?: number;
}
export class SurfaceWorkflowError extends Error {
  constructor(readonly code: 'denied' | 'invalid_input' | 'conflict' | 'not_found' | 'expired' | 'invalid_state' | 'indeterminate', message: string = code) {
    super(message);
    this.name = 'SurfaceWorkflowError';
  }
}
