<script lang="ts">
  import { untrack } from 'svelte';
  import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { cn } from '../utils.js';
  import { hasComponentConfig, useComponentConfig } from './ConfigProvider.svelte';
  import { componentText, resolveComponentLocale } from './component-messages.js';

  export interface CalendarEvent {
    id: string;
    date: string;
    label: string;
    tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
  }

  interface Props {
    value?: string;
    events?: CalendarEvent[];
    locale?: string;
    weekStartsOn?: 0 | 1;
    min?: string;
    max?: string;
    card?: boolean;
    disabled?: boolean;
    class?: string;
    onchange?: (value: string) => void;
  }

  let {
    value = '',
    events = [],
    locale,
    weekStartsOn = 0,
    min,
    max,
    card = false,
    disabled = false,
    class: className = '',
    onchange,
  }: Props = $props();

  const initial = untrack(() => value ? new Date(`${value}T12:00:00`) : new Date());
  let viewYear = $state(initial.getFullYear());
  let viewMonth = $state(initial.getMonth());

  const config = useComponentConfig();
  const i18n = useTranslation();
  const provided = hasComponentConfig();
  // 显式 locale 仍优先。未传入时与 DatePicker 共用 ConfigProvider / i18n 解析。
  const activeLocale = $derived(resolveComponentLocale({
    explicit: locale,
    configLocale: provided ? config.locale : undefined,
    i18nLocale: i18n.locale,
  }));
  const copy = $derived({
    previousMonth: componentText(i18n, activeLocale, 'datePicker.previousMonth'),
    nextMonth: componentText(i18n, activeLocale, 'datePicker.nextMonth'),
    previousYear: componentText(i18n, activeLocale, 'datePicker.previousYear'),
    nextYear: componentText(i18n, activeLocale, 'datePicker.nextYear'),
    calendarDates: componentText(i18n, activeLocale, 'datePicker.calendarDates'),
  });

  const weekdays = $derived.by(() => {
    const format = new Intl.DateTimeFormat(activeLocale, { weekday: 'short' });
    return Array.from({ length: 7 }, (_, index) => format.format(new Date(2024, 0, 7 + ((index + weekStartsOn) % 7), 12)));
  });

  const title = $derived(new Intl.DateTimeFormat(activeLocale, { month: 'long', year: 'numeric' }).format(new Date(viewYear, viewMonth, 1, 12)));

  const days = $derived.by(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const offset = (first.getDay() - weekStartsOn + 7) % 7;
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(viewYear, viewMonth, 1 - offset + index);
      const iso = toIso(date);
      return {
        date,
        iso,
        day: date.getDate(),
        outside: date.getMonth() !== viewMonth,
        today: iso === toIso(new Date()),
        selected: iso === value,
        events: events.filter((event) => event.date === iso),
        disabled: disabled || Boolean(min && iso < min) || Boolean(max && iso > max),
      };
    });
  });

  function toIso(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function move(delta: number): void {
    const next = new Date(viewYear, viewMonth + delta, 1);
    viewYear = next.getFullYear();
    viewMonth = next.getMonth();
  }

  function moveYear(delta: number): void {
    viewYear += delta;
  }

  function onGridKeydown(event: KeyboardEvent): void {
    if (!(event.currentTarget instanceof HTMLElement) || !(event.target instanceof HTMLElement)) return;
    const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
    const index = buttons.indexOf(event.target as HTMLButtonElement);
    if (index < 0) return;
    const delta = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : event.key === 'ArrowUp' ? -7 : event.key === 'ArrowDown' ? 7 : 0;
    if (delta !== 0) {
      event.preventDefault();
      buttons[Math.max(0, Math.min(index + delta, buttons.length - 1))]?.focus();
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      buttons[event.key === 'Home' ? 0 : buttons.length - 1]?.focus();
    }
  }

  function select(iso: string, isDisabled: boolean): void {
    if (isDisabled) return;
    onchange?.(iso);
  }
</script>

<section
  class={cn('svadmin-calendar', card && 'svadmin-calendar--card', className)}
  data-card={card}
  aria-label={title}
>
  <header class="svadmin-calendar__header">
    <div class="svadmin-calendar__nav">
      <button type="button" aria-label={copy.previousYear} onclick={() => moveYear(-1)}><ChevronsLeft size={12} /></button>
      <button type="button" aria-label={copy.previousMonth} onclick={() => move(-1)}><ChevronLeft size={12} /></button>
    </div>
    <strong>{title}</strong>
    <div class="svadmin-calendar__nav">
      <button type="button" aria-label={copy.nextMonth} onclick={() => move(1)}><ChevronRight size={12} /></button>
      <button type="button" aria-label={copy.nextYear} onclick={() => moveYear(1)}><ChevronsRight size={12} /></button>
    </div>
  </header>
  <div class="svadmin-calendar__body">
  <div class="svadmin-calendar__weekdays" aria-hidden="true">
    {#each weekdays as weekday (weekday)}<span>{weekday}</span>{/each}
  </div>
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div class="svadmin-calendar__grid" role="group" aria-label={copy.calendarDates} onkeydown={onGridKeydown}>
    {#each days as day (day.iso)}
      <button
        type="button"
        class="svadmin-calendar__day"
        class:is-outside={day.outside}
        class:is-today={day.today}
        class:is-selected={day.selected}
        disabled={day.disabled}
        aria-label={day.iso}
        aria-pressed={day.selected}
        onclick={() => select(day.iso, day.disabled)}
      >
        <span class="svadmin-calendar__date">{day.day}</span>
        {#if day.events.length > 0}
          <span class="svadmin-calendar__events" aria-hidden="true">
            {#each day.events.slice(0, 3) as event (event.id)}<i data-tone={event.tone ?? 'neutral'}></i>{/each}
          </span>
        {/if}
      </button>
    {/each}
  </div>
  </div>
</section>

<style>
  /* Card mode follows the official panel: 265px, 8/16 header, 14/16 body, 24px circles. */
  .svadmin-calendar { display: grid; min-width: 0; color: var(--foreground); }
  .svadmin-calendar--card {
    width: min(100%, 16.5625rem);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--card);
  }
  .svadmin-calendar__header {
    display: flex;
    align-items: center;
    gap: var(--svadmin-space-1);
    padding: 8px 16px;
  }
  .svadmin-calendar--card .svadmin-calendar__header { border-bottom: 1px solid var(--border); }
  .svadmin-calendar__header strong {
    flex: 1;
    min-width: 0;
    color: var(--foreground);
    font-size: var(--svadmin-text-body);
    font-weight: 500;
    line-height: 1;
    text-align: center;
  }
  .svadmin-calendar__nav { display: flex; gap: 2px; }
  .svadmin-calendar__nav button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: 0;
    border-radius: 999px;
    background: var(--card);
    color: var(--muted-foreground);
    cursor: pointer;
  }
  .svadmin-calendar__nav button:hover { background: var(--svadmin-fill-3, var(--border)); }
  .svadmin-calendar__nav button:focus-visible,
  .svadmin-calendar__day:focus-visible {
    outline: var(--svadmin-focus-width) solid var(--ring);
    outline-offset: var(--svadmin-focus-offset);
  }
  .svadmin-calendar__body { display: grid; padding: 14px 16px; }
  .svadmin-calendar__weekdays, .svadmin-calendar__grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); }
  .svadmin-calendar__weekdays span {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 32px;
    color: var(--muted-foreground);
    font-size: var(--svadmin-text-body);
    font-weight: 400;
    line-height: 1;
    text-align: center;
  }
  .svadmin-calendar__day {
    position: relative;
    display: grid;
    justify-items: center;
    align-content: center;
    gap: 2px;
    min-height: 32px;
    padding: 2px 0 6px;
    border: 0;
    background: transparent;
    color: var(--foreground);
    font-size: var(--svadmin-text-body);
    font-weight: 500;
    cursor: pointer;
  }
  .svadmin-calendar__date {
    display: inline-grid;
    place-items: center;
    min-width: 24px;
    height: 24px;
    border-radius: 999px;
    line-height: 1;
  }
  .svadmin-calendar__day:hover:not(:disabled):not(.is-selected) .svadmin-calendar__date {
    background: var(--primary-light-1, var(--accent));
    color: var(--primary);
  }
  .svadmin-calendar__day.is-outside { color: var(--svadmin-text-4); }
  .svadmin-calendar__day.is-outside .svadmin-calendar__date { color: var(--svadmin-text-4); }
  .svadmin-calendar__day.is-today::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    width: 4px;
    height: 4px;
    margin-left: -2px;
    border-radius: 999px;
    background: var(--primary);
  }
  .svadmin-calendar__day.is-selected .svadmin-calendar__date {
    background: var(--primary);
    color: var(--primary-foreground);
  }
  .svadmin-calendar__day:disabled {
    cursor: not-allowed;
    background: var(--svadmin-fill-1, var(--background));
    opacity: 1;
  }
  .svadmin-calendar__day:disabled .svadmin-calendar__date {
    background: transparent;
    color: var(--svadmin-text-4);
  }
  .svadmin-calendar__events { display: flex; gap: 2px; }
  .svadmin-calendar__events i { width: 4px; height: 4px; border-radius: 999px; background: var(--muted-foreground); }
  .svadmin-calendar__events i[data-tone='info'] { background: var(--info); }
  .svadmin-calendar__events i[data-tone='success'] { background: var(--success); }
  .svadmin-calendar__events i[data-tone='warning'] { background: var(--warning); }
  .svadmin-calendar__events i[data-tone='danger'] { background: var(--destructive); }
</style>
