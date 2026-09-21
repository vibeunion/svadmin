<script lang="ts">
  import { cn } from '../utils.js';

  interface Props {
    value?: string;
    name?: string;
    id?: string;
    disabled?: boolean;
    required?: boolean;
    invalid?: boolean;
    describedby?: string;
    ariaLabel?: string;
    class?: string;
    onchange?: (value: string) => void;
  }

  let {
    value = $bindable(''),
    name,
    id,
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

<input
  class={cn('svadmin-color-picker', className)}
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

<style>
  .svadmin-color-picker {
    display: block;
    inline-size: 40px;
    block-size: 32px;
    padding: 2px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--background);
    cursor: pointer;
  }

  .svadmin-color-picker:focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 2px;
  }

  .svadmin-color-picker:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
</style>
