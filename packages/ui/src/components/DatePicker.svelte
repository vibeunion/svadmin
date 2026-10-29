<script lang="ts">
  import { untrack, type ComponentProps } from 'svelte';
  import { ChevronLeft, ChevronRight } from '@lucide/svelte';
  import DateTimeInput from './DateTimeInput.svelte';
  import { Button } from './ui/button/index.js';
  import * as Popover from './ui/popover/index.js';
  import { cn } from '../utils.js';

  export type DatePickerMode = 'date' | 'month' | 'year' | 'quarter';
  export interface DatePreset { label: string; value: string; }

  type NativeProps = Omit<ComponentProps<typeof DateTimeInput>, 'mode' | 'value' | 'onchange'>;

  interface Props extends NativeProps {
    value?: string | null;
    /** `panel` renders the calendar panel; without it the native date input is kept. */
    panel?: boolean;
    picker?: DatePickerMode;
    presets?: DatePreset[];
    placeholder?: string;
    onchange?: (value: string | null) => void;
  }

  export type DatePickerProps = Props;

  let {
    value = $bindable(null),
    panel = false,
    picker = 'date',
    presets = [],
    placeholder = 'Select date',
    disabled = false,
    class: className,
    onchange,
    ...nativeProps
  }: Props = $props();

  const weekdays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  let open = $state(false);
  let viewMode = $state<'day' | 'month' | 'year'>(untrack(() => picker === 'year' ? 'year' : picker === 'month' ? 'month' : 'day'));
  let viewDate = $state(initialView(value));

  const pad = (input: number): string => String(input).padStart(2, '0');
  const toIso = (date: Date): string => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const toMonth = (date: Date): string => `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
  const toYear = (date: Date): string => String(date.getFullYear());
  const toQuarter = (date: Date): string => `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`;

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
    return { month, key, label: new Intl.DateTimeFormat(undefined, { month: 'short' }).format(new Date(viewDate.getFullYear(), month, 1)), selected: value === key, disabled: false };
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
    onchange?.(iso);
    open = false;
  }

  function chooseMonth(month: number): void {
    const next = new Date(viewDate.getFullYear(), month, 1);
    if (picker === 'month') {
      value = toMonth(next);
      onchange?.(value);
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
      onchange?.(value);
      open = false;
      return;
    }
    viewDate = next;
    viewMode = 'month';
  }

  function chooseQuarter(index: number): void {
    const key = `${viewDate.getFullYear()}-Q${index + 1}`;
    value = key;
    onchange?.(key);
    open = false;
  }

  function clear(): void {
    value = null;
    onchange?.(null);
    open = false;
  }

  function toggleTitle(): void {
    if (viewMode === 'day' && picker !== 'quarter') viewMode = 'month';
    else if (viewMode === 'month') viewMode = 'year';
  }
</script>

{#if !panel}
  <DateTimeInput {...nativeProps} mode="date" bind:value {disabled} class={className} onchange={(next) => onchange?.(next)} />
{:else}
  <Popover.Root bind:open>
    <Popover.Trigger {disabled} class={cn('w-full', className)}>
      {#snippet child({ props })}
        <button
          type="button"
          {...props}
          disabled={disabled}
          aria-label={nativeProps.ariaLabel}
          class="flex min-h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1.5 text-left text-sm focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span class={value ? 'text-foreground' : 'text-muted-foreground'}>{formatValue(value) || placeholder}</span>
          <ChevronRight class="h-4 w-4 rotate-90 opacity-50" />
        </button>
      {/snippet}
    </Popover.Trigger>
    <Popover.Content class="svadmin-date-picker-panel w-auto p-0" align="start">
      <div class="w-64 p-2">
        <div class="mb-2 flex items-center justify-between">
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Previous" onclick={() => move(-1)}><ChevronLeft size={16} /></Button>
          <button type="button" class="rounded px-2 py-1 text-sm font-medium hover:bg-muted" onclick={toggleTitle}>{title}</button>
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Next" onclick={() => move(1)}><ChevronRight size={16} /></Button>
        </div>

        {#if viewMode === 'day'}
          <div class="grid grid-cols-7 gap-0.5 text-center text-[0.6875rem] text-muted-foreground">
            {#each weekdays as weekday (weekday)}<span class="py-1">{weekday}</span>{/each}
          </div>
          <div class="grid grid-cols-7 gap-0.5">
            {#each days as day (day.iso)}
              <button
                type="button"
                disabled={day.disabled}
                aria-pressed={day.selected}
                class="svadmin-date-picker__cell"
                class:is-outside={day.outside}
                class:is-today={day.today}
                class:is-selected={day.selected}
                onclick={() => chooseDay(day.iso, day.disabled)}
              >{day.day}</button>
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
              <Button type="button" variant="ghost" size="sm" onclick={() => { value = preset.value; onchange?.(preset.value); open = false; }}>{preset.label}</Button>
            {/each}
          </div>
        {/if}
        {#if value}
          <div class="mt-1 flex justify-end border-t border-border pt-1">
            <Button type="button" variant="ghost" size="sm" onclick={clear}>Clear</Button>
          </div>
        {/if}
      </div>
    </Popover.Content>
  </Popover.Root>
{/if}

<style>
  .svadmin-date-picker__cell {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 2rem;
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--foreground);
    font: inherit;
    font-size: var(--svadmin-text-label);
    cursor: pointer;
  }
  .svadmin-date-picker__cell:hover:not(:disabled) { background: var(--accent); }
  .svadmin-date-picker__cell.is-outside { color: var(--muted-foreground); opacity: 0.55; }
  .svadmin-date-picker__cell.is-today { box-shadow: inset 0 0 0 1px var(--primary); }
  .svadmin-date-picker__cell.is-selected { background: var(--primary); color: var(--primary-foreground); }
  .svadmin-date-picker__cell:disabled { opacity: 0.35; cursor: not-allowed; }
  :global(.svadmin-date-picker-panel) { z-index: 80; }
</style>
