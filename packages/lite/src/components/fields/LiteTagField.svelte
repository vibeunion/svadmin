<script lang="ts">
  import type { FieldDefinition } from '@svadmin/core';

  interface Props {
    field: FieldDefinition;
    value?: unknown;
    error?: string[];
    mode?: 'show' | 'edit' | 'create';
    /** Caller class merged with the built-in class list. */
    class?: string;
  }

  let { field, value, error = [], mode = 'show', class: className = '' }: Props = $props();
  let hasError = $derived(error.length > 0);
  const tags = $derived(Array.isArray(value) ? value.map(String) : []);
</script>

{#if mode === 'show'}
  <div class="lite-inline-xs lite-flex-wrap {className}">
    {#each tags as tag, _i (_i)}
      <span class="lite-badge">{tag}</span>
    {:else}
      <span>—</span>
    {/each}
  </div>
{:else}
  <div class="lite-tags-input {className}">
    <!-- SSR 无脚本：每个标签一个同名字段，服务端按 getAll 解析为数组。 -->
    {#each tags as tag, index (index)}
      <label class="lite-tags-input__row">
        <span class="lite-visually-hidden">{field.label ?? 'Tag'} {index + 1}</span>
        <input
          type="text"
          name={field.key}
          value={tag}
          class="lite-input{hasError ? ' lite-input-error' : ''}"
          aria-label={`${field.label ?? 'Tag'} ${index + 1}`}
          placeholder="Remove this tag by clearing the field"
        />
      </label>
    {/each}
    <label class="lite-tags-input__row">
      <span class="lite-visually-hidden">{field.label ?? 'Tag'} (new)</span>
      <input
        type="text"
        name={field.key}
        value=""
        class="lite-input{hasError ? ' lite-input-error' : ''}"
        aria-label={`${field.label ?? 'Tag'} (new)`}
        placeholder="Add a tag"
      />
    </label>
    <span class="lite-tags-input__hint">One tag per field. Leave a field blank to drop it.</span>
    {#if hasError}
      {#each error as err, _i (_i)}
        <div class="lite-error-text">{err}</div>
      {/each}
    {/if}
  </div>
{/if}

<style>
  .lite-tags-input { display: block; }
  .lite-tags-input__row { display: block; margin-bottom: 6px; }
  .lite-tags-input__hint { display: block; margin-top: 4px; color: #6B7280; font-size: 11px; }
  .lite-visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
</style>
