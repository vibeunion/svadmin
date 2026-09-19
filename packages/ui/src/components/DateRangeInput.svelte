<script lang="ts">
  import DateTimeInput, { type DateTimeInputMode } from './DateTimeInput.svelte';
  import { cn } from '../utils.js';

  export interface DateRangeInputValue {
    start: string | null;
    end: string | null;
  }

  interface Props {
    value?: DateRangeInputValue | null;
    mode?: DateTimeInputMode;
    min?: string;
    max?: string;
    step?: number;
    startId?: string;
    endId?: string;
    startName?: string;
    endName?: string;
    disabled?: boolean;
    required?: boolean;
    invalid?: boolean;
    describedby?: string;
    class?: string;
    onchange?: (value: DateRangeInputValue) => void;
  }

  let {
    value = $bindable({ start: null, end: null }),
    mode = 'date',
    min,
    max,
    step,
    startId,
    endId,
    startName,
    endName,
    disabled = false,
    required = false,
    invalid = false,
    describedby,
    class: className = '',
    onchange,
  }: Props = $props();

  function update(part: 'start' | 'end', next: string | null): void {
    const result = { ...value, [part]: next };
    value = result;
    onchange?.(result);
  }
</script>

<div class={cn('svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-421ac2be5045', className)} data-date-range-input>
  <DateTimeInput
    value={value?.start}
    {mode}
    {min}
    {max}
    {step}
    id={startId}
    name={startName}
    {disabled}
    {required}
    {invalid}
    describedby={describedby}
    onchange={(next) => update('start', next)}
  />
  <span aria-hidden="true">至</span>
  <DateTimeInput
    value={value?.end}
    {mode}
    {min}
    {max}
    {step}
    id={endId}
    name={endName}
    {disabled}
    {required}
    {invalid}
    describedby={describedby}
    onchange={(next) => update('end', next)}
  />
</div>
