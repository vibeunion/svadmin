<script lang="ts">
  /**
   * LiteShowField — SSR-compatible field renderer for detail views.
   * Renders a single field value based on its type definition.
   */
  import type { FieldDefinition } from "@svadmin/core";
  import { toSafeHref, toSafeText } from "../security";
  import { isExplicitBooleanTrue, getStatusBadgeClass } from "../value-normalization";
  import LiteMediaThumbnail from "./LiteMediaThumbnail.svelte";
  import LiteAvatarField from "./fields/LiteAvatarField.svelte";
  import LiteCurrencyField from "./fields/LiteCurrencyField.svelte";
  import LitePhoneField from "./fields/LitePhoneField.svelte";
  import LiteRatingField from "./fields/LiteRatingField.svelte";
  import LiteCodeField from "./fields/LiteCodeField.svelte";

  interface Props {
    field: FieldDefinition;
    value: unknown;
    basePath?: string;
  }

  let { field, value, basePath = "/lite" }: Props = $props();

  function formatValue(v: unknown, f: FieldDefinition): string {
    if (v == null) return "—";
    if (f.type === "date") {
      try { return new Date(v as string).toLocaleString(); } catch { return String(v); }
    }
    if (f.type === "select" && f.options) {
      const opt = f.options.find(o => String(o.value) === String(v));
      return opt?.label ?? String(v);
    }
    if (f.type === "relation" && typeof v === "object" && v !== null) {
      return String((v as Record<string, unknown>)[f.optionLabel ?? "name"] ?? (v as Record<string, unknown>)[f.optionValue ?? "id"] ?? v);
    }
    if (f.type === "url") return String(v);
    if (f.type === "email") return String(v);
    if (Array.isArray(v)) return v.join(", ");
    if (typeof v === "object") {
      try { return JSON.stringify(v, null, 2); } catch { return String(v); }
    }
    return String(v);
  }
</script>

{#if field.type === "boolean"}
  {@const checked = isExplicitBooleanTrue(value)}
  <span class="lite-bool {checked ? "lite-bool-true" : ""}"></span>
  {checked ? "✓ Yes" : "✗ No"}
{:else if field.type === "avatar"}
  <LiteAvatarField {field} {value} mode="show" />
{:else if field.type === "rating"}
  <LiteRatingField {field} {value} mode="show" />
{:else if field.type === "code"}
  <LiteCodeField {field} {value} mode="show" />
{:else if field.type === "currency"}
  <LiteCurrencyField {field} value={value as string | number | null | undefined} mode="show" />
{:else if field.type === "phone"}
  <LitePhoneField {field} value={value as string | number | null | undefined} mode="show" />
{:else if field.type === "password"}
  <span>••••••••</span>
{:else if field.type === "color" && value}
  <span style="display:inline-flex;align-items:center;">
    <span style="display:inline-block;width:14px;height:14px;border-radius:3px;background:{toSafeText(value)};border:1px solid #cbd5e1;margin-right:6px;"></span>
    <span class="lite-font-mono">{toSafeText(value)}</span>
  </span>
{:else if field.type === "url" && value}
  {@const href = toSafeHref(value)}
  {#if href}
    <a {href} target="_blank" rel="noopener noreferrer">{toSafeText(value)}</a>
  {:else}
    {toSafeText(value)}
  {/if}
{:else if field.type === "email" && value}
  {@const href = toSafeHref(`mailto:${toSafeText(value)}`)}
  {#if href}
    <a {href}>{toSafeText(value)}</a>
  {:else}
    {toSafeText(value)}
  {/if}
{:else if field.type === "image" && value}
  <LiteMediaThumbnail src={String(value)} alt={field.label} height={200} />
{:else if field.type === "tags" && Array.isArray(value)}
  {#each value as tag, _i (_i)}
    <span class="lite-badge">{tag}</span>
  {/each}
{:else if field.type === "json" && value}
  <pre style="margin:0;font-size:12px;background:#f8fafc;padding:12px;border-radius:6px;border:1px solid #e2e8f0;overflow-x:auto;">{typeof value === "string" ? value : JSON.stringify(value, null, 2)}</pre>
{:else if field.type === "select" && field.options}
  <span class={getStatusBadgeClass(value)}>{formatValue(value, field)}</span>
{:else if field.type === "relation" && field.resource && value != null}
  <a href={`${basePath}/${field.resource}/show/${value}`} class="lite-badge lite-badge-info">
    {formatValue(value, field)} &rarr;
  </a>
{:else}
  {formatValue(value, field)}
{/if}
