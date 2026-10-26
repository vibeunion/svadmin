<script lang="ts">
  import { definedOptions } from '@svadmin/core/options';
  import { captureAdminContext, useCan, withValidatedAuditProvider, type AuditEntry } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import type { Snippet } from 'svelte';
  import FileList, { type FileItem } from './content/FileList.svelte';
  import AuditTimeline from './content/AuditTimeline.svelte';
  import type { TimelineItem } from './content/AuditTimeline.svelte';
  import VersionDiffViewer from './VersionDiffViewer.svelte';
  import DetailWorkspaceAsyncSection from './DetailWorkspaceAsyncSection.svelte';
  import {
    isDetailWorkspaceSnippet,
    type DetailWorkspaceAsyncSection as AsyncSectionConfig,
    type DetailWorkspaceSectionsConfig,
    type DetailWorkspaceScope,
    type DetailWorkspaceVersionData,
  } from './detail-workspace.js';

  let {
    resourceName,
    recordId,
    sections = {},
  }: {
    resourceName: string;
    recordId: string | number;
    sections?: DetailWorkspaceSectionsConfig;
  } = $props();

  const i18n = useTranslation();
  const adminContext = captureAdminContext();
  const instanceId = $props.id();
  const scope: DetailWorkspaceScope = $derived(definedOptions({
    resourceName,
    recordId,
    meta: adminContext.getProviderMeta(resourceName, { recordId }),
  }));

  const parentRead = useCan(() => ({
    resource: resourceName,
    action: 'show',
    id: recordId,
    queryOptions: { enabled: sections.audit === undefined && Boolean(adminContext.auditLogProvider) },
  }));
  const auditDenied = $derived(
    sections.audit === undefined
      && Boolean(adminContext.auditLogProvider)
      && !parentRead.isLoading
      && parentRead.allowed !== true,
  );

  // Keep one provider identity so a parent-record permission refresh does not relaunch the audit read.
  const defaultAuditSection: AsyncSectionConfig<AuditEntry[]> = {
    provider: {
      load: ({ resourceName, recordId, meta }) => {
        const transport = adminContext.auditLogProvider;
        if (!transport) return Promise.reject(new Error('AuditLogProvider is not configured'));
        return withValidatedAuditProvider(transport).get(definedOptions({
          resource: resourceName,
          meta: meta ?? adminContext.getProviderMeta(resourceName, { recordId }),
        }));
      },
    },
  };

  const auditSection = $derived.by((): AsyncSectionConfig<AuditEntry[]> | Snippet<[DetailWorkspaceScope]> | undefined => {
    if (sections.audit) return sections.audit;
    if (parentRead.allowed !== true) return undefined;
    if (!adminContext.auditLogProvider) return undefined;
    return defaultAuditSection;
  });

  function auditItems(entries: AuditEntry[]): TimelineItem[] {
    return entries.map((entry, index) => ({
      id: String(entry.id ?? `${entry.timestamp}:${index}`),
      title: entry.action,
      ...(entry.userId ? { description: `${i18n.t('audit.actorPrefix')}${entry.userId}` } : {}),
      timestamp: entry.timestamp,
      status: entry.outcome === 'failure' ? 'danger' as const : 'info' as const,
      ...(entry.resource ? { tag: entry.resource } : {}),
    }));
  }

  function attachmentSection() {
    const section = sections.attachments;
    if (!section) return undefined;
    if (isDetailWorkspaceSnippet(section)) return { snippet: section };
    return { async: section };
  }
  function activitySection() {
    const section = sections.activity;
    if (!section) return undefined;
    if (isDetailWorkspaceSnippet(section)) return { snippet: section };
    return { async: section };
  }
  function versionSection() {
    const section = sections.versions;
    if (!section) return undefined;
    if (isDetailWorkspaceSnippet(section)) return { snippet: section };
    return { async: section };
  }
  const attachments = $derived(attachmentSection());
  const activity = $derived(activitySection());
  const versions = $derived(versionSection());
</script>

{#snippet scopeUnavailable(name: string)}
  <p data-svadmin-detail-section-unavailable data-svadmin-detail-section-name={name}>
    {i18n.t('detailWorkspace.unavailable')}
  </p>
{/snippet}

{#snippet attachmentRenderer({ data }: DetailWorkspaceScope & { data: FileItem[] })}
  <FileList files={data ?? []} />
{/snippet}

{#snippet activityRenderer({ data }: DetailWorkspaceScope & { data: TimelineItem[] })}
  <AuditTimeline items={data} />
{/snippet}

{#snippet auditRenderer({ data }: DetailWorkspaceScope & { data: AuditEntry[] })}
  <AuditTimeline items={auditItems(data)} />
{/snippet}

{#snippet versionRenderer({ data }: DetailWorkspaceScope & { data: DetailWorkspaceVersionData })}
  <VersionDiffViewer
    oldValue={data.oldValue}
    newValue={data.newValue}
    {...definedOptions({
      oldTitle: data.oldTitle,
      newTitle: data.newTitle,
      fieldLabels: data.fieldLabels,
    })}
  />
{/snippet}

{#key `${resourceName}:${recordId}`}
  <div
    data-svadmin-detail-workspace
    data-svadmin-detail-resource={resourceName}
    data-svadmin-detail-record={String(recordId)}
  >
    <section data-svadmin-detail-section="relations" aria-labelledby="{instanceId}-detail-workspace-relations">
      <h3 id="{instanceId}-detail-workspace-relations">{i18n.t('detailWorkspace.relations')}</h3>
      {#if sections.relations}
        {@render sections.relations(scope)}
      {:else}
        {@render scopeUnavailable('relations')}
      {/if}
    </section>

    <section data-svadmin-detail-section="attachments" aria-labelledby="{instanceId}-detail-workspace-attachments">
      <h3 id="{instanceId}-detail-workspace-attachments">{i18n.t('detailWorkspace.attachments')}</h3>
      {#if attachments?.async}
        <DetailWorkspaceAsyncSection
          provider={attachments.async.provider}
          {resourceName}
          {recordId}
          render={attachments.async.render ?? attachmentRenderer}
          empty={attachments.async.empty}
          emptyTitle={attachments.async.emptyTitle}
          errorTitle={attachments.async.errorTitle}
        />
      {:else if attachments?.snippet}
        {@render attachments.snippet(scope)}
      {:else}
        {@render scopeUnavailable('attachments')}
      {/if}
    </section>

    <section data-svadmin-detail-section="activity" aria-labelledby="{instanceId}-detail-workspace-activity">
      <h3 id="{instanceId}-detail-workspace-activity">{i18n.t('detailWorkspace.activity')}</h3>
      {#if activity?.async}
        <DetailWorkspaceAsyncSection
          provider={activity.async.provider}
          {resourceName}
          {recordId}
          render={activity.async.render ?? activityRenderer}
          empty={activity.async.empty}
          emptyTitle={activity.async.emptyTitle}
          errorTitle={activity.async.errorTitle}
        />
      {:else if activity?.snippet}
        {@render activity.snippet(scope)}
      {:else}
        {@render scopeUnavailable('activity')}
      {/if}
    </section>

    <section data-svadmin-detail-section="audit" aria-labelledby="{instanceId}-detail-workspace-audit">
      <h3 id="{instanceId}-detail-workspace-audit">{i18n.t('detailWorkspace.audit')}</h3>
      {#if auditDenied}
        <p data-svadmin-detail-section-denied>{i18n.t('common.accessDenied')}</p>
      {:else if !sections.audit && adminContext.auditLogProvider && parentRead.isLoading}
        <div role="status" aria-live="polite" data-svadmin-detail-section-loading>
          {i18n.t('detailWorkspace.loading')}
        </div>
      {:else if auditSection && typeof auditSection !== 'function'}
        <DetailWorkspaceAsyncSection
          provider={auditSection.provider}
          {resourceName}
          {recordId}
          render={auditSection.render ?? auditRenderer}
          empty={auditSection.empty}
          emptyTitle={auditSection.emptyTitle}
          errorTitle={auditSection.errorTitle}
        />
      {:else if auditSection}
        {@render auditSection(scope)}
      {:else}
        {@render scopeUnavailable('audit')}
      {/if}
    </section>

    <section data-svadmin-detail-section="versions" aria-labelledby="{instanceId}-detail-workspace-versions">
      <h3 id="{instanceId}-detail-workspace-versions">{i18n.t('detailWorkspace.versions')}</h3>
      {#if versions?.async}
        <DetailWorkspaceAsyncSection
          provider={versions.async.provider}
          {resourceName}
          {recordId}
          render={versions.async.render ?? versionRenderer}
          empty={versions.async.empty}
          emptyTitle={versions.async.emptyTitle}
          errorTitle={versions.async.errorTitle}
        />
      {:else if versions?.snippet}
        {@render versions.snippet(scope)}
      {:else}
        {@render scopeUnavailable('versions')}
      {/if}
    </section>
  </div>
{/key}
