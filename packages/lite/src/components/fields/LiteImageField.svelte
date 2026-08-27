<script lang="ts">
  import type { FieldDefinition } from '@svadmin/core';
  import LiteMediaThumbnail from '../LiteMediaThumbnail.svelte';

  interface Props {
    field: FieldDefinition;
    value?: unknown;
    error?: string[];
    mode?: 'show' | 'edit' | 'create';
  }

  let { field, value, error = [], mode = 'show' }: Props = $props();
  let hasError = $derived(error.length > 0);
  
  function getUrls(v: unknown): string[] {
    if (!v) return [];
    if (Array.isArray(v)) return v.map(String);
    if (typeof v === 'string') return [v];
    return [];
  }
</script>

{#if mode === 'show'}
  {@const urls = getUrls(value)}
  <div class="lite-inline-md lite-flex-wrap">
    {#each urls as url, _i (_i)}
      <LiteMediaThumbnail src={url} alt={field.label} height={100} />
    {:else}
      <span>—</span>
    {/each}
  </div>
{:else}
  {@const urls = getUrls(value)}
  <div>
    {#if urls.length > 0}
      <div class="lite-inline-md lite-flex-wrap" style="margin-bottom: 8px;">
        {#each urls as url, _i (_i)}
          <LiteMediaThumbnail src={url} alt="Current" height={60} muted />
        {/each}
      </div>
    {/if}
    {#if field.type === 'images'}
      <textarea
        name={field.key}
        id={field.key}
        class="lite-input {hasError ? 'lite-input-error' : ''}"
        placeholder="One image URL per line"
        required={field.required}
      >{urls.join('\n')}</textarea>
    {:else}
      <input
        type="text"
        name={field.key}
        id={field.key}
        value={urls[0] ?? ''}
        placeholder="https://example.com/image.jpg"
        class="lite-input {hasError ? 'lite-input-error' : ''}"
        required={field.required}
      />
    {/if}
    {#if hasError}
      {#each error as err, _i (_i)}
        <div class="lite-error-text">{err}</div>
      {/each}
    {/if}
  </div>
{/if}
