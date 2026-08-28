<script lang="ts">
  import type { ResourceDefinition } from "@svadmin/core";
  import { t } from "@svadmin/core/i18n";
  import LiteForm from "../LiteForm.svelte";
  import LiteBreadcrumbs from "../LiteBreadcrumbs.svelte";
  import LiteListButton from "../buttons/LiteListButton.svelte";

  interface Props {
    resource: ResourceDefinition;
    errors?: Record<string, string[]>;
    values?: Record<string, unknown>;
    basePath?: string;
  }

  let {
    resource,
    errors = {},
    values = {},
    basePath = "/lite",
  }: Props = $props();
</script>

<div class="lite-page">
  <LiteBreadcrumbs
    items={[
      { label: t("common.dashboard") || "Dashboard", href: basePath },
      { label: resource.label || resource.name, href: `${basePath}/${resource.name}` },
      { label: t("common.create") || "Create" },
    ]}
  />

  <div class="lite-page-header">
    <h1 class="lite-page-title">{t("common.create") || "Create"} {resource.label || resource.name}</h1>
    <div class="lite-page-actions">
      <LiteListButton resource={resource.name} {basePath} />
    </div>
  </div>

  <LiteForm
    fields={resource.fields}
    mode="create"
    {resource}
    {errors}
    {values}
    action="?/create"
    cancelUrl={`${basePath}/${resource.name}`}
  />
</div>
