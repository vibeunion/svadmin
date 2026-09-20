<script lang="ts" generics="T extends string">
  import { cn } from '../utils.js';

  export interface RadioGroupOption<T extends string = string> {
    value: T;
    label: string;
    description?: string;
    disabled?: boolean;
  }

  interface Props<T extends string = string> {
    options: readonly RadioGroupOption<T>[];
    value?: T | null;
    name?: string;
    legend?: string;
    ariaLabel?: string;
    disabled?: boolean;
    required?: boolean;
    invalid?: boolean;
    describedby?: string;
    class?: string;
    onchange?: (value: T) => void;
  }

  let {
    options,
    value = $bindable(null),
    name,
    legend,
    ariaLabel,
    disabled = false,
    required = false,
    invalid = false,
    describedby,
    class: className = '',
    onchange,
  }: Props<T> = $props();

  function select(option: RadioGroupOption<T>): void {
    if (disabled || option.disabled) return;
    if (value !== option.value) {
      value = option.value;
      onchange?.(option.value);
    }
  }
</script>

  <fieldset
    class={cn('svadmin-radio-group', className)}
    disabled={disabled}
  data-invalid={invalid ? 'true' : undefined}
  aria-describedby={describedby}
  aria-label={legend ? undefined : ariaLabel}
>
  {#if legend}<legend>{legend}</legend>{/if}
  <div class="svadmin-radio-group__options">
    {#each options as option (option.value)}
      {@const inputId = `${name ?? 'radio'}-${option.value}`}
      <label class="svadmin-radio-group__option" class:svadmin-radio-group__option--disabled={disabled || option.disabled} for={inputId}>
        <input
          id={inputId}
          type="radio"
          {name}
          value={option.value}
          checked={value === option.value}
          disabled={disabled || option.disabled}
          required={required}
          aria-describedby={describedby}
          onchange={() => select(option)}
        />
        <span class="svadmin-radio-group__copy">
          <span>{option.label}</span>
          {#if option.description}<small>{option.description}</small>{/if}
        </span>
      </label>
    {/each}
  </div>
</fieldset>

<style>
  .svadmin-radio-group {
    min-inline-size: 0;
    border: 0;
    padding: 0;
    margin: 0;
  }

  .svadmin-radio-group legend {
    padding: 0;
    margin-block-end: 8px;
    color: var(--foreground);
    font-weight: 600;
  }

  .svadmin-radio-group__options {
    display: grid;
    gap: 8px;
  }

  .svadmin-radio-group__option {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    min-block-size: 32px;
    cursor: pointer;
  }

  .svadmin-radio-group__option--disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .svadmin-radio-group__copy {
    display: grid;
    gap: 2px;
  }

  .svadmin-radio-group__copy small {
    color: var(--muted-foreground);
  }
</style>
