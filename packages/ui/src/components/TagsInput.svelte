<script lang="ts">
  import { X, CircleX } from '@lucide/svelte';
  import { cn } from '../utils.js';

  interface Props {
    value?: string[] | undefined;
    name?: string | undefined;
    placeholder?: string | undefined;
    separator?: string | undefined;
    maxItems?: number | undefined;
    maxTagCount?: number | undefined;
    allowClear?: boolean | undefined;
    disabled?: boolean | undefined;
    required?: boolean | undefined;
    invalid?: boolean | undefined;
    describedby?: string | undefined;
    ariaLabel?: string | undefined;
    class?: string | undefined;
    onchange?: ((value: string[]) => void) | undefined;
  }

  let {
    value = $bindable([]),
    name,
    placeholder = 'Add a tag',
    separator = ',',
    maxItems,
    maxTagCount,
    allowClear = false,
    disabled = false,
    required = false,
    invalid = false,
    describedby,
    ariaLabel,
    class: className = '',
    onchange,
  }: Props = $props();

  let draft = $state('');
  let composing = $state(false);
  const displayedTags = $derived(maxTagCount !== undefined && maxTagCount >= 0 ? value.slice(0, maxTagCount) : value);
  const overflowCount = $derived(maxTagCount !== undefined && maxTagCount >= 0 ? Math.max(0, value.length - maxTagCount) : 0);

  function normalized(values: readonly string[]): string[] {
    return [...new Set(values.map(item => item.trim()).filter(Boolean))];
  }

  function update(next: string[]): void {
    const result = normalized(next);
    value = result;
    onchange?.(result);
  }

  function add(raw: string): void {
    if (disabled) return;
    const candidates = raw.split(separator).map(item => item.trim()).filter(Boolean);
    if (candidates.length === 0) return;
    const available = maxItems === undefined ? candidates : candidates.slice(0, Math.max(0, maxItems - value.length));
    update([...value, ...available]);
    draft = '';
  }

  function clearAll(): void {
    if (disabled) return;
    update([]);
  }

  function remove(index: number): void {
    if (disabled) return;
    update(value.filter((_, itemIndex) => itemIndex !== index));
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (disabled || composing) return;
    if (event.key === 'Enter' || event.key === separator) {
      event.preventDefault();
      add(draft);
    } else if (event.key === 'Backspace' && draft === '' && value.length > 0) {
      event.preventDefault();
      remove(value.length - 1);
    }
  }
</script>

<div
  class={cn('svadmin-tags-input', className)}
  data-invalid={invalid ? 'true' : undefined}
  data-disabled={disabled ? 'true' : undefined}
>
  {#if name}
    {#each value as tag (tag)}
      <input type="hidden" {name} value={tag} {disabled} />
    {/each}
  {/if}
  {#each displayedTags as tag, index (tag)}
    <span class="svadmin-tags-input__tag">
      <span>{tag}</span>
      <button
        type="button"
        aria-label={`Remove ${tag}`}
        disabled={disabled}
        onclick={() => remove(index)}
      >
        <X size={12} aria-hidden="true" />
      </button>
    </span>
  {/each}
  {#if overflowCount > 0}
    <span class="svadmin-tags-input__tag svadmin-tags-input__tag--overflow" title={value.slice(maxTagCount).join(", ")}>
      <span>+{overflowCount}</span>
    </span>
  {/if}
  <input
    value={draft}
    {placeholder}
    disabled={disabled || (maxItems !== undefined && value.length >= maxItems)}
    required={required && value.length === 0}
    aria-label={ariaLabel}
    aria-invalid={invalid || undefined}
    aria-describedby={describedby}
    oninput={(event) => { draft = (event.currentTarget as HTMLInputElement).value; }}
    onkeydown={handleKeydown}
    oncompositionstart={() => { composing = true; }}
    oncompositionend={(event) => { composing = false; draft = (event.currentTarget as HTMLInputElement).value; }}
  />
  {#if allowClear && value.length > 0 && !disabled}
    <button
      type="button"
      class="svadmin-tags-input__clear"
      aria-label="Clear all tags"
      onclick={clearAll}
    >
      <CircleX size={12} aria-hidden="true" />
    </button>
  {/if}
</div>

<style>
  .svadmin-tags-input {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    box-sizing: border-box;
    min-block-size: var(--svadmin-control-h);
    padding: 1px 4px;
    border: 1px solid var(--border);
    border-radius: var(--border-radius-small, 2px);
    background: var(--card);
    color: var(--foreground);
    font-size: var(--svadmin-text-body);
  }

  .svadmin-tags-input:focus-within {
    outline: var(--svadmin-focus-width) solid var(--ring);
    outline-offset: var(--svadmin-focus-offset);
  }

  .svadmin-tags-input[data-invalid='true'] {
    border-color: var(--destructive);
  }

  .svadmin-tags-input__tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    box-sizing: border-box;
    max-inline-size: 100%;
    height: 24px;
    padding: 0 4px 0 8px;
    border: 1px solid transparent;
    border-radius: var(--border-radius-small, 2px);
    background: var(--svadmin-fill-2, var(--muted));
    color: var(--foreground);
    font-size: var(--svadmin-text-caption);
    font-weight: 500;
    /* 12px 字号下的官方 22px 行高，避免组件样式里写裸像素字号。 */
    line-height: calc(22 / 12);
  }

  .svadmin-tags-input__tag span {
    overflow-wrap: anywhere;
  }

  .svadmin-tags-input__tag button {
    display: inline-grid;
    place-items: center;
    width: 16px;
    height: 16px;
    min-block-size: 16px;
    min-inline-size: 16px;
    padding: 0;
    border: 0;
    border-radius: var(--border-radius-small, 2px);
    background: transparent;
    color: var(--muted-foreground);
    cursor: pointer;
  }

  .svadmin-tags-input__tag button:hover,
  .svadmin-tags-input__tag button:focus-visible {
    background: var(--accent);
    color: var(--accent-foreground);
  }

  .svadmin-tags-input__clear {
    display: none;
    place-items: center;
    border: 0;
    background: transparent;
    color: var(--color-text-2, var(--muted-foreground));
    font-size: var(--svadmin-text-caption);
    line-height: 1;
    cursor: pointer;
    padding: 0;
  }
  .svadmin-tags-input:hover .svadmin-tags-input__clear,
  .svadmin-tags-input:focus-within .svadmin-tags-input__clear {
    display: inline-grid;
  }
  .svadmin-tags-input__clear:hover {
    color: var(--foreground);
  }
  .svadmin-tags-input__tag--overflow {
    background: var(--secondary);
    color: var(--secondary-foreground);
    padding: 2px 6px;
    font-weight: 500;
  }
  .svadmin-tags-input input {
    min-inline-size: 8rem;
    flex: 1 1 8rem;
    min-block-size: 24px;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--foreground);
    font: inherit;
  }
</style>
