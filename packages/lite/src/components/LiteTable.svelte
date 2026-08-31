<script lang="ts">
  /**
   * LiteTable — Pure HTML table with <a> sort links.
   * No JavaScript required — sorting and pagination are URL-driven.
   */
  import type { ResourceDefinition, FieldDefinition } from "@svadmin/core";
  import { t } from "@svadmin/core/i18n";
  import { isExplicitBooleanTrue, getStatusBadgeClass } from "../value-normalization";
  import { liteFragmentId } from "../fragment-id";

  interface Props {
    records: Record<string, unknown>[];
    resource: ResourceDefinition;
    currentSort?: string;
    currentOrder?: "asc" | "desc";
    currentSearch?: string;
    basePath?: string;
    /** Show edit/delete action buttons */
    canShow?: boolean;
    canEdit?: boolean;
    canDelete?: boolean;
    enableBatch?: boolean;
    /** One field key per edge; left is ignored while batch selection is active. */
    stickyColumns?: { left?: string; right?: string };
    /** Pin actions on the right; this takes precedence over stickyColumns.right. */
    stickyActions?: boolean;
  }

  let {
    records,
    resource,
    currentSort,
    currentOrder = "asc",
    currentSearch,
    basePath = "/lite",
    canShow,
    canEdit,
    canDelete,
    enableBatch = false,
    stickyColumns = {},
    stickyActions = false,
  }: Props = $props();

  const tableId = $props.id();

  let pk = $derived(resource.primaryKey ?? "id");
  const showView = $derived(canShow ?? resource.canShow !== false);
  const showEdit = $derived(canEdit ?? resource.canEdit !== false);
  const showDelete = $derived(canDelete ?? resource.canDelete !== false);
  const showBatch = $derived(enableBatch && showDelete);
  const listFields = $derived(
    resource.fields.filter(f => f.showInList !== false)
  );
  const stickyLeft = $derived(showBatch ? undefined : stickyColumns.left);
  const stickyRight = $derived(stickyActions ? undefined : stickyColumns.right);

  function sortUrl(field: FieldDefinition): string {
    const newOrder = currentSort === field.key && currentOrder === "asc" ? "desc" : "asc";
    const params = new URLSearchParams({ sort: field.key, order: newOrder });
    if (currentSearch) params.set("q", currentSearch);
    return "?" + params.toString();
  }

  function sortIndicator(field: FieldDefinition): string {
    if (currentSort !== field.key) return "⇅";
    return currentOrder === "asc" ? "↑" : "↓";
  }

  function toggleAll(e: Event) {
    const target = e.target as HTMLInputElement | null;
    if (typeof document !== "undefined" && target) {
      const checkboxes = document.querySelectorAll("input[name=ids]");
      checkboxes.forEach((cb) => {
        (cb as HTMLInputElement).checked = target.checked;
      });
    }
  }

  function formatValue(value: unknown, field: FieldDefinition): string {
    if (value == null) return "—";
    if (field.type === "boolean") return "";
    if (field.type === "date") {
      try { return new Date(value as string).toLocaleDateString(); } catch { return String(value); }
    }
    if (field.type === "select" && field.options) {
      const opt = field.options.find(o => String(o.value) === String(value));
      return opt?.label ?? String(value);
    }
    if (field.type === "relation" && typeof value === "object" && value !== null) {
      return String((value as Record<string, unknown>)[field.optionLabel ?? "name"] ?? (value as Record<string, unknown>)[field.optionValue ?? "id"] ?? value);
    }
    if (Array.isArray(value)) return value.join(", ");
    return String(value);
  }
</script>

{#if showBatch}
  <form id={"batch-delete-" + tableId} method="POST" action="?/batchDelete" style="display:none;"></form>
{/if}

<table class="lite-table">
  <thead>
    <tr>
      {#if showBatch}
        <th style="width: 36px; text-align: center;">
          <input
            type="checkbox"
            title="Select all"
            onchange={toggleAll}
          />
        </th>
      {/if}
      {#each listFields as field, _i (_i)}
        <th class={stickyLeft === field.key ? 'lite-table-sticky-left' : stickyRight === field.key ? 'lite-table-sticky-right' : undefined} data-sticky={stickyLeft === field.key ? 'left' : stickyRight === field.key ? 'right' : undefined}>
          {#if field.sortable !== false}
            <a href={sortUrl(field)}>
              {field.label}
              <span class="sort-indicator">{sortIndicator(field)}</span>
            </a>
          {:else}
            {field.label}
          {/if}
        </th>
      {/each}
      {#if showView || showEdit || showDelete}
        <th class={stickyActions ? 'lite-table-sticky-right' : undefined} data-sticky={stickyActions ? 'right' : undefined} style="text-align:right;">{t("common.actions") || "Actions"}</th>
      {/if}
    </tr>
  </thead>
  <tbody>
    {#each records as record, _i (_i)}
      {@const id = record[pk]}
      <tr>
        {#if showBatch}
          <td style="text-align: center;">
            <input type="checkbox" name="ids" value={String(id)} form={"batch-delete-" + tableId} />
          </td>
        {/if}
        {#each listFields as field, _i (_i)}
          <td class={stickyLeft === field.key ? 'lite-table-sticky-left' : stickyRight === field.key ? 'lite-table-sticky-right' : undefined} data-sticky={stickyLeft === field.key ? 'left' : stickyRight === field.key ? 'right' : undefined}>
            {#if field.type === "boolean"}
              <span class="lite-bool {isExplicitBooleanTrue(record[field.key]) ? "lite-bool-true" : ""}"></span>
            {:else if field.type === "tags" && Array.isArray(record[field.key])}
              {#each (record[field.key] as string[]).slice(0, 3) as tag, _i (_i)}
                <span class="lite-badge">{tag}</span>
              {/each}
            {:else if field.type === "select" && field.options}
              <span class={getStatusBadgeClass(record[field.key])}>{formatValue(record[field.key], field)}</span>
            {:else if field.type === "relation" && field.resource && record[field.key] != null}
              <a href={basePath + "/" + field.resource + "/show/" + record[field.key]} class="lite-badge lite-badge-info">
                {formatValue(record[field.key], field)}
              </a>
            {:else}
              {formatValue(record[field.key], field)}
            {/if}
          </td>
        {/each}
        {#if showView || showEdit || showDelete}
          <td class={'actions' + (stickyActions ? ' lite-table-sticky-right' : '')} data-sticky={stickyActions ? 'right' : undefined}>
            {#if showView}
              <a href={basePath + "/" + resource.name + "/show/" + id} class="lite-btn lite-btn-sm">{t("common.show") || "Show"}</a>
            {/if}
            {#if showEdit}
              <a href={basePath + "/" + resource.name + "/edit/" + id} class="lite-btn lite-btn-sm">{t("common.edit") || "Edit"}</a>
            {/if}
            {#if showDelete}
              {@const confirmationId = liteFragmentId("delete", tableId, resource.name, String(id))}
              {@const confirmationTitleId = confirmationId + "-title"}
              <div class="lite-confirm">
                <span id={confirmationId + "-closed"} class="lite-confirm-cancel-target" aria-hidden="true"></span>
                <a
                  href={"#" + confirmationId}
                  class="lite-btn lite-btn-sm lite-btn-danger"
                  aria-controls={confirmationId}
                  aria-haspopup="dialog"
                >{t("common.delete") || "Delete"}</a>
                <div id={confirmationId} class="lite-confirm-panel lite-confirm-target" role="dialog" aria-labelledby={confirmationTitleId} tabindex="-1">
                  <p id={confirmationTitleId} style="margin:0 0 8px;font-size:13px;">{t("common.areYouSure") || "Are you sure?"}</p>
                  <form method="POST" action="?/delete" class="lite-inline-actions">
                    <input type="hidden" name="id" value={String(id)} />
                    <a href={"#" + confirmationId + "-closed"} class="lite-btn lite-btn-sm">{t("common.cancel") || "Cancel"}</a>
                    <button type="submit" class="lite-btn lite-btn-sm lite-btn-danger">{t("common.confirm") || "Confirm"}</button>
                  </form>
                </div>
              </div>
            {/if}
          </td>
        {/if}
      </tr>
    {:else}
      <tr>
        <td colspan={listFields.length + (showView || showEdit || showDelete ? 1 : 0) + (showBatch ? 1 : 0)} style="text-align:center;padding:40px;color:#9ca3af;">
          {t("common.noData") || "No records found."}
        </td>
      </tr>
    {/each}
  </tbody>
</table>

{#if showBatch && records.length > 0}
  <div class="lite-batch-bar">
    <span style="font-size: 13px; color: #64748b;">
      Select items above to perform batch actions
    </span>
    <button
      type="submit"
      form={"batch-delete-" + tableId}
      class="lite-btn lite-btn-sm lite-btn-danger"

    >
      {t("common.delete") || "Delete Selected"}
    </button>
  </div>
{/if}
