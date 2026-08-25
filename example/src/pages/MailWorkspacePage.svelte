<script lang="ts">
  import { useList } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import { Badge, Button, ContentPageHeader, ContentPageShell, MetricBlock, SectionHeader } from '@svadmin/ui';
  import * as Card from '@svadmin/ui/components/ui/card/index.js';
  import { Archive, Clock, FileText, Inbox, Mail, Paperclip, Plus, Send, ShieldAlert, Trash2 } from '@lucide/svelte';
  import { readHashView } from '../utils/hashView';

  const i18n = useTranslation();

  interface MailMessage {
    id: number;
    sender?: string;
    to?: string;
    subject: string;
    body: string;
    date?: string;
    sentAt?: string;
    updatedAt?: string;
    unread?: boolean;
  }

  let { resourceName = 'mail_inbox' } = $props<{ resourceName?: string }>();
  let activeView = $state(readHashView('folder'));
  let selectedMessageId = $state<number | null>(null);
  let composerOpen = $state(false);

  const locale = $derived(i18n.locale);
  const isZh = $derived(locale === 'zh-CN');
  const inboxQuery = useList({ resource: 'mail_inbox', pagination: { mode: 'off' } });
  const draftQuery = useList({ resource: 'mail_draft', pagination: { mode: 'off' } });
  const sentQuery = useList({ resource: 'mail_sent', pagination: { mode: 'off' } });
  const archiveQuery = useList({ resource: 'mail_archive', pagination: { mode: 'off' } });
  const snoozedQuery = useList({ resource: 'mail_snoozed', pagination: { mode: 'off' } });
  const spamQuery = useList({ resource: 'mail_spam', pagination: { mode: 'off' } });
  const trashQuery = useList({ resource: 'mail_trash', pagination: { mode: 'off' } });
  const query = $derived.by(() => {
    if (resourceName === 'mail_draft') return draftQuery;
    if (resourceName === 'mail_sent') return sentQuery;
    if (resourceName === 'mail_archive') return archiveQuery;
    if (resourceName === 'mail_snoozed') return snoozedQuery;
    if (resourceName === 'mail_spam') return spamQuery;
    if (resourceName === 'mail_trash') return trashQuery;
    return inboxQuery;
  });
  const messages = $derived((query.data?.data ?? []) as unknown as MailMessage[]);
  const selected = $derived(messages.find((message) => message.id === selectedMessageId) ?? messages[0]);
  const unread = $derived(messages.filter((message) => message.unread).length);
  const labels = $derived([
    { name: isZh ? '运营' : 'Operations', count: inboxQuery.data?.total ?? 0 },
    { name: isZh ? '财务' : 'Finance', count: 1 },
    { name: isZh ? '资产' : 'Property', count: 1 },
  ]);
  const normalizedView = $derived(activeView === 'categories' ? 'categories' : 'folder');
  const mailUtilities = $derived([
    { key: 'direct', label: isZh ? '直接消息' : 'Direct Messages', href: '#/notifications?view=direct', hint: isZh ? '团队即时沟通' : 'team conversations', count: 3 },
    { key: 'support', label: isZh ? '支持' : 'Support', href: '#/notifications?view=support', hint: isZh ? '客户和内部请求' : 'customer and internal requests', count: 2 },
    { key: 'settings', label: isZh ? '设置' : 'Settings', href: '#/user_settings?view=mail', hint: isZh ? '签名、规则、通知' : 'signature, rules, notifications', count: 4 },
    { key: 'feedback', label: isZh ? '反馈' : 'Feedback', href: '#/notifications?view=feedback', hint: isZh ? '体验建议与回访' : 'experience notes and follow-up', count: 1 },
  ]);
  const categories = $derived([
    { label: isZh ? '优先处理' : 'Priority', tone: 'bg-destructive/10 text-destructive' },
    { label: isZh ? '对账' : 'Reconciliation', tone: 'bg-info/10 text-info' },
    { label: isZh ? '看房确认' : 'Tour confirmation', tone: 'bg-success/10 text-success' },
  ]);

  const folders = $derived([
    { label: isZh ? '收件箱' : 'Inbox', href: '#/mail_inbox', count: unread, Icon: Inbox },
    { label: isZh ? '草稿箱' : 'Drafts', href: '#/mail_draft', count: draftQuery.data?.total ?? 0, Icon: FileText },
    { label: isZh ? '已发送' : 'Sent', href: '#/mail_sent', count: sentQuery.data?.total ?? 0, Icon: Send },
    { label: isZh ? '归档' : 'Archive', href: '#/mail_archive', count: archiveQuery.data?.total ?? 0, Icon: Archive },
    { label: isZh ? '稍后提醒' : 'Snoozed', href: '#/mail_snoozed', count: snoozedQuery.data?.total ?? 0, Icon: Clock },
    { label: isZh ? '垃圾邮件' : 'Spam', href: '#/mail_spam', count: spamQuery.data?.total ?? 0, Icon: ShieldAlert },
    { label: isZh ? '废纸篓' : 'Trash', href: '#/mail_trash', count: trashQuery.data?.total ?? 0, Icon: Trash2 },
  ]);

  function messageDate(message: MailMessage): string {
    return message.date ?? message.sentAt ?? message.updatedAt ?? '';
  }

  const viewCopy = $derived.by(() => {
    if (normalizedView === 'categories') {
      return {
        badge: isZh ? '分类' : 'Categories',
        title: isZh ? '邮件分类与标签' : 'Mail Categories and Labels',
        description: isZh ? '把归档邮件按优先级、对账、看房确认等运营标签重新组织。' : 'Reorganize archived mail by priority, reconciliation, tour confirmation, and other operations labels.',
      };
    }
    return {
      badge: isZh ? '消息与邮件' : 'Messages & Mail',
      title: isZh ? '收件箱处理队列' : 'Inbox Processing Queue',
      description: isZh ? '把未读、草稿、归档和运营标签放在同一个工作流。' : 'Unify unread mail, drafts, archive, and operations tags in one workflow.',
    };
  });

  function syncView(): void {
    activeView = readHashView('folder');
  }
</script>

<svelte:window onhashchange={syncView} onpopstate={syncView} />

{#snippet headerActions()}
  <Button size="sm" onclick={() => composerOpen = !composerOpen}><Plus class="h-4 w-4" />{isZh ? '写信' : 'Compose'}</Button>
{/snippet}

<div data-app-page="mail-workspace" data-mail-view={normalizedView}>
<ContentPageShell pageId="mail-workspace" width="wide">
  <ContentPageHeader eyebrow={viewCopy.badge} title={viewCopy.title} description={viewCopy.description} actions={headerActions} />
  <section class="grid gap-3 sm:grid-cols-3">
    <MetricBlock label={isZh ? '未读' : 'Unread'} value={unread} detail={isZh ? '需要处理' : 'Need attention'} trendTone={unread > 0 ? 'warning' : 'positive'} />
    <MetricBlock label={isZh ? '草稿' : 'Drafts'} value={draftQuery.data?.total ?? 0} detail={isZh ? '尚未发送' : 'Not sent'} />
    <MetricBlock label={isZh ? '已归档' : 'Archived'} value={archiveQuery.data?.total ?? 0} detail={isZh ? '已完成归档' : 'Completed'} />
  </section>
  <section class="space-y-3"><SectionHeader title={isZh ? '标签' : 'Labels'} description={isZh ? '标签只用于筛选和归属，不重复消息状态。' : 'Labels organize ownership without duplicating message state.'} /><div class="flex flex-wrap gap-2">{#each labels as label (label.name)}<Button variant="outline" size="sm">{label.name}<Badge variant="secondary">{label.count}</Badge></Button>{/each}</div></section>

  {#if composerOpen}
    <section class="rounded-lg border bg-card shadow-sm" data-mail-composer>
      <div class="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Badge>{isZh ? '撰写邮件' : 'Compose Mail'}</Badge>
          <h2 class="mt-3 text-xl font-semibold">{isZh ? '给运营团队发送一封跟进邮件' : 'Send a follow-up to the operations team'}</h2>
          <p class="mt-1 text-sm text-muted-foreground">{isZh ? '本地示例不会发送真实邮件，只演示邮件工作流结构。' : 'This local example does not send real mail; it demonstrates the workflow shape.'}</p>
        </div>
        <Button variant="outline" onclick={() => composerOpen = false}>{isZh ? '收起' : 'Collapse'}</Button>
      </div>
      <div class="grid gap-3 p-5 lg:grid-cols-[0.72fr_1.28fr]">
        <div class="space-y-3">
          <label class="block">
            <span class="text-xs font-medium text-muted-foreground">{isZh ? '收件人' : 'To'}</span>
            <input class="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" value="ops@example.com" readonly />
          </label>
          <label class="block">
            <span class="text-xs font-medium text-muted-foreground">{isZh ? '主题' : 'Subject'}</span>
            <input class="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" value={isZh ? '今日库存与客户跟进' : 'Today inventory and customer follow-up'} readonly />
          </label>
          <div class="flex flex-wrap gap-2">
            {#each categories as category (category.label)}
              <span class={`rounded-full px-2.5 py-1 text-xs font-medium ${category.tone}`}>{category.label}</span>
            {/each}
          </div>
        </div>
        <div class="rounded-lg border bg-background p-4">
          <p class="text-xs font-semibold text-muted-foreground">{isZh ? '正文草稿' : 'Draft body'}</p>
          <p class="mt-3 text-sm leading-6 text-muted-foreground">
            {isZh ? '团队好，今天请优先关注低库存 SKU、待确认看房和未读客户消息。我已经把相关任务同步到待办和日历。' : 'Hi team, please prioritize low-stock SKUs, pending tours, and unread customer messages today. I have synced the related work into Todo and Calendar.'}
          </p>
          <div class="mt-4 flex flex-wrap gap-2">
            <Button><Send class="mr-2 h-4 w-4" />{isZh ? '发送示例' : 'Send demo'}</Button>
            <Button variant="outline">{isZh ? '保存草稿' : 'Save draft'}</Button>
          </div>
        </div>
      </div>
    </section>
  {/if}

  <section class="grid gap-4 xl:grid-cols-[0.68fr_1fr_1.15fr]">
    <Card.Root class="overflow-hidden">
      <Card.Header class="border-b">
        <Card.Title class="flex items-center gap-2 text-base"><Mail class="h-5 w-5 text-primary" />{isZh ? '邮件中心' : 'Mail Center'}</Card.Title>
        <Card.Description>{isZh ? '文件夹、标签和运营消息统一处理。' : 'Folders, labels, and operational mail in one workflow.'}</Card.Description>
      </Card.Header>
      <Card.Content class="space-y-2 p-3">
        {#each folders as folder (folder.href)}
          <a href={folder.href} class="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition hover:bg-muted/50">
            <span class="flex items-center gap-2"><folder.Icon class="h-4 w-4 text-muted-foreground" />{folder.label}</span>
            <Badge variant="outline">{folder.count}</Badge>
          </a>
        {/each}
        <div class="my-3 border-t"></div>
        <p class="px-3 text-xs font-semibold text-muted-foreground">{isZh ? '协作' : 'Collaboration'}</p>
        {#each mailUtilities as item (item.key)}
          <a href={item.href} class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition hover:bg-muted/50">
            <span>
              <span class="block">{item.label}</span>
              <span class="text-xs text-muted-foreground">{item.hint}</span>
            </span>
            <Badge variant="outline">{item.count}</Badge>
          </a>
        {/each}
      </Card.Content>
    </Card.Root>

    <Card.Root class="overflow-hidden">
      <Card.Header class="border-b">
        <Card.Title class="text-base">{isZh ? '消息列表' : 'Message List'}</Card.Title>
        <Card.Description>{isZh ? '按未读、日期和主题快速分拣。' : 'Triage by unread state, date, and subject.'}</Card.Description>
      </Card.Header>
      <Card.Content class="p-0">
        <div class="divide-y">
          {#each messages as message (message.id)}
            <button
              class={`block w-full px-4 py-3 text-left transition ${selected?.id === message.id ? 'bg-primary/5' : 'hover:bg-muted/40'}`}
              onclick={() => selectedMessageId = message.id}
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold">{message.subject}</p>
                  <p class="mt-1 truncate text-xs text-muted-foreground">{message.sender ?? message.to}</p>
                </div>
                {#if message.unread}<span class="mt-1 h-2 w-2 rounded-full bg-primary"></span>{/if}
              </div>
              <p class="mt-2 line-clamp-2 text-xs text-muted-foreground">{message.body}</p>
              <p class="mt-2 text-xs text-primary">{messageDate(message)}</p>
            </button>
          {/each}
        </div>
      </Card.Content>
    </Card.Root>

    <Card.Root class="overflow-hidden border-primary/20">
      <Card.Header class="border-b">
        <Badge>{isZh ? '阅读面板' : 'Reading Pane'}</Badge>
        <Card.Title class="mt-3 text-xl">{selected?.subject ?? (isZh ? '暂无邮件' : 'No message selected')}</Card.Title>
        <Card.Description>{selected ? `${selected.sender ?? selected.to} · ${messageDate(selected)}` : ''}</Card.Description>
      </Card.Header>
      <Card.Content class="space-y-4 p-5">
        <p class="rounded-lg border bg-muted/25 p-4 text-sm leading-6 text-muted-foreground">
          {selected?.body ?? (isZh ? '当前文件夹暂无可读消息。' : 'There is no readable message in this folder.')}
        </p>
        <div class="rounded-lg border bg-background p-3">
          <p class="text-xs font-semibold text-muted-foreground">{isZh ? '快速回复' : 'Quick reply'}</p>
          <p class="mt-2 text-sm text-muted-foreground">{isZh ? '收到，我会在今天的运营复盘前处理。' : 'Received. I will handle this before today\'s operations review.'}</p>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="rounded-lg border bg-background p-3">
            <p class="flex items-center gap-2 text-xs font-semibold text-muted-foreground"><Paperclip class="h-3.5 w-3.5" />{isZh ? '附件' : 'Attachments'}</p>
            <p class="mt-2 text-sm text-muted-foreground">{isZh ? '本地示例：对账包、看房确认、盘点表。' : 'Demo metadata: reconciliation packet, tour confirmation, count sheet.'}</p>
          </div>
          <div class="rounded-lg border bg-background p-3">
            <p class="text-xs font-semibold text-muted-foreground">{isZh ? '邮件元信息' : 'Mail metadata'}</p>
            <p class="mt-2 text-sm text-muted-foreground">{resourceName.replace('mail_', '')} · {selected?.unread ? (isZh ? '未读' : 'unread') : (isZh ? '已读' : 'read')}</p>
          </div>
        </div>
        <div class="rounded-lg border bg-background p-3">
            <p class="text-xs font-semibold text-muted-foreground">{viewCopy.badge}</p>
          <div class="mt-3 flex flex-wrap gap-2">
            {#each categories as category (category.label)}
              <span class={`rounded-full px-2.5 py-1 text-xs font-medium ${category.tone}`}>{category.label}</span>
            {/each}
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <Button>{isZh ? '回复' : 'Reply'}</Button>
          <Button variant="outline">{isZh ? '转发' : 'Forward'}</Button>
          <Button variant="outline">{isZh ? '归档' : 'Archive'}</Button>
        </div>
      </Card.Content>
    </Card.Root>
  </section>
</ContentPageShell>
</div>
