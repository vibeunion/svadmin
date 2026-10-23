import type { Snippet } from 'svelte';
import type { AuditEntry } from '@svadmin/core';
import type { TimelineItem } from './content/AuditTimeline.svelte';
import type { FileItem } from './content/FileList.svelte';

/** The record identity every detail workspace section is bound to. */
export interface DetailWorkspaceScope {
  readonly resourceName: string;
  readonly recordId: string | number;
  /** Tenant/provider metadata resolved through `AdminContextAccessor.getProviderMeta`. */
  readonly meta?: Record<string, unknown>;
}

/**
 * A section provider is an explicit, optional data contract. It is never called
 * without a concrete resourceName/recordId, and the consumer aborts it when the
 * section is destroyed.
 */
export interface DetailWorkspaceProvider<T> {
  load(scope: DetailWorkspaceScope, signal: AbortSignal): Promise<T>;
}

export type DetailWorkspaceSnippet = Snippet<[DetailWorkspaceScope]>;

export interface DetailWorkspaceAsyncSection<T> {
  provider: DetailWorkspaceProvider<T>;
  /** Optional custom renderer; the component falls back to its matching display component. */
  render?: Snippet<[DetailWorkspaceScope & { data: T }]>;
  /** Optional predicate for an explicit empty result. */
  empty?: (data: T) => boolean;
  emptyTitle?: string;
  errorTitle?: string;
}

/**
 * A section is either a provider-backed section or an explicit snippet provider.
 * Snippet providers receive the same resourceName/recordId scope and are rebuilt
 * when that scope changes.
 */
export type DetailWorkspaceSection<T> = DetailWorkspaceSnippet | DetailWorkspaceAsyncSection<T>;

export interface DetailWorkspaceVersionData {
  oldValue: Record<string, unknown>;
  newValue: Record<string, unknown>;
  oldTitle?: string;
  newTitle?: string;
  fieldLabels?: Record<string, string>;
}

/**
 * Detail workspace configuration for the real AutoTable detail drawer.
 *
 * Audit uses the existing AuditLogProvider by default. Relations, attachments,
 * activity and versions have no core provider contract yet, so they must be
 * supplied explicitly as provider or snippet sections. Missing sections fail
 * closed instead of rendering placeholder business data.
 */
export interface DetailWorkspaceSectionsConfig {
  relations?: DetailWorkspaceSnippet;
  attachments?: DetailWorkspaceSection<FileItem[]>;
  activity?: DetailWorkspaceSection<TimelineItem[]>;
  audit?: DetailWorkspaceSection<AuditEntry[]>;
  versions?: DetailWorkspaceSection<DetailWorkspaceVersionData>;
}

export function isDetailWorkspaceSnippet<T>(section: DetailWorkspaceSection<T> | undefined): section is DetailWorkspaceSnippet {
  return typeof section === 'function';
}
