<script lang="ts">
  import type { ResourceDefinition } from "@svadmin/core";
  import { t } from "@svadmin/core/i18n";
  import LiteTable from "../LiteTable.svelte";
  import LitePagination from "../LitePagination.svelte";
  import LiteBreadcrumbs from "../LiteBreadcrumbs.svelte";
  import LiteCreateButton from "../buttons/LiteCreateButton.svelte";
  import LiteRefreshButton from "../buttons/LiteRefreshButton.svelte";

  interface Props {
    resource: ResourceDefinition;
    records: Record<string, unknown>[];
    total: number;
    pagination: { page: number; perPage: number };
    currentSort?: string;
    currentOrder?: "asc" | "desc";
    currentSearch?: string;
    currentFilters?: Record<string, string>;
    basePath?: string;
    canCreate?: boolean;
    canShow?: boolean;
    canEdit?: boolean;
    canDelete?: boolean;
    enableBatch?: boolean;
  }

  let {
    resource,
    records,
    total,
    pagination,
    currentSort,
    currentOrder = "asc",
    currentSearch,
    currentFilters = {},
    basePath = "/lite",
    canCreate,
    canShow,
    canEdit,
    canDelete,
    enableBatch = true,
  }: Props = $props();

  const showCreate = $derived(canCreate ?? resource.canCreate !== false);
  const showView = $derived(canShow ?? resource.canShow !== false);
  const showEdit = $derived(canEdit ?? resource.canEdit !== false);
  const showDelete = $derived(canDelete ?? resource.canDelete !== false);

  const filterableFields = $derived(
    resource.fields
      .filter((f) => f.type === "select" && f.options && f.options.length > 0 && f.filterable !== false)
      .slice(0, 3)
  );

  const hasActiveFilters = $derived(
    Boolean(currentSearch) || Object.values(currentFilters).some((v) => Boolean(v))
  );
</script>

<div class="lite-page">
  <LiteBreadcrumbs
    items={[
      { label: t("common.dashboard") || "Dashboard", href: basePath },
      { label: resource.label || resource.name },
    ]}
  />

  <div class="lite-page-header">
    <h1 class="lite-page-title">{resource.label || resource.name} {t("common.list") || "List"}</h1>
    <div class="lite-page-actions">
      {#if showCreate}
        <LiteCreateButton resource={resource.name} {basePath} />
      {/if}
      <LiteRefreshButton hideText />
    </div>
  </div>

  <div class="lite-card" style="margin-bottom: 20px;">
    <div style="padding: 16px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
      <form method="GET" class="lite-filter-bar" style="margin: 0;">
        <input
          type="text"
          name="q"
          value={currentSearch ?? ""}
          placeholder={t("common.search") || "Search..."}
          class="lite-input"
          style="width: 200px; display: inline-block;"
        />

        {#each filterableFields as field (field.key)}
          <select
            name={field.key}
            class="lite-select"
            style="width: 150px; display: inline-block;"
          >
            <option value="">All {field.label}</option>
            {#if field.options}
              {#each field.options as opt (opt.value)}
                <option
                  value={String(opt.value)}
                  selected={String(currentFilters[field.key] ?? "") === String(opt.value)}
                >
                  {opt.label}
                </option>
              {/each}
            {/if}
          </select>
        {/each}

        {#if currentSort}
          <input type="hidden" name="sort" value={currentSort} />
        {/if}
        {#if currentOrder}
          <input type="hidden" name="order" value={currentOrder} />
        {/if}

        <button type="submit" class="lite-btn lite-btn-sm lite-btn-primary">
          {t("common.filter") || "Filter"}
        </button>

        {#if hasActiveFilters}
          <a href={basePath + "/" + resource.name} class="lite-btn lite-btn-sm">
            {t("common.reset") || "Reset"}
          </a>
        {/if}
      </form>

      <span style="font-size: 13px; color: #64748b;">
        {t("common.total") || "Total"}: <strong>{total}</strong>
      </span>
    </div>

    <LiteTable
      {records}
      {resource}
      {currentSort}
      {currentOrder}
      {currentSearch}
      {basePath}
      canShow={showView}
      canEdit={showEdit}
      canDelete={showDelete}
      {enableBatch}
    />

    {#if total > pagination.perPage}
      <LitePagination
        page={pagination.page}
        totalPages={Math.ceil(total / pagination.perPage)}
        preserveParams={{
          ...(currentSort ? { sort: currentSort } : {}),
          ...(currentOrder ? { order: currentOrder } : {}),
          ...(currentSearch ? { q: currentSearch } : {}),
          ...currentFilters,
        }}
      />
    {/if}
  </div>
</div>
