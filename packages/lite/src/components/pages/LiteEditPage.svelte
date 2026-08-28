<script lang="ts">
  import type { ResourceDefinition } from "@svadmin/core";
  import { t } from "@svadmin/core/i18n";
  import LiteForm from "../LiteForm.svelte";
  import LiteBreadcrumbs from "../LiteBreadcrumbs.svelte";
  import LiteListButton from "../buttons/LiteListButton.svelte";
  import LiteShowButton from "../buttons/LiteShowButton.svelte";
  import LiteDeleteButton from "../buttons/LiteDeleteButton.svelte";

  interface Props {
    resource: ResourceDefinition;
    record: Record<string, unknown>;
    errors?: Record<string, string[]>;
    basePath?: string;
    canDelete?: boolean;
    canShow?: boolean;
  }

  let {
    resource,
    record,
    errors = {},
    basePath = "/lite",
    canDelete,
    canShow,
  }: Props = $props();

  let pk = $derived(resource.primaryKey ?? "id");
  let idStr = $derived(String(record[pk]));
  const showDelete = $derived(canDelete ?? resource.canDelete !== false);
  const showView = $derived(canShow ?? resource.canShow !== false);
</script>

<div class="lite-page">
  <LiteBreadcrumbs
    items={[
      { label: t("common.dashboard") || "Dashboard", href: basePath },
      { label: resource.label || resource.name, href: `${basePath}/${resource.name}` },
      { label: `${t("common.edit") || "Edit"} #${idStr}` },
    ]}
  />

  <div class="lite-page-header">
    <h1 class="lite-page-title">{t("common.edit") || "Edit"} {resource.label || resource.name} #{idStr}</h1>
    <div class="lite-page-actions">
      {#if showView}
        <LiteShowButton resource={resource.name} recordItemId={idStr} {basePath} />
      {/if}
      <LiteListButton resource={resource.name} {basePath} />
      {#if showDelete}
        <LiteDeleteButton resource={resource.name} recordItemId={idStr} redirectUrl={`${basePath}/${resource.name}`} {basePath} />
      {/if}
    </div>
  </div>

  <LiteForm
    fields={resource.fields}
    mode="edit"
    {resource}
    {errors}
    values={record}
    action="?/update"
    cancelUrl={`${basePath}/${resource.name}`}
  />
</div>
