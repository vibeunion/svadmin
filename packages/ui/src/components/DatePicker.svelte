<script lang="ts">
  import { untrack, type ComponentProps } from 'svelte';
  import { ChevronLeft, ChevronRight } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import DateTimeInput from './DateTimeInput.svelte';
  import { Button } from './ui/button/index.js';
  import * as Popover from './ui/popover/index.js';
  import { cn } from '../utils.js';
  import { hasComponentConfig, useComponentConfig } from './ConfigProvider.svelte';
  import { componentText, monthLabel, resolveComponentLocale, weekdayLabels } from './component-messages.js';

  export type DatePickerMode = 'date' | 'month' | 'year' | 'quarter';
  export interface DatePreset { label: string; value: string; }

  type NativeProps = Omit<ComponentProps<typeof DateTimeInput>, 'mode' | 'value' | 'onchange'>;

  interface Props extends NativeProps {
    value?: string | null;
    /** `panel` renders the calendar panel; without it the native date input is kept. */
    panel?: boolean;
    picker?: DatePickerMode;
    presets?: DatePreset[];
    /** 未传入时跟随已解析 locale，英文为 Select date，中文为选择日期。 */
    placeholder?: string;
    /** 覆盖 ConfigProvider 与 i18n 的面板语言。不传则保持原有默认路径。 */
    locale?: string;
    /** Whether clear button is enabled (defaults to true) */
    allowClear?: boolean;
    /** Size tier */
    size?: 'mini' | 'small' | 'default' | 'large';
    /** Status validation styling */
    status?: 'error' | 'warning' | 'normal';
    defaultValue?: string | null;
    onChange?: (value: string | null) => void;
    onchange?: (value: string | null) => void;
  }

  export type DatePickerProps = Props;

  let {
    value = $bindable(null),
    defaultValue,
    panel = false,
    picker = 'date',
    presets = [],
    placeholder,
    locale: localeProp,
    allowClear = true,
    size = 'default',
    status = 'normal',
    disabled = false,
    class: className,
    onChange,
    onchange,
    ...nativeProps
  }: Props = $props();

  const config = useComponentConfig();
  const i18n = useTranslation();
  const provided = hasComponentConfig();
  // 组件属性 > ConfigProvider（仅存在时）> i18n > en。无 Provider 时不拿默认 en 盖住 i18n。
  const activeLocale = $derived(resolveComponentLocale({
    explicit: localeProp,
    configLocale: provided ? config.locale : undefined,
    i18nLocale: i18n.locale,
  }));
  const copy = $derived({
    previous: componentText(i18n, activeLocale, 'datePicker.previous'),
    next: componentText(i18n, activeLocale, 'datePicker.next'),
    clear: componentText(i18n, activeLocale, 'datePicker.clear'),
    selectDate: componentText(i18n, activeLocale, 'datePicker.selectDate'),
  });
  const resolvedPlaceholder = $derived(placeholder ?? copy.selectDate);
  const weekdays = $derived(weekdayLabels(activeLocale));
  const emitChange = (val: string | null): void => {
    onchange?.(val);
    onChange?.(val);
  };
  let initialized = false;
  $effect.pre(() => {
    if (!initialized) {
      initialized = true;
      if (value === null && defaultValue !== undefined) {
        value = defaultValue;
      }
    }
  });
  let open = $state(false);
  let viewMode = $state<'day' | 'month' | 'year'>(untrack(() => picker === 'year' ? 'year' : picker === 'month' ? 'month' : 'day'));
  let viewDate = $state(initialView(value));

  const pad = (input: number): string => String(input).padStart(2, '0');
  const toIso = (date: Date): string => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const toMonth = (date: Date): string => `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;

  function initialView(input: string | null | undefined): Date {
    if (!input) return new Date();
    const parsed = new Date(input.length === 4 ? `${input}-01-01` : input.length === 7 ? `${input}-01` : input);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  function formatValue(input: string | null): string {
    return input ?? '';
  }

  function syncView(): void {
    viewDate = initialView(value);
    viewMode = picker === 'year' ? 'year' : picker === 'month' ? 'month' : 'day';
  }

  $effect(() => {
    if (open) syncView();
  });

  const title = $derived(viewMode === 'year'
    ? `${Math.floor(viewDate.getFullYear() / 12) * 12} – ${Math.floor(viewDate.getFullYear() / 12) * 12 + 11}`
    : viewMode === 'month'
      ? String(viewDate.getFullYear())
      : `${viewDate.getFullYear()}-${pad(viewDate.getMonth() + 1)}`);

  const days = $derived.by(() => {
    const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(first);
    start.setDate(first.getDate() - offset);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const iso = toIso(date);
      return {
        date,
        iso,
        day: date.getDate(),
        outside: date.getMonth() !== viewDate.getMonth(),
        selected: value === iso,
        today: iso === toIso(new Date()),
        disabled: Boolean((nativeProps.min && iso < nativeProps.min) || (nativeProps.max && iso > nativeProps.max) || nativeProps.disabledDate?.(iso)),
      };
    });
  });

  const months = $derived(Array.from({ length: 12 }, (_, month) => {
    const key = `${viewDate.getFullYear()}-${pad(month + 1)}`;
    return { month, key, label: monthLabel(activeLocale, viewDate.getFullYear(), month), selected: value === key, disabled: false };
  }));

  const years = $derived.by(() => {
    const start = Math.floor(viewDate.getFullYear() / 12) * 12;
    return Array.from({ length: 12 }, (_, index) => {
      const year = start + index;
      return { year, key: String(year), selected: value === String(year), disabled: false };
    });
  });

  const quarters = $derived(Array.from({ length: 4 }, (_, index) => {
    const key = `${viewDate.getFullYear()}-Q${index + 1}`;
    return { index, key, label: `Q${index + 1}`, selected: value === key, disabled: false };
  }));

  function move(delta: number): void {
    const next = new Date(viewDate);
    if (viewMode === 'year') next.setFullYear(next.getFullYear() + delta * 12);
    else if (viewMode === 'month') next.setFullYear(next.getFullYear() + delta);
    else next.setMonth(next.getMonth() + delta);
    viewDate = next;
  }

  function chooseDay(iso: string, isDisabled: boolean): void {
    if (isDisabled) return;
    value = iso;
    emitChange(iso);
    open = false;
  }

  function chooseMonth(month: number): void {
    const next = new Date(viewDate.getFullYear(), month, 1);
    if (picker === 'month') {
      value = toMonth(next);
      emitChange(value);
      open = false;
      return;
    }
    viewDate = next;
    viewMode = 'day';
  }

  function chooseYear(year: number): void {
    const next = new Date(viewDate);
    next.setFullYear(year);
    if (picker === 'year') {
      value = String(year);
      emitChange(value);
      open = false;
      return;
    }
    viewDate = next;
    viewMode = 'month';
  }

  function chooseQuarter(index: number): void {
    const key = `${viewDate.getFullYear()}-Q${index + 1}`;
    value = key;
    emitChange(key);
    open = false;
  }

  function clear(): void {
    value = null;
    emitChange(null);
    open = false;
  }

  function toggleTitle(): void {
    if (viewMode === 'day' && picker !== 'quarter') viewMode = 'month';
    else if (viewMode === 'month') viewMode = 'year';
  }
</script>

{#if !panel}
  <DateTimeInput {...nativeProps} mode="date" bind:value {defaultValue} {disabled} class={className} onchange={emitChange} />
{:else}
  <Popover.Root bind:open>
    <Popover.Trigger {disabled} class={cn('w-full', className)}>
      {#snippet child({ props })}
        <button
          type="button"
          {...props}
          disabled={disabled}
          aria-label={nativeProps.ariaLabel}
          class="svadmin-date-picker__trigger"
          data-size={size !== 'default' ? size : undefined}
          data-status={status !== 'normal' ? status : undefined}
        >
          <span class={value ? 'text-foreground' : 'text-muted-foreground'}>{formatValue(value) || resolvedPlaceholder}</span>
          <ChevronRight class="h-4 w-4 rotate-90 opacity-50" />
        </button>
      {/snippet}
    </Popover.Trigger>
    <Popover.Content class="svadmin-date-picker-panel w-auto p-0" align="start">
      <div class="w-64 p-2" lang={activeLocale}>
        <div class="mb-2 flex items-center justify-between">
          <Button type="button" variant="ghost" size="icon-sm" aria-label={copy.previous} onclick={() => move(-1)}><ChevronLeft size={16} /></Button>
          <button type="button" class="rounded px-2 py-1 text-sm font-medium hover:bg-muted" onclick={toggleTitle}>{title}</button>
          <Button type="button" variant="ghost" size="icon-sm" aria-label={copy.next} onclick={() => move(1)}><ChevronRight size={16} /></Button>
        </div>

        {#if viewMode === 'day'}
          <div class="svadmin-date-picker__weekdays">
            {#each weekdays as weekday, index (index)}<span>{weekday}</span>{/each}
          </div>
          <div class="svadmin-date-picker__days">
            {#each days as day (day.iso)}
              <button
                type="button"
                disabled={day.disabled}
                aria-pressed={day.selected}
                class="svadmin-date-picker__cell svadmin-date-picker__day"
                class:is-outside={day.outside}
                class:is-today={day.today}
                class:is-selected={day.selected}
                onclick={() => chooseDay(day.iso, day.disabled)}
              ><span>{day.day}</span></button>
            {/each}
          </div>
        {:else if viewMode === 'month'}
          <div class="grid grid-cols-3 gap-1">
            {#each months as month (month.key)}
              <button type="button" class="svadmin-date-picker__cell h-14" class:is-selected={month.selected} onclick={() => chooseMonth(month.month)}>{month.label}</button>
            {/each}
          </div>
        {:else}
          <div class="grid grid-cols-3 gap-1">
            {#each years as year (year.key)}
              <button type="button" class="svadmin-date-picker__cell h-11" class:is-selected={year.selected} onclick={() => chooseYear(year.year)}>{year.year}</button>
            {/each}
          </div>
        {/if}

        {#if picker === 'quarter'}
          <div class="mt-2 grid grid-cols-4 gap-1 border-t border-border pt-2">
            {#each quarters as quarter (quarter.key)}
              <button type="button" class="svadmin-date-picker__cell h-9" class:is-selected={quarter.selected} onclick={() => chooseQuarter(quarter.index)}>{quarter.label}</button>
            {/each}
          </div>
        {/if}

        {#if presets.length > 0}
          <div class="mt-2 flex flex-wrap gap-1 border-t border-border pt-2">
            {#each presets as preset (preset.value)}
              <Button type="button" variant="ghost" size="sm" onclick={() => { value = preset.value; emitChange(preset.value); open = false; }}>{preset.label}</Button>
            {/each}
          </div>
        {/if}
        {#if value && allowClear && !disabled}
          <div class="mt-1 flex justify-end border-t border-border pt-1">
            <Button type="button" variant="ghost" size="sm" onclick={clear}>{copy.clear}</Button>
          </div>
        {/if}
      </div>
    </Popover.Content>
  </Popover.Root>
{/if}

<style>
  .svadmin-date-picker__trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    min-height: var(--svadmin-control-h);
    border: 1px solid var(--border);
    border-radius: var(--border-radius-small, 2px);
    background: var(--card);
    padding: 0 12px;
    color: var(--foreground);
    font-size: var(--svadmin-text-body);
    line-height: 1.5715;
    text-align: start;
    cursor: pointer;
  }
  .svadmin-date-picker__trigger:focus-visible {
    border-color: var(--ring);
    outline: var(--svadmin-focus-width) solid var(--ring);
    outline-offset: var(--svadmin-focus-offset);
  }
  .svadmin-date-picker__trigger:disabled {
    cursor: not-allowed;
    opacity: 1;
    border-color: transparent;
    background: var(--svadmin-fill-2, var(--muted));
    color: var(--svadmin-text-4);
  }
  .svadmin-date-picker__weekdays,
  .svadmin-date-picker__days {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
  }
  .svadmin-date-picker__weekdays span {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 32px;
    color: var(--muted-foreground);
    font-size: var(--svadmin-text-body);
    font-weight: 500;
    line-height: 1;
    text-align: center;
  }
  .svadmin-date-picker__cell {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 2rem;
    border: 0;
    border-radius: var(--border-radius-small, 2px);
    background: transparent;
    color: var(--foreground);
    font: inherit;
    font-size: var(--svadmin-text-body);
    font-weight: 500;
    cursor: pointer;
  }
  .svadmin-date-picker__cell:hover:not(:disabled):not(.svadmin-date-picker__day) { background: var(--svadmin-fill-3, var(--border)); }
  .svadmin-date-picker__cell.is-outside:not(.svadmin-date-picker__day) { color: var(--svadmin-text-4); opacity: 1; }
  .svadmin-date-picker__cell.is-today:not(.svadmin-date-picker__day) { box-shadow: inset 0 0 0 1px var(--primary); }
  .svadmin-date-picker__cell.is-selected:not(.svadmin-date-picker__day) { background: var(--primary); color: var(--primary-foreground); }
  .svadmin-date-picker__cell:disabled { opacity: 1; color: var(--svadmin-text-4); cursor: not-allowed; }
  .svadmin-date-picker__day {
    position: relative;
    min-height: 32px;
    padding: 2px 0 6px;
    border-radius: 0;
    background: transparent;
  }
  .svadmin-date-picker__day > span {
    display: inline-grid;
    place-items: center;
    min-width: 24px;
    height: 24px;
    border-radius: 24px;
    line-height: 1;
  }
  .svadmin-date-picker__day:hover:not(:disabled):not(.is-selected) > span {
    background: var(--svadmin-fill-3, var(--border));
    color: var(--foreground);
  }
  .svadmin-date-picker__day.is-outside > span { color: var(--svadmin-text-4); }
  .svadmin-date-picker__day.is-selected > span { background: var(--primary); color: var(--primary-foreground); }
  .svadmin-date-picker__day.is-today::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 50%;
    width: 4px;
    height: 4px;
    margin-left: -2px;
    border-radius: 999px;
    background: var(--primary);
  }
  .svadmin-date-picker__day:disabled { background: var(--svadmin-fill-1, var(--background)); }
  .svadmin-date-picker__day:disabled > span { background: transparent; color: var(--svadmin-text-4); }
  .svadmin-date-picker__day:focus-visible {
    outline: var(--svadmin-focus-width) solid var(--ring);
    outline-offset: var(--svadmin-focus-offset);
  }
  :global(.svadmin-date-picker-panel) { z-index: 80; }
</style>
