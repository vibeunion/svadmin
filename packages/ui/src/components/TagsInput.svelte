<script lang="ts">
  import { X } from '@lucide/svelte';
  import { cn } from '../utils.js';

  interface Props {
    value?: string[];
    name?: string;
    placeholder?: string;
    separator?: string;
    maxItems?: number;
    disabled?: boolean;
    required?: boolean;
    invalid?: boolean;
    describedby?: string;
    ariaLabel?: string;
    class?: string;
    onchange?: (value: string[]) => void;
  }

  let {
    value = $bindable([]),
    name,
    placeholder = 'Add a tag',
    separator = ',',
    maxItems,
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
      <input type="hidden" {name} value={tag} />
    {/each}
  {/if}
  {#each value as tag, index (tag)}
    <span class="svadmin-tags-input__tag">
      <span>{tag}</span>
      <button
        type="button"
        aria-label={`Remove ${tag}`}
        disabled={disabled}
        onclick={() => remove(index)}
      >
        <X size={14} aria-hidden="true" />
      </button>
    </span>
  {/each}
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
</div>

<style>
  .svadmin-tags-input {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    min-block-size: 36px;
    padding: 4px 8px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--background);
  }

  .svadmin-tags-input:focus-within {
    outline: 2px solid var(--ring);
    outline-offset: 1px;
  }

  .svadmin-tags-input[data-invalid='true'] {
    border-color: var(--destructive);
  }

  .svadmin-tags-input__tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    max-inline-size: 100%;
    padding: 2px 4px 2px 8px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--muted);
    color: var(--foreground);
  }

  .svadmin-tags-input__tag span {
    overflow-wrap: anywhere;
  }

  .svadmin-tags-input__tag button {
    display: inline-grid;
    place-items: center;
    min-block-size: 24px;
    min-inline-size: 24px;
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: var(--muted-foreground);
    cursor: pointer;
  }

  .svadmin-tags-input__tag button:hover,
  .svadmin-tags-input__tag button:focus-visible {
    background: var(--accent);
    color: var(--accent-foreground);
  }

  .svadmin-tags-input input {
    min-inline-size: 8rem;
    flex: 1 1 8rem;
    min-block-size: 28px;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--foreground);
    font: inherit;
  }
</style>
