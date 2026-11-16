<script lang="ts">
  import { cn } from '../utils.js';

  interface Props {
    value?: number;
    min?: number;
    max?: number;
    step?: number;
    id?: string;
    name?: string;
    disabled?: boolean;
    required?: boolean;
    invalid?: boolean;
    describedby?: string;
    ariaLabel?: string;
    showValue?: boolean;
    marks?: Record<number, string>;
    class?: string;
    onchange?: (value: number) => void;
  }

  let {
    value = $bindable(0),
    min = 0,
    max = 100,
    step = 1,
    id,
    name,
    disabled = false,
    required = false,
    invalid = false,
    describedby,
    ariaLabel,
    showValue = false,
    marks,
    class: className = '',
    onchange,
  }: Props = $props();

  const boundsValid = $derived(
    Number.isFinite(min) && Number.isFinite(max) && min < max
      && Number.isFinite(step) && step > 0,
  );
  const normalizedValue = $derived(
    boundsValid ? Math.min(max, Math.max(min, Number.isFinite(value) ? value : min)) : min,
  );

  function handleInput(event: Event): void {
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement) || disabled || !boundsValid) return;
    const next = Number(input.value);
    if (!Number.isFinite(next)) return;
    value = next;
    onchange?.(next);
  }
</script>

<div class={cn('svadmin-slider', className)} data-invalid={invalid ? 'true' : undefined}>
  <div class="svadmin-slider__control">
    <input
      {id}
      {name}
      type="range"
      value={normalizedValue}
      {min}
      {max}
      {step}
      {disabled}
      {required}
      aria-label={ariaLabel}
      aria-invalid={invalid || undefined}
      aria-describedby={describedby}
      aria-valuetext={showValue ? String(normalizedValue) : undefined}
      oninput={handleInput}
    />
    {#if showValue}<output for={id}>{normalizedValue}</output>{/if}
  </div>
  {#if marks && Object.keys(marks).length > 0}
    <div data-slot="slider-marks">
      {#each Object.entries(marks) as [markVal, label] (markVal)}
        {@const valNum = Number(markVal)}
        {@const pct = boundsValid ? Math.min(100, Math.max(0, ((valNum - min) / (max - min)) * 100)) : 0}
        <button
          type="button"
          class="svadmin-slider__mark"
          style={`left: ${pct}%;`}
          disabled={disabled}
          onclick={() => { if (!disabled) { value = valNum; onchange?.(valNum); } }}
        >
          {label}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .svadmin-slider {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
    inline-size: 100%;
  }

  .svadmin-slider__control {
    display: flex;
    align-items: center;
    gap: 8px;
    inline-size: 100%;
  }

  .svadmin-slider input {
    min-inline-size: 0;
    flex: 1 1 auto;
    accent-color: var(--primary);
  }

  .svadmin-slider output {
    min-inline-size: 3ch;
    color: var(--muted-foreground);
    text-align: end;
    font-variant-numeric: tabular-nums;
  }

  .svadmin-slider[data-invalid='true'] input {
    accent-color: var(--destructive);
  }
</style>
