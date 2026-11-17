<script lang="ts">
  import { definedOptions } from '@svadmin/core/options';
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
    value?: DateRangeInputValue | null | undefined;
    mode?: DateTimeInputMode | undefined;
    valueMode?: DateTimeValueMode | undefined;
    timeZone?: string | undefined;
    disambiguation?: DateTimeDisambiguation | undefined;
    min?: string | undefined;
    max?: string | undefined;
    step?: number | undefined;
    disabledDate?: ((date: string) => boolean) | undefined;
    presets?: DateRangePreset[] | undefined;
    startId?: string | undefined;
    endId?: string | undefined;
    startName?: string | undefined;
    endName?: string | undefined;
    disabled?: boolean | undefined;
    required?: boolean | undefined;
    invalid?: boolean | undefined;
    describedby?: string | undefined;
    startAriaLabel?: string | undefined;
    endAriaLabel?: string | undefined;
    separator?: string | undefined;
    placeholder?: [string, string] | string | undefined;
    allowClear?: boolean | undefined;
    size?: 'mini' | 'small' | 'default' | 'large' | undefined;
    status?: 'error' | 'warning' | 'normal' | undefined;
    class?: string | undefined;
    defaultValue?: DateRangeInputValue | null | undefined;
    onChange?: ((value: DateRangeInputValue) => void) | undefined;
    onchange?: ((value: DateRangeInputValue) => void) | undefined;
  }

  let {
    value = $bindable({ start: null, end: null }),
    defaultValue,
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
    separator,
    placeholder,
    allowClear = true,
    size = 'default',
    status = 'normal',
    class: className = '',
    onChange,
    onchange,
  }: Props = $props();

  const i18n = useTranslation();
  const resolvedSeparator = $derived(separator ?? i18n.t('dateInput.to'));
  const startPlaceholder = $derived(
    Array.isArray(placeholder) ? placeholder[0] : typeof placeholder === 'string' ? placeholder : undefined
  );
  const endPlaceholder = $derived(
    Array.isArray(placeholder) ? placeholder[1] : typeof placeholder === 'string' ? placeholder : undefined
  );
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

  const emitChange = (result: DateRangeInputValue): void => {
    onchange?.(result);
    onChange?.(result);
  };

  let initialized = false;
  $effect.pre(() => {
    if (initialized) return;
    initialized = true;
    // 宿主显式传 null 时补齐成空范围，避免后续读取崩溃。
    if (value === null || value === undefined) {
      value = { ...(defaultValue ?? { start: null, end: null }) };
      return;
    }
    if (value.start === null && value.end === null && defaultValue !== undefined && defaultValue !== null) {
      value = { ...defaultValue };
    }
  });

  function choosePreset(event: Event): void {
    const select = event.currentTarget;
    if (!(select instanceof HTMLSelectElement)) return;
    const preset = select.value === '' ? undefined : presets[Number(select.value)];
    select.value = '';
    if (disabled || !preset || !presetAllowed(preset)) return;
    const result = { ...preset.value };
    value = result;
    emitChange(result);
  }

  function update(part: 'start' | 'end', next: string | null): void {
    const result: DateRangeInputValue = { start: value?.start ?? null, end: value?.end ?? null, [part]: next };
    value = result;
    emitChange(result);
  }

  function clearRange(): void {
    const result: DateRangeInputValue = { start: null, end: null };
    value = result;
    emitChange(result);
  }
</script>

<div
  class={cn('flex items-center rounded-md', className)}
  data-date-range-input
  data-size={size !== 'default' ? size : undefined}
  data-status={status !== 'normal' ? status : undefined}
>
  {#if presets.length > 0}
    <Select
      value=""
      {disabled}
      aria-label={i18n.t('dateInput.presets')}
      aria-describedby={describedby}
      aria-invalid={invalid || undefined}
      onchange={choosePreset}
    >
      <option value="">{i18n.t('dateInput.presets')}</option>
      {#each presets as preset, index (index)}
        <option value={String(index)} disabled={!presetAllowed(preset)}>{preset.label}</option>
      {/each}
    </Select>
  {/if}
  <DateTimeInput
    value={value?.start ?? null}
    {mode}
    {valueMode}
    {disambiguation}
    {...definedOptions({
      timeZone, min, max: startMax, step, disabledDate,
      id: startId, name: startName, describedby,
      maxInstant: instantMode ? validInstant(value?.end) : undefined,
      placeholder: startPlaceholder,
    })}
    {disabled}
    {required}
    {invalid}
    ariaLabel={startAriaLabel ?? i18n.t('common.startDate')}
    onchange={(next) => update('start', next)}
  />
  <span aria-hidden="true" class="mx-1.5 text-xs text-muted-foreground">{resolvedSeparator}</span>
  <DateTimeInput
    value={value?.end ?? null}
    {mode}
    {valueMode}
    {disambiguation}
    {...definedOptions({
      timeZone, min: endMin, max, step, disabledDate,
      id: endId, name: endName, describedby,
      minInstant: instantMode ? validInstant(value?.start) : undefined,
      placeholder: endPlaceholder,
    })}
    {disabled}
    {required}
    {invalid}
    ariaLabel={endAriaLabel ?? i18n.t('common.endDate')}
    onchange={(next) => update('end', next)}
  />
  {#if allowClear && (value?.start || value?.end) && !disabled}
    <button
      type="button"
      aria-label="Clear date range"
      class="ml-1 text-muted-foreground hover:text-foreground text-xs p-1 rounded transition-colors"
      onclick={clearRange}
    >
      ✕
    </button>
  {/if}
</div>
