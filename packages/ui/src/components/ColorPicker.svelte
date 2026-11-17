<script lang="ts">
  import { cn } from '../utils.js';

  export type ColorPickerSize = 'mini' | 'small' | 'default' | 'large';

  interface Props {
    value?: string | undefined;
    name?: string | undefined;
    id?: string | undefined;
    size?: ColorPickerSize | undefined;
    showText?: boolean | undefined;
    disabled?: boolean | undefined;
    required?: boolean | undefined;
    invalid?: boolean | undefined;
    describedby?: string | undefined;
    ariaLabel?: string | undefined;
    class?: string | undefined;
    onchange?: ((value: string) => void) | undefined;
  }

  let {
    value = $bindable(''),
    name,
    id,
    size = 'default',
    showText = false,
    disabled = false,
    required = false,
    invalid = false,
    describedby,
    ariaLabel,
    class: className = '',
    onchange,
  }: Props = $props();

  function handleInput(event: Event): void {
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement) || disabled) return;
    value = input.value;
    onchange?.(input.value);
  }
</script>

{#if showText}
  <span class={cn('svadmin-color-picker-wrap inline-flex items-center gap-2', className)} data-size={size}>
    <input
      class="svadmin-color-picker"
      data-size={size}
      {id}
      {name}
      type="color"
      value={value}
      {disabled}
      {required}
      aria-label={ariaLabel}
      aria-invalid={invalid || undefined}
      aria-describedby={describedby}
      oninput={handleInput}
    />
    <span class="svadmin-color-picker__text font-mono text-xs text-foreground uppercase">{value || '—'}</span>
  </span>
{:else}
  <input
    class={cn('svadmin-color-picker', className)}
    data-size={size}
    {id}
    {name}
    type="color"
    value={value}
    {disabled}
    {required}
    aria-label={ariaLabel}
    aria-invalid={invalid || undefined}
    aria-describedby={describedby}
    oninput={handleInput}
  />
{/if}

<style>
  .svadmin-color-picker {
    display: block;
    inline-size: 40px;
    block-size: 32px;
    padding: 2px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm, 6px);
    background: var(--background);
    cursor: pointer;
  }

  .svadmin-color-picker[data-size='mini'] {
    inline-size: 28px;
    block-size: 22px;
  }

  .svadmin-color-picker[data-size='small'] {
    inline-size: 32px;
    block-size: 26px;
  }

  .svadmin-color-picker[data-size='large'] {
    inline-size: 48px;
    block-size: 38px;
  }

  .svadmin-color-picker:focus-visible {
    outline: var(--svadmin-focus-width) solid var(--ring);
    outline-offset: var(--svadmin-focus-offset);
  }

  .svadmin-color-picker:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
</style>
