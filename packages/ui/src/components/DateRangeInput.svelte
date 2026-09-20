<script lang="ts">
  import DateTimeInput, { type DateTimeInputMode } from './DateTimeInput.svelte';
  import { cn } from '../utils.js';
  import { useTranslation } from '@svadmin/core/i18n';
  import { dateInputAllowed, dateInputNumber } from '../date-input-policy.js';
  import { Select } from './ui/select/index.js';
  import type { DateInputOptions } from '@svadmin/core';
  import { formatCivilDateTime, parseDateTimeInstant, type DateTimeValueMode, type DateTimeDisambiguation } from '@svadmin/core/date-time';

  export interface DateRangeInputValue {
    start: string | null;
    end: string | null;
  }
  export type DateRangePreset = NonNullable<DateInputOptions['presets']>[number];

  interface Props {
    value?: DateRangeInputValue | null;
    mode?: DateTimeInputMode;
    valueMode?: DateTimeValueMode;
    timeZone?: string;
    disambiguation?: DateTimeDisambiguation;
    min?: string;
    max?: string;
    step?: number;
    disabledDate?: (date: string) => boolean;
    presets?: DateRangePreset[];
    startId?: string;
    endId?: string;
    startName?: string;
    endName?: string;
    disabled?: boolean;
    required?: boolean;
    invalid?: boolean;
    describedby?: string;
    startAriaLabel?: string;
    endAriaLabel?: string;
    class?: string;
    onchange?: (value: DateRangeInputValue) => void;
  }

  let {
    value = $bindable({ start: null, end: null }),
    mode = 'date',
    valueMode = 'civil',
    timeZone,
    disambiguation = 'reject',
    min,
    max,
    step,
    disabledDate,
    presets = [],
    startId,
    endId,
    startName,
    endName,
    disabled = false,
    required = false,
    invalid = false,
    describedby,
    startAriaLabel,
    endAriaLabel,
    class: className = '',
    onchange,
  }: Props = $props();

  const i18n = useTranslation();
  const instantMode = $derived(valueMode === 'instant');
  const startMax = $derived(!instantMode && value?.end && (!max || value.end < max) ? value.end : max);
  const endMin = $derived(!instantMode && value?.start && (!min || value.start > min) ? value.start : min);
  function validInstant(value: string | null | undefined): string | undefined {
    return value && parseDateTimeInstant(value) !== undefined ? value : undefined;
  }

  function presetAllowed(preset: DateRangePreset): boolean {
    const { start, end } = preset.value;
    if (instantMode) {
      if (mode !== 'datetime' || !timeZone) return false;
      const first = parseDateTimeInstant(start);
      const last = parseDateTimeInstant(end);
      if (first === undefined || last === undefined || first > last) return false;
      const firstDraft = formatCivilDateTime(first, timeZone);
      const lastDraft = formatCivilDateTime(last, timeZone);
      return firstDraft !== undefined && lastDraft !== undefined
        && dateInputAllowed(firstDraft, mode, min, max, disabledDate)
        && dateInputAllowed(lastDraft, mode, min, max, disabledDate);
    }
    const first = dateInputNumber(start, mode);
    const last = dateInputNumber(end, mode);
    return first !== undefined && last !== undefined && first <= last
      && dateInputAllowed(start, mode, min, max, disabledDate)
      && dateInputAllowed(end, mode, min, max, disabledDate);
  }

  function choosePreset(event: Event): void {
    const select = event.currentTarget;
    if (!(select instanceof HTMLSelectElement)) return;
    const preset = select.value === '' ? undefined : presets[Number(select.value)];
    select.value = '';
    if (disabled || !preset || !presetAllowed(preset)) return;
    const result = { ...preset.value };
    value = result;
    onchange?.(result);
  }

  function update(part: 'start' | 'end', next: string | null): void {
    const result: DateRangeInputValue = { start: value?.start ?? null, end: value?.end ?? null, [part]: next };
    value = result;
    onchange?.(result);
  }
</script>

<div class={cn('svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-421ac2be5045', className)} data-date-range-input>
  {#if presets.length > 0}
    <Select value="" {disabled} aria-label={i18n.t('dateInput.presets')} onchange={choosePreset}>
      <option value="">{i18n.t('dateInput.presets')}</option>
      {#each presets as preset, index}
        <option value={String(index)} disabled={!presetAllowed(preset)}>{preset.label}</option>
      {/each}
    </Select>
  {/if}
  <DateTimeInput
    value={value?.start ?? null}
    {mode}
    {valueMode}
    {timeZone}
    {disambiguation}
    maxInstant={instantMode ? validInstant(value?.end) : undefined}
    {min}
    max={startMax}
    {step}
    {disabledDate}
    id={startId}
    name={startName}
    {disabled}
    {required}
    {invalid}
    describedby={describedby}
    ariaLabel={startAriaLabel ?? i18n.t('common.startDate')}
    onchange={(next) => update('start', next)}
  />
  <span aria-hidden="true">{i18n.t('dateInput.to')}</span>
  <DateTimeInput
    value={value?.end ?? null}
    {mode}
    {valueMode}
    {timeZone}
    {disambiguation}
    minInstant={instantMode ? validInstant(value?.start) : undefined}
    min={endMin}
    {max}
    {step}
    {disabledDate}
    id={endId}
    name={endName}
    {disabled}
    {required}
    {invalid}
    describedby={describedby}
    ariaLabel={endAriaLabel ?? i18n.t('common.endDate')}
    onchange={(next) => update('end', next)}
  />
</div>
