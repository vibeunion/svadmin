<script lang="ts">
  import { useList } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import { Badge, Button, ContentPageHeader, ContentPageShell, MetricBlock, SectionHeader } from '@svadmin/ui';
  import * as Card from '@svadmin/ui/components/ui/card/index.js';
  import { CalendarDays, ChevronLeft, ChevronRight, Clock, Filter, Plus } from '@lucide/svelte';

  const i18n = useTranslation();

  interface CalendarEvent {
    id: number;
    title: string;
    type: string;
    startDate: string;
    status: string;
  }

  let { resourceName = 'calendar_events' } = $props<{ resourceName?: string }>();
  let monthOffset = $state(0);
  let selectedDay = $state(12);
  let selectedType = $state<string | null>(null);
  let viewMode = $state<'month' | 'agenda'>('month');

  const locale = $derived(i18n.locale);
  const isZh = $derived(locale === 'zh-CN');
  const query = useList({ resource: 'calendar_events', pagination: { mode: 'off' }, sorters: [{ field: 'startDate', order: 'asc' }] });
  const events = $derived((query.data?.data ?? []) as unknown as CalendarEvent[]);
  const displayDate = $derived(new Date(Date.UTC(2026, 5 + monthOffset, 1)));
  const displayYear = $derived(displayDate.getUTCFullYear());
  const displayMonth = $derived(displayDate.getUTCMonth() + 1);
  const daysInMonth = $derived(new Date(Date.UTC(displayYear, displayMonth, 0)).getUTCDate());
  const monthDays = $derived(Array.from({ length: daysInMonth }, (_, index) => index + 1));
  const filteredEvents = $derived(selectedType ? events.filter((event) => event.type === selectedType) : events);
  const visibleEvents = $derived(filteredEvents.filter((event) => event.startDate.startsWith(monthKey())));
  const selectedDate = $derived(`${displayYear}-${String(displayMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`);
  const selectedDayEvents = $derived(filteredEvents.filter((event) => event.startDate === selectedDate));
  const typeStats = $derived(['purchase', 'cycle_count', 'receiving', 'review'].map((type) => ({
    type,
    count: events.filter((event) => event.type === type).length,
  })));
  const statusStats = $derived(['scheduled', 'completed', 'planned'].map((status) => ({
    status,
    count: events.filter((event) => event.status === status).length,
  })));
  const nextEvent = $derived(events[0]);

  function eventsForDay(day: number): CalendarEvent[] {
    const dayKey = `${monthKey()}-${String(day).padStart(2, '0')}`;
    return filteredEvents.filter((event) => event.startDate === dayKey);
  }

  function monthKey(): string {
    return `${displayYear}-${String(displayMonth).padStart(2, '0')}`;
  }

  function monthTitle(): string {
    const monthName = displayDate.toLocaleString(isZh ? 'zh-CN' : 'en-US', { month: 'long', timeZone: 'UTC' });
    return isZh ? `${displayYear} 年 ${displayMonth} 月运营日历` : `${monthName} ${displayYear} Operations Calendar`;
  }

  function shiftMonth(delta: number): void {
    monthOffset += delta;
    selectedDay = 1;
  }

  function selectDay(day: number): void {
    selectedDay = day;
  }

  function typeLabel(type: string): string {
    if (!isZh) return type.replace('_', ' ');
    if (type === 'purchase') return '采购';
    if (type === 'cycle_count') return '盘点';
    if (type === 'receiving') return '收货';
    if (type === 'review') return '复盘';
    return type;
  }

  function statusLabel(status: string): string {
    if (!isZh) return status.replace('_', ' ');
    if (status === 'scheduled') return '已排期';
    if (status === 'completed') return '已完成';
    if (status === 'planned') return '计划中';
    return status;
  }
</script>

{#snippet headerActions()}
  <Button variant="outline" size="sm" onclick={() => selectedType = selectedType ? null : 'purchase'}><Filter class="h-4 w-4" />{selectedType ? typeLabel(selectedType) : (isZh ? '筛选' : 'Filter')}</Button>
  <Button size="sm"><Plus class="h-4 w-4" />{isZh ? '新建日程' : 'New event'}</Button>
{/snippet}

<div data-app-page="calendar-workspace" data-resource-name={resourceName}>
<ContentPageShell pageId="calendar-workspace" width="wide">
  <ContentPageHeader eyebrow={isZh ? '日程应用' : 'Calendar app'} title={isZh ? '运营日程控制台' : 'Operations schedule console'} description={isZh ? '用月视图、议程列表、类型过滤和状态摘要管理计划作业。' : 'Manage planned work with month view, agenda, type filters, and status summaries.'} actions={headerActions} />
  <section class="grid gap-3 sm:grid-cols-3">
    <MetricBlock label={isZh ? '日程总数' : 'Total events'} value={events.length} detail={isZh ? '当前计划作业' : 'Planned work'} />
    <MetricBlock label={isZh ? '下一项' : 'Next event'} value={nextEvent?.title ?? '-'} detail={nextEvent?.startDate} />
    <MetricBlock label={isZh ? '当前视图' : 'Current view'} value={viewMode === 'month' ? (isZh ? '月' : 'Month') : (isZh ? '议程' : 'Agenda')} detail={selectedType ? typeLabel(selectedType) : (isZh ? '全部类型' : 'All types')} />
  </section>
  <section class="space-y-3"><SectionHeader title={isZh ? '类型过滤' : 'Type filters'} /><div class="flex flex-wrap gap-2">{#each typeStats as item (item.type)}<Button size="sm" variant={selectedType === item.type ? 'default' : 'outline'} onclick={() => selectedType = selectedType === item.type ? null : item.type}>{typeLabel(item.type)}<Badge variant="secondary">{item.count}</Badge></Button>{/each}<Button size="sm" variant={viewMode === 'month' ? 'default' : 'outline'} onclick={() => viewMode = 'month'}>{isZh ? '月视图' : 'Month'}</Button><Button size="sm" variant={viewMode === 'agenda' ? 'default' : 'outline'} onclick={() => viewMode = 'agenda'}>{isZh ? '议程' : 'Agenda'}</Button></div></section>

  <section class="grid gap-4 xl:grid-cols-[1fr_0.36fr]">
    <Card.Root class="overflow-hidden">
      <Card.Header class="flex flex-row items-center justify-between border-b">
        <div>
          <Badge>{isZh ? '计划日程' : 'Calendar'}</Badge>
          <Card.Title class="mt-3 flex items-center gap-2 text-2xl"><CalendarDays class="h-6 w-6 text-primary" />{monthTitle()}</Card.Title>
          <Card.Description>{isZh ? '把采购、盘点、收货和复盘落到月视图。' : 'Map purchasing, counts, receiving, and reviews into a month view.'}</Card.Description>
        </div>
        <div class="hidden gap-2 sm:flex"><Button variant="outline" size="icon" onclick={() => shiftMonth(-1)} aria-label={isZh ? '上个月' : 'Previous month'}><ChevronLeft class="h-4 w-4" /></Button><Button variant="outline" size="icon" onclick={() => shiftMonth(1)} aria-label={isZh ? '下个月' : 'Next month'}><ChevronRight class="h-4 w-4" /></Button></div>
      </Card.Header>
      <Card.Content class="p-0">
        <div class="grid grid-cols-7 border-b bg-muted/30 text-center text-xs font-semibold text-muted-foreground">
          {#each (isZh ? ['一','二','三','四','五','六','日'] : ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']) as weekday (weekday)}
            <div class="px-2 py-3">{weekday}</div>
          {/each}
        </div>
        <div class={`${viewMode === 'agenda' ? 'block' : 'block sm:hidden'} divide-y`}>
          {#each visibleEvents as event (event.id)}
            <a href="#/calendar_events" class="block px-4 py-3">
              <div class="flex items-center justify-between gap-3">
                <p class="text-sm font-semibold">{event.title}</p>
                <Badge variant="outline">{typeLabel(event.type)}</Badge>
              </div>
              <p class="mt-1 text-xs text-muted-foreground">{event.startDate} · {statusLabel(event.status)}</p>
            </a>
          {:else}
            <p class="px-4 py-6 text-sm text-muted-foreground">{isZh ? '当前月份没有匹配日程。' : 'No matching events in this month.'}</p>
          {/each}
        </div>
        <div class={`${viewMode === 'month' ? 'hidden sm:grid sm:grid-cols-7' : 'hidden'}`}>
          {#each monthDays as day (day)}
            <button
              class={`min-h-28 border-b border-r p-3 text-left transition ${selectedDay === day ? 'bg-primary/5 ring-1 ring-inset ring-primary/30' : 'hover:bg-muted/35'}`}
              onclick={() => selectDay(day)}
            >
              <p class="text-xs font-semibold text-muted-foreground">{day}</p>
              <div class="mt-2 space-y-1">
                {#each eventsForDay(day) as event (event.id)}
                  <span class="block rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">{event.title}</span>
                {/each}
              </div>
            </button>
          {/each}
        </div>
      </Card.Content>
    </Card.Root>

    <div class="grid gap-4 content-start">
      <Card.Root>
        <Card.Header><Card.Title class="text-base">{isZh ? '选中日期' : 'Selected Day'}</Card.Title></Card.Header>
        <Card.Content class="space-y-3">
          {#each selectedDayEvents as event (event.id)}
            <div class="rounded-lg border bg-card p-3">
              <div class="flex items-center justify-between gap-3"><p class="text-sm font-semibold">{event.title}</p><Badge variant="outline">{typeLabel(event.type)}</Badge></div>
              <p class="mt-1 text-xs text-muted-foreground">{event.startDate} · {statusLabel(event.status)}</p>
            </div>
          {:else}
            <div class="rounded-lg border bg-card p-3 text-sm text-muted-foreground">
              {selectedDate} · {isZh ? '暂无日程' : 'No events'}
            </div>
          {/each}
        </Card.Content>
      </Card.Root>
      <Card.Root>
        <Card.Content class="p-5">
          <p class="text-xs font-semibold text-muted-foreground">{isZh ? '本周焦点' : 'This week'}</p>
          <p class="mt-2 text-3xl font-semibold">{visibleEvents.length}</p>
          <p class="mt-1 text-xs text-muted-foreground">{isZh ? '个当前月份日程需要跟进' : 'events in the current month to follow'}</p>
        </Card.Content>
      </Card.Root>
      <Card.Root>
        <Card.Header><Card.Title class="flex items-center gap-2 text-base"><Clock class="h-4 w-4 text-primary" />{isZh ? '状态摘要' : 'Status Summary'}</Card.Title></Card.Header>
        <Card.Content class="space-y-2">
          {#each statusStats as item (item.status)}
            <div class="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
              <span>{statusLabel(item.status)}</span>
              <Badge variant="outline">{item.count}</Badge>
            </div>
          {/each}
        </Card.Content>
      </Card.Root>
    </div>
  </section>
</ContentPageShell>
</div>
