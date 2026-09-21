<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { captureAdminContext, useCreate, useDeleteMany, useList, useUpdateMany, type ChatMessage, type ChatMessagePart } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import { Badge, Button, ContentPageHeader, ContentPageShell } from '@svadmin/ui';
  import { Heart, Plus, Send, Copy } from '@lucide/svelte';
  import { demoContracts } from '../resource-contracts';
  import { demoRenderers } from '../resource-rendering';
  import { readHashParam, readHashView } from '../utils/hashView';
  import { readSavedIds, saveIds } from './workspace-session';
  import WorkspaceQueryState from './WorkspaceQueryState.svelte';
  import WorkspaceRecordLinks from './WorkspaceRecordLinks.svelte';

  let { resourceName = 'ai_conversations' } = $props<{ resourceName?: string }>();
  const i18n = useTranslation();
  const context = captureAdminContext();
  const isZh = $derived(i18n.locale === 'zh-CN');
  let view = $state(readHashView('threads'));
  let selectedId = $state<number | null>(Number(readHashParam('thread')) || null);
  let draft = $state('');
  let busy = $state(false);
  let feedback = $state('');
  let favorites = $state<number[]>([]);
  let favoritesOnly = $state(false);
  let history = $state<Record<number, ChatMessage[]>>({});
  let controller: AbortController | undefined;
  const query = useList({ resource: demoContracts.ai_conversations, pagination: { mode: 'off' }, sorters: [{ field: 'updatedAt', order: 'desc' }] });
  const create = useCreate({ resource: demoContracts.ai_conversations });
  const update = useUpdateMany({ resource: demoContracts.ai_conversations });
  const remove = useDeleteMany({ resource: demoContracts.ai_conversations });
  const conversations = $derived(demoRenderers.ai_conversations.records(query.data?.data ?? []));
  const selected = $derived(view === 'new' ? undefined : conversations.find(item => item.id === selectedId) ?? conversations[0]);
  const messages = $derived(selected ? history[selected.id] ?? [{ id: `saved-${selected.id}`, role: 'assistant' as const, parts: [{ type: 'text' as const, text: selected.lastMessage }], createdAt: Date.parse(selected.updatedAt) }] : []);
  const prompts = $derived([
    isZh ? '汇总低库存和补货动作' : 'Summarize low stock and replenishment',
    isZh ? '检查待办任务' : 'Check open Todo tasks',
    isZh ? '查看未读通知' : 'Review unread notifications',
    isZh ? '库存概览' : 'Inventory overview',
  ]);
  onMount(() => { favorites = readSavedIds('svadmin-example-ai-favorites'); });
  onDestroy(() => controller?.abort());
  const textPart = (part: ChatMessagePart | string) => typeof part === 'string' ? part : part.type === 'text' ? part.text : '';
  const messageText = (message: ChatMessage) => message.parts.map(textPart).join('');
  function syncView(): void {
    view = readHashView('threads');
    selectedId = Number(readHashParam('thread')) || null;
  }
  function startNew(): void {
    if (busy) return;
    draft = ''; feedback = ''; window.location.hash = '/ai_conversations?view=new';
  }
  function usePrompt(prompt: string): void {
    if (busy) return;
    draft = prompt; window.location.hash = '/ai_conversations?view=new';
  }
  function toggleFavorite(id: number): void {
    const next = favorites.includes(id) ? favorites.filter(value => value !== id) : [...favorites, id];
    if (saveIds('svadmin-example-ai-favorites', next)) favorites = next;
    else feedback = isZh ? '收藏保存失败，请重试。' : 'Unable to save favorite. Please retry.';
  }
  async function copyConversation(): Promise<void> {
    try {
      await navigator.clipboard.writeText(messages.map(message => `${message.role}: ${messageText(message)}`).join('\n\n'));
      feedback = isZh ? '已复制对话。' : 'Conversation copied.';
    } catch { feedback = isZh ? '复制失败，可直接选择对话文字。' : 'Copy failed. Select the conversation text directly.'; }
  }
  async function clearHistory(): Promise<void> {
    if (busy || !conversations.length || !window.confirm(isZh ? '删除全部本地会话记录？此操作无法撤销。' : 'Delete all local conversation records? This cannot be undone.')) return;
    busy = true; feedback = '';
    try {
      await remove.mutation.mutateAsync({ ids: conversations.map(item => item.id) });
      history = {}; favorites = []; saveIds('svadmin-example-ai-favorites', []);
      selectedId = null;
      await query.refetch();
      window.location.hash = '/ai_conversations?view=new';
      feedback = isZh ? '本地历史已清理。' : 'Local history cleared.';
    } catch { feedback = isZh ? '清理失败，请重试。' : 'Unable to clear history. Retry.'; }
    finally { busy = false; }
  }
  async function send(): Promise<void> {
    const question = draft.trim();
    const provider = context.chatProvider;
    if (!question || busy) return;
    if (!provider) { feedback = isZh ? '助手未接入，草稿已保留。' : 'Assistant unavailable. Draft retained.'; return; }
    busy = true; feedback = '';
    controller = new AbortController();
    const thread = selected;
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', parts: [{ type: 'text', text: question }], createdAt: Date.now() };
    const previous = thread ? history[thread.id] ?? [] : [];
    try {
      const result = await provider.sendMessage([...previous, userMessage], { signal: controller.signal });
      let answer = '';
      if (typeof result === 'string') answer = result;
      else if (Array.isArray(result)) answer = result.map(textPart).join('');
      else for await (const part of result) answer += textPart(part);
      if (controller.signal.aborted) return;
      if (!answer.trim()) throw new Error('Empty response');
      let id = thread?.id;
      if (id === undefined) {
        const created = await create.mutation.mutateAsync({ variables: { title: question.slice(0, 120), intent: 'exception_review', ownerId: 1, status: 'open', lastMessage: answer, updatedAt: new Date().toISOString() } });
        id = created.data.id;
      } else {
        await update.mutation.mutateAsync({ ids: [id], variables: { lastMessage: answer, updatedAt: new Date().toISOString(), status: 'open' } });
      }
      history = { ...history, [id]: [...previous, userMessage, { id: crypto.randomUUID(), role: 'assistant', parts: [{ type: 'text', text: answer }], createdAt: Date.now() }] };
      draft = '';
      await query.refetch();
      selectedId = id;
      window.location.hash = `/ai_conversations?thread=${id}`;
    } catch {
      feedback = isZh ? '分析或保存失败，问题已保留。请检查会话列表后重试。' : 'Analysis or save failed. Your question is retained. Check the thread list before retrying.';
    } finally { busy = false; }
  }
</script>

<svelte:window onhashchange={syncView} onpopstate={syncView} />
{#snippet actions()}<Button disabled={busy} onclick={startNew}><Plus class="size-4" />{isZh ? '新建对话' : 'New conversation'}</Button>{/snippet}
<div data-app-page="ai-workspace" data-ai-view={view} data-resource-name={resourceName}>
  <ContentPageShell pageId="ai-workspace" width="wide">
    <ContentPageHeader title={isZh ? 'AI 助手工作区' : 'AI workspace'} actions={actions} />
    <p class="text-sm text-muted-foreground">{isZh ? '本地演示助手 · 只读查询样例数据，不调用外部模型。会话保存摘要；完整对话仅在当前页面保留。' : 'Local demo assistant · reads sample data without an external model. Thread summaries are saved; full transcripts last for this page session.'}</p>
    <nav class="flex flex-wrap gap-4 border-b pb-3 text-sm"><a class="text-primary" href="#/ai_conversations">{isZh ? '历史' : 'History'}</a><a class="text-primary" href="#/ai_conversations?view=templates">{isZh ? '模板' : 'Templates'}</a><a class="text-primary" href="#/ai_conversations?view=settings">{isZh ? '运行信息' : 'Runtime'}</a></nav>
    {#if feedback}<p role="status">{feedback}</p>{/if}
    {#if view === 'settings'}
      <section class="divide-y"><p class="py-3">{isZh ? '数据源：当前 example 本地数据' : 'Data source: current example data'}</p><p class="py-3">{isZh ? '模式：只读运营查询；不会自动创建任务、发送邮件或修改库存。' : 'Mode: read-only operations queries; no automatic task creation, email delivery, or inventory changes.'}</p><a class="block py-3 text-primary" href="#/user_settings?view=ai">{isZh ? '维护 AI 设置记录' : 'Manage AI settings records'}</a></section>
    {:else if view === 'templates'}
      <section class="divide-y">{#each prompts as prompt (prompt)}<article class="flex flex-wrap items-center justify-between gap-3 py-4"><h2 class="text-base">{prompt}</h2><Button disabled={busy} variant="outline" onclick={() => usePrompt(prompt)}>{isZh ? '使用模板' : 'Use template'}</Button></article>{/each}</section>
    {:else}
      <div class="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <aside class="min-w-0 border-b pb-4 lg:border-b-0 lg:border-r lg:pr-4">
          <label class="mb-3 flex items-center gap-2 text-sm"><input type="checkbox" bind:checked={favoritesOnly} />{isZh ? '仅收藏' : 'Favorites only'}</label>
          <WorkspaceQueryState {query} count={conversations.filter(item => !favoritesOnly || favorites.includes(item.id)).length}>
            {#each conversations.filter(item => !favoritesOnly || favorites.includes(item.id)) as thread (thread.id)}
              <div class="flex items-start gap-2 border-b py-3"><a class="min-w-0 flex-1 break-words text-sm text-primary" href={`#/ai_conversations?thread=${thread.id}`}>{thread.title}</a><Button size="icon" variant="ghost" aria-label={isZh ? '收藏会话' : 'Favorite thread'} aria-pressed={favorites.includes(thread.id)} onclick={() => toggleFavorite(thread.id)}><Heart class={favorites.includes(thread.id) ? 'size-4 fill-primary text-primary' : 'size-4'} /></Button></div>
            {/each}
          </WorkspaceQueryState>
          <details class="svadmin-collapsible mt-4 border-t pt-3"><summary class="cursor-pointer text-sm">{isZh ? '历史管理' : 'Manage history'}</summary><Button class="mt-3" variant="outline" disabled={busy || query.isLoading || query.isError || !conversations.length} onclick={() => void clearHistory()}>{isZh ? '清理本地历史' : 'Clear local history'}</Button></details>
        </aside>
        <section class="min-w-0 space-y-4">
          <div class="flex flex-wrap justify-between gap-3"><h2 class="text-base font-semibold">{selected?.title ?? (isZh ? '新对话' : 'New conversation')}</h2>{#if messages.length}<Button size="icon" variant="outline" aria-label={isZh ? '复制对话' : 'Copy conversation'} onclick={() => void copyConversation()}><Copy class="size-4" /></Button>{/if}</div>
          {#if selected}<WorkspaceRecordLinks resource="ai_conversations" id={selected.id} />{/if}
          <div class="space-y-4" aria-live="polite">{#each messages as message (message.id)}<article class="border-b py-3"><Badge variant="outline">{message.role === 'user' ? (isZh ? '你' : 'You') : (isZh ? '本地助手' : 'Local assistant')}</Badge><p class="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{messageText(message)}</p></article>{:else}<p class="text-sm text-muted-foreground">{isZh ? '输入问题，或选择运营模板。' : 'Enter a question or choose an operations template.'}</p>{/each}</div>
          <form class="space-y-3" onsubmit={(event) => { event.preventDefault(); void send(); }}>
            <label class="block text-sm">{isZh ? '问题' : 'Question'}<textarea class="mt-2 min-h-28 w-full rounded-md border bg-background p-3" bind:value={draft} disabled={busy} required></textarea></label>
            <Button type="submit" disabled={busy || !draft.trim()}><Send class="size-4" />{busy ? (isZh ? '查询中…' : 'Querying…') : (isZh ? '发送' : 'Send')}</Button>
          </form>
        </section>
      </div>
    {/if}
  </ContentPageShell>
</div>
