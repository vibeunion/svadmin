<script lang="ts">
  import { definedOptions } from '@svadmin/core/options';
  import NumericInput from './NumericInput.svelte';
  import type { NumericInputLocale } from './numeric-format.js';

  interface Props {
    /** 默认按主单位（元）读写；minorUnits 为 true 时按最小货币单位（分）读写。 */
    value?: number | null;
    minorUnits?: boolean;
    locale?: NumericInputLocale | undefined;
    currency?: string;
    /** 与 value 使用同一单位；minorUnits 为 true 时同样按分传入。 */
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
    describedby?: string | undefined;
    class?: string;
    onchange?: (value: number | null) => void;
  }

  let {
    value = $bindable(null),
    minorUnits = false,
    precision,
    min,
    max,
    step,
    onchange,
    ...props
  }: Props = $props();

  const precisionValue = $derived.by(() => {
    if (precision == null || !Number.isFinite(precision)) return minorUnits ? 2 : undefined;
    return Math.min(20, Math.max(0, Math.trunc(precision)));
  });
  const factor = $derived(10 ** (precisionValue ?? 2));

  function normalizeMinor(next: number | null): number | null {
    if (next == null || !Number.isFinite(next)) return null;
    const minor = Math.round(next * factor);
    return Object.is(minor, -0) ? 0 : minor;
  }

  const displayValue = $derived(
    minorUnits && value != null && Number.isFinite(value) ? value / factor : value,
  );
  const displayMin = $derived(minorUnits && min != null && Number.isFinite(min) ? min / factor : min);
  const displayMax = $derived(minorUnits && max != null && Number.isFinite(max) ? max / factor : max);
  const displayStep = $derived(minorUnits && step != null && Number.isFinite(step) ? step / factor : step);

  function handleChange(next: number | null): void {
    const stored = minorUnits ? normalizeMinor(next) : next;
    value = stored;
    onchange?.(stored);
  }
</script>

<NumericInput
  {...props}
  {...definedOptions({
    value: displayValue,
    mode: 'currency' as const,
    precision: precisionValue,
    min: displayMin,
    max: displayMax,
    step: displayStep,
    onchange: handleChange,
  })}
/>
