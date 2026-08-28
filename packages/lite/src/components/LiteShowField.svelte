<script lang="ts">
  /**
   * LiteShowField — SSR-compatible field renderer for detail views.
   * Renders a single field value based on its type definition.
  */
  import type { FieldDefinition } from '@svadmin/core';
  import { toSafeHref, toSafeText } from '../security';
  import { isExplicitBooleanTrue } from '../value-normalization';
  import LiteMediaThumbnail from './LiteMediaThumbnail.svelte';

  interface Props {
    field: FieldDefinition;
    value: unknown;
  }

  let { field, value }: Props = $props();

  function formatValue(v: unknown, f: FieldDefinition): string {
    if (v == null || v === '') return '—';
    if (f.type === 'date') {
      try { return new Date(v as string).toLocaleString(); } catch { return String(v); }
    }
    if (f.type === 'daterange') {
      if (Array.isArray(v)) {
        const [start, end] = v;
        const s = start ? new Date(start as string).toLocaleDateString() : '—';
        const e = end ? new Date(end as string).toLocaleDateString() : '—';
        return `${s} ~ ${e}`;
      }
      if (typeof v === 'object' && v !== null) {
        const obj = v as Record<string, unknown>;
        const start = obj.start ?? obj.from;
        const end = obj.end ?? obj.to;
        const s = start ? new Date(start as string).toLocaleDateString() : '—';
        const e = end ? new Date(end as string).toLocaleDateString() : '—';
        return `${s} ~ ${e}`;
      }
      return String(v);
    }
    if (f.type === 'currency') {
      const num = typeof v === 'number' ? v : Number(String(v).replace(/^[$€£¥]/, ''));
      if (Number.isFinite(num)) {
        try {
          return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
        } catch {
          return `$${num.toFixed(2)}`;
        }
      }
      return String(v);
    }
    if (f.type === 'percent') {
      const num = typeof v === 'number' ? v : Number(String(v).replace(/%$/, ''));
      if (Number.isFinite(num)) {
        return `${num.toFixed(1)}%`;
      }
      return String(v);
    }
    if (f.type === 'rating') {
      const num = typeof v === 'number' ? v : Number(v);
      if (Number.isFinite(num)) {
        const full = Math.floor(Math.max(0, Math.min(5, num)));
        return '★'.repeat(full) + '☆'.repeat(5 - full) + ` (${num})`;
      }
      return String(v);
    }
    if (f.type === 'select' && f.options) {
      const opt = f.options.find(o => String(o.value) === String(v));
      return opt?.label ?? String(v);
    }
    if (f.type === 'url' || f.type === 'email' || f.type === 'phone') return String(v);
    if (Array.isArray(v)) return v.join(', ');
    if (typeof v === 'object') {
      try { return JSON.stringify(v, null, 2); } catch { return String(v); }
    }
    return String(v);
  }
</script>

{#if field.type === 'boolean'}
  {@const checked = isExplicitBooleanTrue(value)}
  <span class="lite-bool {checked ? 'lite-bool-true' : ''}"></span>
  {checked ? '✓ Yes' : '✗ No'}
{:else if field.type === 'url' && value}
  {@const href = toSafeHref(value)}
  {#if href}
    <a {href} target="_blank" rel="noopener noreferrer">{toSafeText(value)}</a>
  {:else}
    {toSafeText(value)}
  {/if}
{:else if field.type === 'email' && value}
  {@const href = toSafeHref(`mailto:${toSafeText(value)}`)}
  {#if href}
    <a {href}>{toSafeText(value)}</a>
  {:else}
    {toSafeText(value)}
  {/if}
{:else if field.type === 'phone' && value}
  {@const phoneStr = toSafeText(value)}
  {@const tel = phoneStr.replace(/[\s().-]/g, '')}
  {#if /^\+?\d+$/.test(tel)}
    <a href="tel:{tel}" class="lite-phone-link">{phoneStr}</a>
  {:else}
    {phoneStr}
  {/if}
{:else if (field.type === 'image' || field.type === 'images') && value}
  {#if Array.isArray(value)}
    <div class="lite-inline-md lite-flex-wrap">
      {#each value as imgUrl, _i (_i)}
        <LiteMediaThumbnail src={String(imgUrl)} alt={field.label} height={120} />
      {/each}
    </div>
  {:else}
    <LiteMediaThumbnail src={String(value)} alt={field.label} height={200} />
  {/if}
{:else if field.type === 'tags' && Array.isArray(value)}
  <div class="lite-inline-xs lite-flex-wrap">
    {#each value as tag, _i (_i)}
      <span class="lite-badge">{tag}</span>
    {/each}
  </div>
{:else if (field.type === 'json' || field.type === 'code') && value}
  <pre class="lite-code">{typeof value === 'string' ? value : JSON.stringify(value, null, 2)}</pre>
{:else if field.type === 'avatar' && value}
  {@const src = typeof value === 'object' && value !== null ? (value as Record<string, unknown>).src : String(value)}
  {@const name = typeof value === 'object' && value !== null ? String((value as Record<string, unknown>).name ?? '') : ''}
  <div class="lite-avatar lite-avatar-circle">
    {#if src && typeof src === 'string' && (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/'))}
      <img src={src} alt={name || 'Avatar'} class="lite-avatar-img" />
    {:else}
      <span class="lite-avatar-text">{name ? name.slice(0, 2).toUpperCase() : String(value).slice(0, 2).toUpperCase()}</span>
    {/if}
  </div>
{:else if field.type === 'rating' && value != null}
  {@const num = typeof value === 'number' ? value : Number(value)}
  {#if Number.isFinite(num)}
    {@const clamped = Math.max(0, Math.min(5, Math.floor(num)))}
    <span class="lite-rating" role="img" aria-label="{num} out of 5">
      <span class="lite-rating-stars">{'★'.repeat(clamped)}{'☆'.repeat(5 - clamped)}</span>
      <span class="lite-rating-val">({num})</span>
    </span>
  {:else}
    {formatValue(value, field)}
  {/if}
{:else if field.type === 'currency' && value != null}
  <span class="lite-currency">{formatValue(value, field)}</span>
{:else if field.type === 'percent' && value != null}
  <span class="lite-percent">{formatValue(value, field)}</span>
{:else}
  {formatValue(value, field)}
{/if}
