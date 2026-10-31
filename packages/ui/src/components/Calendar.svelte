<script lang="ts">
  import { untrack } from 'svelte';
  import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { Button } from './ui/button/index.js';
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

<section class={cn('svadmin-calendar', className)} aria-label={title}>
  <header class="svadmin-calendar__header">
    <strong>{title}</strong>
    <div class="svadmin-calendar__nav">
      <Button variant="outline" size="icon-sm" aria-label={copy.previousYear} onclick={() => moveYear(-1)}><ChevronsLeft size={16} /></Button>
      <Button variant="outline" size="icon-sm" aria-label={copy.previousMonth} onclick={() => move(-1)}><ChevronLeft size={16} /></Button>
      <Button variant="outline" size="icon-sm" aria-label={copy.nextMonth} onclick={() => move(1)}><ChevronRight size={16} /></Button>
      <Button variant="outline" size="icon-sm" aria-label={copy.nextYear} onclick={() => moveYear(1)}><ChevronsRight size={16} /></Button>
    </div>
  </header>
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
        <span>{day.day}</span>
        {#if day.events.length > 0}
          <span class="svadmin-calendar__events" aria-hidden="true">
            {#each day.events.slice(0, 3) as event (event.id)}<i data-tone={event.tone ?? 'neutral'}></i>{/each}
          </span>
        {/if}
      </button>
    {/each}
  </div>
</section>

<style>
  .svadmin-calendar { display: grid; gap: var(--svadmin-space-2); min-width: 0; }
  .svadmin-calendar__header { display: flex; align-items: center; justify-content: space-between; gap: var(--svadmin-space-3); }
  .svadmin-calendar__header strong { font-size: var(--svadmin-text-body); font-weight: 600; color: var(--foreground); }
  .svadmin-calendar__nav { display: flex; gap: var(--svadmin-space-1); }
  .svadmin-calendar__weekdays, .svadmin-calendar__grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); }
  .svadmin-calendar__weekdays span { padding: var(--svadmin-space-1); color: var(--muted-foreground); font-size: var(--svadmin-text-caption); text-align: center; }
  .svadmin-calendar__grid { gap: 1px; border: 1px solid var(--border); border-radius: var(--radius-sm); overflow: hidden; background: var(--border); }
  .svadmin-calendar__day {
    display: grid;
    place-items: center;
    gap: 0.15rem;
    min-height: 2.5rem;
    border: 0;
    background: var(--card);
    color: var(--foreground);
    font-size: var(--svadmin-text-label);
    cursor: pointer;
  }
  .svadmin-calendar__day:hover, .svadmin-calendar__day:focus-visible { background: var(--accent); outline: none; }
  .svadmin-calendar__day.is-outside { color: var(--muted-foreground); opacity: 0.65; }
  .svadmin-calendar__day.is-today span:first-child { color: var(--primary); font-weight: 700; }
  .svadmin-calendar__day.is-selected { background: var(--primary); color: var(--primary-foreground); font-weight: 600; }
  .svadmin-calendar__day:disabled { cursor: not-allowed; opacity: 0.4; }
  .svadmin-calendar__events { display: flex; gap: 0.1rem; }
  .svadmin-calendar__events i { width: 0.25rem; height: 0.25rem; border-radius: 999px; background: var(--muted-foreground); }
  .svadmin-calendar__events i[data-tone='info'] { background: var(--info); }
  .svadmin-calendar__events i[data-tone='success'] { background: var(--success); }
  .svadmin-calendar__events i[data-tone='warning'] { background: var(--warning); }
  .svadmin-calendar__events i[data-tone='danger'] { background: var(--destructive); }
</style>