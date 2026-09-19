<script lang="ts">
  import { Input } from './ui/input/index.js';
  import { cn } from '../utils.js';

  export type NumericInputMode = 'number' | 'currency' | 'percent';

  interface Props {
    value?: number | null;
    mode?: NumericInputMode;
    currency?: string;
    scale?: '100' | '1';
    min?: number;
    max?: number;
    step?: number;
    precision?: number;
    id?: string;
    name?: string;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    invalid?: boolean;
    describedby?: string;
    class?: string;
    onchange?: (value: number | null) => void;
  }

  let {
    value = $bindable(null),
    mode = 'number',
    currency,
    scale = '100',
    min,
    max,
    step,
    precision,
    id,
    name,
    placeholder,
    disabled = false,
    required = false,
    invalid = false,
    describedby,
    class: className = '',
    onchange,
  }: Props = $props();

  const normalizedPrecision = $derived(
    precision == null || !Number.isFinite(precision)
      ? undefined
      : Math.min(20, Math.max(0, Math.trunc(precision))),
  );

  const displayValue = $derived.by(() => {
    if (value == null) return '';
    const displayed = mode === 'percent' && scale === '1' ? value * 100 : value;
    return normalizedPrecision === undefined ? String(displayed) : displayed.toFixed(normalizedPrecision);
  });

  const displayMin = $derived(mode === 'percent' && scale === '1' && min != null ? min * 100 : min);
  const displayMax = $derived(mode === 'percent' && scale === '1' && max != null ? max * 100 : max);
  const resolvedStep = $derived(
    mode === 'percent' && scale === '1'
      ? step == null ? 1 : step * 100
      : step ?? (normalizedPrecision === undefined ? 'any' : 10 ** -normalizedPrecision),
  );

  function clamp(next: number): number {
    return Math.min(max ?? next, Math.max(min ?? next, next));
  }

  function handleInput(event: Event): void {
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement)) return;
    if (input.value === '') {
      value = null;
      onchange?.(null);
      return;
    }
    const parsed = Number(input.value);
    if (!Number.isFinite(parsed)) return;
    const stored = mode === 'percent' && scale === '1' ? parsed / 100 : parsed;
    const next = clamp(stored);
    value = next;
    onchange?.(next);
  }
</script>

<div class={cn('svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc', className)} data-numeric-input={mode}>
  {#if mode === 'currency' && currency}
    <span class="svadmin-u-bfa603190748 svadmin-u-012fbd121f37" aria-hidden="true">{currency}</span>
  {/if}
  <Input
    {id}
    {name}
    type="number"
    value={displayValue}
    min={displayMin}
    max={displayMax}
    step={resolvedStep}
    {placeholder}
    {disabled}
    {required}
    aria-invalid={invalid || undefined}
    aria-describedby={describedby}
    oninput={handleInput}
  />
  {#if mode === 'percent'}
    <span class="svadmin-u-bfa603190748 svadmin-u-012fbd121f37" aria-hidden="true">%</span>
  {/if}
</div>
