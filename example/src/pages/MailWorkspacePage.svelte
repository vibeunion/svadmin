<script lang="ts">
  import { beforeEach, captureAdminContext, useCreate, useInvalidate, useList, useUpdateMany } from '@svadmin/core';
  import { onMount } from 'svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { Badge, Button, ContentPageShell, ContentPageHeader } from '@svadmin/ui';
  import { Plus, Send, Save, Reply, Forward, Archive } from '@lucide/svelte';
  import { demoContract, demoContracts } from '../resource-contracts';
  import { demoRenderers } from '../resource-rendering';
  import type { DemoRow } from '../resource-schemas';
  import WorkspaceQueryState from './WorkspaceQueryState.svelte';
  import WorkspaceRecordLinks from './WorkspaceRecordLinks.svelte';
  import { executeLocalMail } from '../providers/mail-operations';
  import type { ReceivedMailFolder } from '../providers/inMemoryDb';
  import { mailSourceFingerprint } from '../providers/mail-source';

  let { resourceName = 'mail_inbox' } = $props<{ resourceName?: string }>();
  const i18n = useTranslation();
  const context = captureAdminContext();
  let mounted = false;
  const isZh = $derived(i18n.locale === 'zh-CN');
  let selectedId = $state<string | number | null>(null);
  let composerOpen = $state(false);
  let draftId = $state<number | null>(null);
  let draftFingerprint = $state('');
  let recipient = $state('');
  let subject = $state('');
  let body = $state('');
  let search = $state('');
  let unreadOnly = $state(false);
  let busy = $state(false);
  let feedback = $state('');
  let hasComposer = $state(false);
  let savedContent = $state('["","",""]');
  const currentContent = $derived(JSON.stringify([recipient, subject, body]));
  const dirty = $derived(hasComposer && currentContent !== savedContent);
  function allowLeave(): boolean {
    if (busy) return false;
    if (dirty && !window.confirm(isZh ? '草稿尚未保存，离开将丢失修改。仍要离开？' : 'Unsaved draft changes will be lost. Leave anyway?')) return false;
    savedContent = currentContent;
    return true;
  }
  onMount(() => {
    mounted = true;
    const unregister = beforeEach((to, from) => to === from || allowLeave());
    const protectLink = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
      if (!link || event.defaultPrevented || event.ctrlKey || event.metaKey || link.target === '_blank') return;
      if (link.hash && link.hash !== window.location.hash && !allowLeave()) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    const protectUnload = (event: BeforeUnloadEvent) => {
      if (dirty || busy) { event.preventDefault(); event.returnValue = ''; }
    };
    document.addEventListener('click', protectLink, true);
    window.addEventListener('beforeunload', protectUnload);
    return () => {
      mounted = false;
      unregister();
      document.removeEventListener('click', protectLink, true);
      window.removeEventListener('beforeunload', protectUnload);
    };
  });
  const query = useList({ get resource() { return demoContract(resourceName); }, pagination: { mode: 'off' } });
  const inboxQuery = useList({ resource: demoContracts.mail_inbox, pagination: { mode: 'off' } });
  const createDraft = useCreate({ resource: demoContracts.mail_draft });
  const updateDraft = useUpdateMany({ resource: demoContracts.mail_draft });
  const invalidateCurrent = useInvalidate({ get resource() { return demoContract(resourceName); } });
  const invalidateInbox = useInvalidate({ resource: demoContracts.mail_inbox });
  const invalidateArchive = useInvalidate({ resource: demoContracts.mail_archive });
  const invalidateDraft = useInvalidate({ resource: demoContracts.mail_draft });
  const invalidateSent = useInvalidate({ resource: demoContracts.mail_sent });
  const update = useUpdateMany({ get resource() { return demoContract(resourceName); } });
  type MailMessage = DemoRow<'mail_inbox' | 'mail_draft' | 'mail_sent'>;
  function normalize(message: MailMessage) {
    return {
      sourceFingerprint: mailSourceFingerprint(message),
      id: message.id, subject: message.subject, body: message.body,
      sender: 'sender' in message ? message.sender : '',
      to: 'to' in message ? message.to : '',
      date: 'date' in message ? message.date : 'sentAt' in message ? message.sentAt : message.updatedAt,
      unread: 'unread' in message && message.unread,
    };
  }
  const messages = $derived.by(() => {
    const rows = query.data?.data ?? [];
    switch (resourceName) {
      case 'mail_inbox': return demoRenderers.mail_inbox.records(rows).map(normalize);
      case 'mail_draft': return demoRenderers.mail_draft.records(rows).map(normalize);
      case 'mail_sent': return demoRenderers.mail_sent.records(rows).map(normalize);
      case 'mail_archive': return demoRenderers.mail_archive.records(rows).map(normalize);
      case 'mail_snoozed': return demoRenderers.mail_snoozed.records(rows).map(normalize);
      case 'mail_spam': return demoRenderers.mail_spam.records(rows).map(normalize);
      case 'mail_trash': return demoRenderers.mail_trash.records(rows).map(normalize);
      default: return [];
    }
  });
  const filtered = $derived(messages.filter(message => (!unreadOnly || message.unread) && `${message.subject} ${message.sender || message.to} ${message.body}`.toLowerCase().includes(search.trim().toLowerCase())));
  const selected = $derived(filtered.find(message => message.id === selectedId) ?? filtered[0]);
  const folders = $derived([
    { name: 'mail_inbox', title: isZh ? '收件箱' : 'Inbox' },
    { name: 'mail_draft', title: isZh ? '草稿箱' : 'Drafts' },
    { name: 'mail_sent', title: isZh ? '已发送（本地）' : 'Sent (local)' },
    { name: 'mail_archive', title: isZh ? '归档' : 'Archive' },
    { name: 'mail_snoozed', title: isZh ? '稍后提醒' : 'Snoozed' },
    { name: 'mail_spam', title: isZh ? '垃圾邮件' : 'Spam' },
    { name: 'mail_trash', title: isZh ? '废纸篓' : 'Trash' },
  ]);
  const title = $derived(folders.find(folder => folder.name === resourceName)?.title ?? '');
  const isReceivedFolder = $derived(!['mail_draft', 'mail_sent'].includes(resourceName));
  let refreshNeeded = $state(false);
  async function refreshMail(): Promise<void> {
    const results = await Promise.allSettled([
      invalidateCurrent(), invalidateInbox(), invalidateArchive(), invalidateDraft(), invalidateSent(),
    ]);
    const views = await Promise.allSettled([query.refetch(), inboxQuery.refetch()]);
    refreshNeeded = results.some(result => result.status === 'rejected') ||
      views.some(result => result.status === 'rejected' || result.value.isError);
  }
  function compose(mode: 'new' | 'reply' | 'forward' | 'draft'): void {
    if (busy) return;
    if (dirty && !window.confirm(isZh ? '放弃当前未保存草稿？' : 'Discard the unsaved draft?')) return;
    draftId = mode === 'draft' && selected && typeof selected.id === 'number' ? selected.id : null;
    draftFingerprint = draftId === null ? '' : selected?.sourceFingerprint ?? '';
    recipient = mode === 'reply' ? String(selected?.['sender'] ?? '') : mode === 'draft' ? String(selected?.['to'] ?? '') : '';
    subject = mode === 'new' ? '' : `${mode === 'reply' ? 'Re: ' : mode === 'forward' ? 'Fwd: ' : ''}${selected?.['subject'] ?? ''}`;
    body = mode === 'new' ? '' : mode === 'reply' ? `\n\n> ${selected?.['body'] ?? ''}` : String(selected?.['body'] ?? '');
    savedContent = mode === 'draft' ? JSON.stringify([recipient, subject, body]) : '["","",""]';
    hasComposer = true; composerOpen = true; feedback = '';
  }
  async function saveMail(send: boolean): Promise<void> {
    if (busy) return;
    if (!subject.trim() || !body.trim() || (send && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.trim()))) {
      feedback = isZh ? '请填写主题、正文；发送还需要有效收件地址。' : 'Enter a subject and body; sending also requires a valid recipient.';
      return;
    }
    busy = true; feedback = '';
    try {
      if (send) {
        await executeLocalMail(context, { kind: 'send', input: {
          to: recipient.trim(), subject: subject.trim(), body,
          ...(draftId === null ? {} : { draftId, expectedSource: draftFingerprint }),
        } }, () => mounted);
        composerOpen = false; hasComposer = false; recipient = ''; subject = ''; body = ''; draftId = null; draftFingerprint = '';
        savedContent = '["","",""]';
        feedback = isZh ? '已写入本地已发送，未发送真实邮件。' : 'Saved to local Sent. No real email was delivered.';
      } else {
        const variables = { to: recipient.trim(), subject: subject.trim(), body, updatedAt: new Date().toISOString() };
        if (draftId !== null) {
          const result = await updateDraft.mutation.mutateAsync({ ids: [draftId], variables });
          const saved = result.data.find(item => item.id === draftId);
          if (!saved) throw new Error('Saved draft missing');
          draftFingerprint = mailSourceFingerprint(saved);
        } else {
          const saved = (await createDraft.mutation.mutateAsync({ variables })).data;
          draftId = saved.id;
          draftFingerprint = mailSourceFingerprint(saved);
        }
        savedContent = currentContent;
        feedback = isZh ? '草稿已保存。' : 'Draft saved.';
      }
      await refreshMail();
    } catch { feedback = isZh ? '操作未完成，内容已保留，请检查列表后重试。' : 'Operation incomplete. Content retained; check the list before retrying.'; }
    finally { busy = false; }
  }
  async function move(target: 'archive' | 'inbox'): Promise<void> {
    if (!selected || busy || !isReceivedFolder) return;
    if (typeof selected.id !== 'number') return;
    busy = true; feedback = '';
    try {
      await executeLocalMail(context, { kind: 'move', input: {
        source: resourceName as ReceivedMailFolder, target: target === 'archive' ? 'mail_archive' : 'mail_inbox',
        id: selected.id, expectedSource: selected.sourceFingerprint,
      } }, () => mounted);
      selectedId = null;
      feedback = isZh ? '邮件已移动。' : 'Message moved.';
      await refreshMail();
    } catch { feedback = isZh ? '移动失败，源邮件和目标文件夹未改变，请重试。' : 'Move failed. Source and destination are unchanged. Please retry.'; }
    finally { busy = false; }
  }
  async function markRead(): Promise<void> {
    if (!selected || busy) return;
    busy = true;
    try { await update.mutation.mutateAsync({ ids: [selected.id], variables: { unread: false } }); await query.refetch(); await inboxQuery.refetch(); }
    catch { feedback = isZh ? '标记失败，请重试。' : 'Unable to mark read. Retry.'; }
    finally { busy = false; }
  }
</script>

{#snippet actions()}{#if hasComposer && !composerOpen}<Button variant="outline" disabled={busy} onclick={() => composerOpen = true}>{isZh ? '继续编辑' : 'Resume editing'}</Button>{/if}<Button disabled={busy} onclick={() => compose('new')}><Plus class="size-4" />{isZh ? '写信' : 'Compose'}</Button>{/snippet}
<div data-app-page="mail-workspace" data-resource-name={resourceName}>
  <ContentPageShell pageId="mail-workspace" width="wide">
    <ContentPageHeader {title} actions={actions} />
    <p class="text-sm text-muted-foreground">{isZh ? '本地邮件演示：草稿、已发送和文件夹变更保存到样例数据，不投递真实邮件。' : 'Local mail demo: drafts, sent messages and folder changes are saved to sample data. No real mail is delivered.'}</p>
    {#if feedback}<p role="status">{feedback}</p>{/if}
    {#if refreshNeeded}<p role="alert">{isZh ? '写入已完成，但列表刷新失败。请刷新列表，不要重复提交。' : 'Write completed, but list refresh failed. Refresh the list; do not resubmit.'}</p><Button variant="outline" disabled={busy} onclick={() => void refreshMail()}>{isZh ? '刷新邮件列表' : 'Refresh mail lists'}</Button>{/if}
    {#if composerOpen}
      <form class="space-y-3 border-y py-4" onsubmit={(event) => { event.preventDefault(); void saveMail(true); }}>
        <label class="block text-sm">{isZh ? '收件人' : 'To'}<input type="email" class="mt-1 w-full rounded-md border bg-background p-2" bind:value={recipient} disabled={busy} /></label>
        <label class="block text-sm">{isZh ? '主题' : 'Subject'}<input class="mt-1 w-full rounded-md border bg-background p-2" bind:value={subject} disabled={busy} required /></label>
        <label class="block text-sm">{isZh ? '正文' : 'Body'}<textarea class="mt-1 min-h-32 w-full rounded-md border bg-background p-2" bind:value={body} disabled={busy} required></textarea></label>
        <div class="flex flex-wrap gap-3"><Button type="submit" disabled={busy}><Send class="size-4" />{isZh ? '发送到本地' : 'Send locally'}</Button><Button type="button" variant="outline" disabled={busy} onclick={() => void saveMail(false)}><Save class="size-4" />{isZh ? '保存草稿' : 'Save draft'}</Button><Button type="button" variant="ghost" disabled={busy} onclick={() => composerOpen = false}>{isZh ? '收起' : 'Collapse'}</Button></div>
      </form>
    {/if}
    <div class="grid gap-5 lg:grid-cols-[11rem_minmax(0,1fr)]">
      <nav class="flex flex-wrap gap-2 lg:block lg:space-y-2" aria-label={isZh ? '邮件文件夹' : 'Mail folders'}>
        {#each folders as folder (folder.name)}<a class="flex justify-between gap-2 rounded-md px-2 py-2 text-sm text-primary" aria-current={folder.name === resourceName ? 'page' : undefined} href={`#/${folder.name}`}>{folder.title}{#if folder.name === 'mail_inbox'}<Badge variant="outline">{inboxQuery.isLoading || inboxQuery.isError ? '—' : inboxQuery.data?.data.filter(item => item.unread).length ?? 0}</Badge>{/if}</a>{/each}
        <a class="block px-2 py-2 text-sm text-primary" href="#/user_settings?view=mail">{isZh ? '邮件设置' : 'Mail settings'}</a>
      </nav>
      <section class="min-w-0 space-y-4">
        <div class="flex flex-wrap items-center gap-3"><label class="min-w-0 flex-1 text-sm">{isZh ? '搜索邮件' : 'Search mail'}<input class="mt-1 w-full rounded-md border bg-background p-2" bind:value={search} /></label>{#if isReceivedFolder}<label class="flex items-center gap-2 text-sm"><input type="checkbox" bind:checked={unreadOnly} />{isZh ? '仅未读' : 'Unread only'}</label>{/if}</div>
        <WorkspaceQueryState {query} count={filtered.length}>
          <div class="grid gap-5 xl:grid-cols-[minmax(14rem,0.8fr)_minmax(0,1.2fr)]">
            <div class="divide-y">{#each filtered as message (message.id)}<button class="block w-full px-2 py-3 text-left" aria-pressed={selected?.id === message.id} onclick={() => selectedId = message.id}><strong class="block break-words text-sm">{message.subject}</strong><span class="mt-1 block break-words text-xs text-muted-foreground">{message.sender || message.to} · {message.date}</span></button>{/each}</div>
            {#if selected}
              <article class="min-w-0 border-t pt-4 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
                <h2 class="break-words text-base font-semibold">{String(selected['subject'])}</h2>
                <p class="mt-3 whitespace-pre-wrap break-words text-sm leading-6">{String(selected['body'])}</p>
                <div class="mt-5 flex flex-wrap gap-2">
                  {#if resourceName === 'mail_draft'}<Button disabled={busy} onclick={() => compose('draft')}>{isZh ? '继续草稿' : 'Continue draft'}</Button>{:else}<Button variant="outline" disabled={busy} onclick={() => compose('reply')}><Reply class="size-4" />{isZh ? '回复' : 'Reply'}</Button><Button variant="outline" disabled={busy} onclick={() => compose('forward')}><Forward class="size-4" />{isZh ? '转发' : 'Forward'}</Button>{/if}
                  {#if isReceivedFolder}
                    <Button variant="outline" disabled={busy} onclick={() => void move(resourceName === 'mail_inbox' ? 'archive' : 'inbox')}><Archive class="size-4" />{resourceName === 'mail_inbox' ? (isZh ? '归档' : 'Archive') : (isZh ? '移回收件箱' : 'Restore to inbox')}</Button>
                    {#if selected['unread']}<Button variant="outline" disabled={busy} onclick={() => void markRead()}>{isZh ? '标为已读' : 'Mark read'}</Button>{/if}
                  {/if}
                </div>
                <WorkspaceRecordLinks resource={resourceName} id={selected.id} />
              </article>
            {/if}
          </div>
        </WorkspaceQueryState>
      </section>
    </div>
  </ContentPageShell>
</div>
