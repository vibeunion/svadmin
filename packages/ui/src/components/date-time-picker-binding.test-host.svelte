<script lang="ts">
  import DatePicker from './DatePicker.svelte';
  import DateRangePicker from './DateRangePicker.svelte';
  import DateTimePicker from './DateTimePicker.svelte';
  import TimePicker from './TimePicker.svelte';
  import type { DateRangeInputValue } from './DateRangeInput.svelte';

  interface Props {
    instant?: boolean;
    onchange?: (kind: 'date' | 'time' | 'datetime' | 'range', value: string | DateRangeInputValue | null) => void;
  }

  let { instant = false, onchange }: Props = $props();
  let dateValue = $state<string | null>(null);
  let timeValue = $state<string | null>(null);
  let datetimeValue = $state<string | null>(null);
  let rangeValue = $state<DateRangeInputValue | null>(null);
</script>

<DatePicker name="date" ariaLabel="Date" bind:value={dateValue} onchange={value => onchange?.('date', value)} />
<TimePicker name="time" ariaLabel="Time" bind:value={timeValue} onchange={value => onchange?.('time', value)} />
<DateTimePicker
  name="datetime"
  ariaLabel="Date and time"
  valueMode={instant ? 'instant' : 'civil'}
  timeZone="Asia/Shanghai"
  bind:value={datetimeValue}
  onchange={value => onchange?.('datetime', value)}
/>
<DateRangePicker
  startName="period.start"
  endName="period.end"
  startAriaLabel="Range start"
  endAriaLabel="Range end"
  bind:value={rangeValue}
  onchange={value => onchange?.('range', value)}
/>

<button
  type="button"
  onclick={() => {
    dateValue = '2026-09-21';
    timeValue = '09:30';
    datetimeValue = instant ? '2026-09-21T01:30:00.000Z' : '2026-09-21T09:30';
    rangeValue = { start: '2026-09-01', end: '2026-09-21' };
  }}
>
  Set parent values
</button>
<button
  type="button"
  onclick={() => {
    dateValue = null;
    timeValue = null;
    datetimeValue = null;
    rangeValue = null;
  }}
>
  Clear parent values
</button>

<output data-testid="date-value">{dateValue ?? 'null'}</output>
<output data-testid="time-value">{timeValue ?? 'null'}</output>
<output data-testid="datetime-value">{datetimeValue ?? 'null'}</output>
<output data-testid="range-value">{rangeValue === null ? 'null' : JSON.stringify(rangeValue)}</output>
