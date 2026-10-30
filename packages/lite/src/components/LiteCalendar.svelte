<script lang="ts">
  interface CalendarEvent {
    id: string;
    date: string;
    label: string;
    href?: string;
    tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
  }

  interface Props {
    value?: string;
    events?: CalendarEvent[];
    locale?: string;
    weekStartsOn?: 0 | 1;
    min?: string;
    max?: string;
    title?: string;
    hrefFor?: (iso: string) => string;
  }

  let {
    value = '',
    events = [],
    locale,
    weekStartsOn = 0,
    min,
    max,
    title,
    hrefFor,
  }: Props = $props();

  const initial = $derived(value ? new Date(`${value}T12:00:00`) : new Date());
  const year = $derived(initial.getFullYear());
  const month = $derived(initial.getMonth());
  const heading = $derived(title ?? new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(new Date(year, month, 1)));
  const weekdays = $derived.by(() => {
    const format = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    return Array.from({ length: 7 }, (_, index) => format.format(new Date(2024, 0, 7 + ((index + weekStartsOn) % 7))));
  });
  const days = $derived.by(() => {
    const first = new Date(year, month, 1);
    const offset = (first.getDay() - weekStartsOn + 7) % 7;
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(year, month, 1 - offset + index);
      const iso = toIso(date);
      return {
        iso,
        day: date.getDate(),
        outside: date.getMonth() !== month,
        selected: iso === value,
        events: events.filter((event) => event.date === iso),
        disabled: Boolean(min && iso < min) || Boolean(max && iso > max),
      };
    });
  });
  const upcoming = $derived(events.filter((event) => !value || event.date >= value).slice(0, 8));

  function toIso(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
</script>

<section class="lite-calendar lite-card" aria-label={heading}>
  <header>
    <h2>{heading}</h2>
    {#if value}<span>{value}</span>{/if}
  </header>
  <table>
    <thead>
      <tr>{#each weekdays as weekday (weekday)}<th scope="col">{weekday}</th>{/each}</tr>
    </thead>
    <tbody>
      {#each Array.from({ length: 6 }, (_, week) => week) as week (week)}
        <tr>
          {#each days.slice(week * 7, week * 7 + 7) as day (day.iso)}
            <td data-outside={day.outside || undefined} data-selected={day.selected || undefined} data-disabled={day.disabled || undefined}>
              {#if day.disabled}
                <span>{day.day}</span>
              {:else if hrefFor}
                <a href={hrefFor(day.iso)} aria-current={day.selected ? 'date' : undefined}>{day.day}</a>
              {:else}
                <span aria-current={day.selected ? 'date' : undefined}>{day.day}</span>
              {/if}
              {#if day.events.length > 0}<span class="lite-calendar__dot" title={`${day.events.length} event(s)`}></span>{/if}
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
  {#if upcoming.length > 0}
    <ul class="lite-calendar__events">
      {#each upcoming as event (event.id)}
        <li data-tone={event.tone ?? 'neutral'}>
          <time>{event.date}</time>
          {#if event.href}<a href={event.href}>{event.label}</a>{:else}<span>{event.label}</span>{/if}
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .lite-calendar { padding: 0; overflow: hidden; }
  .lite-calendar header { display: flex; align-items: baseline; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #E5E6EB; }
  .lite-calendar h2 { margin: 0; color: #1D2129; font-size: 14px; }
  .lite-calendar header span { color: #86909C; font-size: 12px; }
  .lite-calendar table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .lite-calendar th { padding: 8px 4px; color: #86909C; font-size: 11px; font-weight: 600; text-align: center; }
  .lite-calendar td { position: relative; height: 40px; padding: 4px; border: 1px solid #F2F3F5; color: #1D2129; font-size: 12px; text-align: center; }
  .lite-calendar td a, .lite-calendar td > span:first-child { display: inline-grid; place-items: center; width: 28px; height: 28px; border-radius: 999px; color: inherit; text-decoration: none; }
  .lite-calendar td a:hover { background: #F7F8FA; color: #165DFF; }
  .lite-calendar td[data-selected] a, .lite-calendar td[data-selected] > span:first-child { background: #165DFF; color: #fff; }
  .lite-calendar td[data-outside] { color: #C9CDD4; }
  .lite-calendar td[data-disabled] { color: #E5E6EB; }
  .lite-calendar__dot { position: absolute; right: 50%; bottom: 3px; width: 4px; height: 4px; margin-right: -2px; border-radius: 999px; background: #165DFF; }
  .lite-calendar__events { margin: 0; padding: 8px 16px 12px; border-top: 1px solid #E5E6EB; list-style: none; }
  .lite-calendar__events li { display: flex; padding: 4px 0; color: #4E5969; font-size: 12px; }
  .lite-calendar__events time { color: #86909C; font-variant-numeric: tabular-nums; }
  .lite-calendar__events a { color: #165DFF; }

  .lite-calendar header > * + * { margin-left: 12px; }
  .lite-calendar__events li > * + * { margin-left: 8px; }
</style>
