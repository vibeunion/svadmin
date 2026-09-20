<script lang="ts">
  import { cn } from '../utils.js';

  export interface RangeSliderValue {
    min: number;
    max: number;
  }

  interface Props {
    value?: RangeSliderValue;
    min?: number;
    max?: number;
    step?: number;
    minName?: string;
    maxName?: string;
    disabled?: boolean;
    invalid?: boolean;
    describedby?: string;
    ariaLabel?: string;
    showValue?: boolean;
    class?: string;
    onchange?: (value: RangeSliderValue) => void;
  }

  let {
    value = $bindable({ min: 0, max: 100 }),
    min = 0,
    max = 100,
    step = 1,
    minName,
    maxName,
    disabled = false,
    invalid = false,
    describedby,
    ariaLabel,
    showValue = false,
    class: className = '',
    onchange,
  }: Props = $props();

  const boundsValid = $derived(
    Number.isFinite(min) && Number.isFinite(max) && min < max
      && Number.isFinite(step) && step > 0,
  );
  const lower = $derived(boundsValid ? Math.min(max, Math.max(min, value.min)) : min);
  const upper = $derived(boundsValid ? Math.min(max, Math.max(lower, value.max)) : max);

  function update(part: 'min' | 'max', raw: string): void {
    if (disabled || !boundsValid) return;
    const next = Number(raw);
    if (!Number.isFinite(next)) return;
    const result = part === 'min'
      ? { min: Math.min(next, upper), max: upper }
      : { min: lower, max: Math.max(next, lower) };
    value = result;
    onchange?.(result);
  }
</script>

<div class={cn('svadmin-range-slider', className)} data-invalid={invalid ? 'true' : undefined}>
  {#if minName}<input type="hidden" name={minName} value={lower} />{/if}
  {#if maxName}<input type="hidden" name={maxName} value={upper} />{/if}
  <div class="svadmin-range-slider__tracks">
    <input
      type="range"
      value={lower}
      {min}
      max={upper}
      {step}
      disabled={disabled}
      aria-label={ariaLabel ? `${ariaLabel} minimum` : 'Minimum'}
      aria-invalid={invalid || undefined}
      aria-describedby={describedby}
      oninput={(event) => update('min', (event.currentTarget as HTMLInputElement).value)}
    />
    <input
      type="range"
      value={upper}
      min={lower}
      {max}
      {step}
      disabled={disabled}
      aria-label={ariaLabel ? `${ariaLabel} maximum` : 'Maximum'}
      aria-invalid={invalid || undefined}
      aria-describedby={describedby}
      oninput={(event) => update('max', (event.currentTarget as HTMLInputElement).value)}
    />
  </div>
  {#if showValue}<output>{lower} - {upper}</output>{/if}
</div>

<style>
  .svadmin-range-slider {
    display: flex;
    align-items: center;
    gap: 8px;
    inline-size: 100%;
  }

  .svadmin-range-slider__tracks {
    display: grid;
    flex: 1 1 auto;
    min-inline-size: 0;
  }

  .svadmin-range-slider__tracks input {
    grid-area: 1 / 1;
    inline-size: 100%;
    margin: 0;
    accent-color: var(--primary);
  }

  .svadmin-range-slider__tracks input:last-child {
    pointer-events: none;
  }

  .svadmin-range-slider__tracks input:last-child:focus-visible {
    pointer-events: auto;
  }

  .svadmin-range-slider output {
    min-inline-size: 7ch;
    color: var(--muted-foreground);
    text-align: end;
    font-variant-numeric: tabular-nums;
  }
</style>
