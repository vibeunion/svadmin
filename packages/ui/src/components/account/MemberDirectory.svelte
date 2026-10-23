<script lang="ts" module>
  export interface DirectoryMember {
    id: string;
    name: string;
    email: string;
    role: string;
  }
  export interface MemberDirectoryProvider {
    /** 宿主提供的目录来源或服务边界说明。 */
    description?: string;
    list: () => Promise<DirectoryMember[]>;
    invite?: (email: string) => Promise<void>;
    invitationUrl?: string;
  }
</script>
<script lang="ts">
  import { untrack } from 'svelte';
  import { captureAdminContext } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import { Button } from '../ui/button/index.js';
  import { Input } from '../ui/input/index.js';
  import DataState from '../content/DataState.svelte';
  import FeedbackNotice from '../content/FeedbackNotice.svelte';
  import { Copy, Send, X } from '@lucide/svelte';

  let { provider }: { provider?: MemberDirectoryProvider | undefined } = $props();
  const context = captureAdminContext();
  const i18n = useTranslation();
  const isZh = $derived(i18n.locale === 'zh-CN');
  const controlId = $props.id();
  let rows = $state<DirectoryMember[]>([]);
  let query = $state('');
  let searchInput = $state<HTMLInputElement | null>(null);
  let email = $state('');
  let loading = $state(false);
  let sending = $state(false);
  let error = $state('');
  let requestError = $state(false);
  let loadError = $state(false);
  let status = $state('');
  let epoch = 0;
  const filtered = $derived(rows.filter(row => `${row.name} ${row.email}`.toLowerCase().includes(query.toLowerCase())));
  function clearSearch(): void {
    query = '';
    searchInput?.focus();
  }
  async function load() {
    if (untrack(() => sending)) return;
    const current = provider;
    const request = ++epoch;
    rows = []; loadError = false; requestError = false; loading = Boolean(current);
    if (!current) return;
    try {
      const result = await current.list();
      if (request === epoch) rows = result;
    } catch {
      if (request === epoch) loadError = true;
    } finally {
      if (request === epoch) loading = false;
    }
  }
  $effect(() => {
    void provider; void context.authProvider; void context.tenantCacheKey?.__svadminTenant;
    email = ''; query = ''; error = ''; requestError = false; status = ''; sending = false;
    void load();
    return () => { epoch += 1; };
  });
  async function invite(event: SubmitEvent) {
    event.preventDefault();
    const current = provider;
    if (!current?.invite || sending || loading) return;
    requestError = false;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      error = isZh ? '请输入有效邮箱' : 'Enter a valid email address';
      return;
    }
    const request = epoch;
    sending = true; error = ''; status = '';
    try {
      await current.invite(email.trim());
      if (request !== epoch) return;
      email = '';
      status = isZh ? '邀请已提交' : 'Invitation submitted';
    } catch {
      if (request === epoch) requestError = true;
    } finally {
      if (request === epoch) sending = false;
    }
  }
  async function copyLink() {
    if (!provider?.invitationUrl) return;
    const request = epoch;
    status = ''; error = ''; requestError = false;
    try {
      await navigator.clipboard.writeText(provider.invitationUrl);
      if (request === epoch) status = isZh ? '链接已复制' : 'Link copied';
    } catch {
      if (request === epoch) error = isZh ? '复制失败' : 'Copy failed';
    }
  }
</script>

{#if !provider}
  <FeedbackNotice tone="warning" message={isZh ? '未配置成员目录服务，不会模拟成员或发送邀请。' : 'A member directory is not configured. No members or invitations are simulated.'} />
{:else}
  <div class="min-w-0 space-y-4">
  {#if provider.description}<p role="note" class="text-sm text-muted-foreground">{provider.description}</p>{/if}
  {#if provider.invite}
    <form onsubmit={invite} class="w-full max-w-xl space-y-2">
      <label for={`${controlId}-invite`} class="block text-sm font-medium text-foreground">{isZh ? '成员邮箱' : 'Member email'}</label>
      <div class="flex flex-col items-stretch gap-2 sm:flex-row">
        <Input id={`${controlId}-invite`} class="min-w-0 flex-1" type="email" required bind:value={email} disabled={sending} />
        <Button type="submit" class="shrink-0" disabled={sending || loading}><Send size={16} />{sending ? i18n.t('common.loading') : i18n.t('account.sendInvite')}</Button>
      </div>
    </form>
  {:else}
    <p class="text-sm text-muted-foreground">{isZh ? '当前目录为只读，未配置邀请发送能力。' : 'This directory is read-only. Invitation delivery is not configured.'}</p>
  {/if}
  {#if provider.invitationUrl}<div><Button variant="outline" onclick={copyLink}><Copy size={16} />{i18n.t('account.copyLink')}</Button></div>{/if}
  {#if requestError || error}<p role="alert" class="text-sm text-destructive">{requestError ? i18n.t('common.operationFailed') : error}</p>{/if}
  {#if status}<p role="status" class="text-sm text-foreground">{status}</p>{/if}
  {#if loading}
    <DataState state="loading" />
  {:else if loadError}
    <DataState state="error" description={i18n.t('common.operationFailed')} {...(sending ? {} : { retry: load })} />
  {:else}
    <div class="w-full max-w-sm space-y-2">
      <label for={`${controlId}-search`} class="block text-sm font-medium text-foreground">{isZh ? '搜索成员' : 'Search members'}</label>
      <Input id={`${controlId}-search`} type="search" bind:value={query} bind:ref={searchInput} />
    </div>
    {#if rows.length === 0}
      <DataState state="empty" title={isZh ? '暂无成员' : 'No members yet'} />
    {:else if filtered.length === 0}
      <DataState state="filtered-empty" title={isZh ? '没有匹配的成员' : 'No matching members'} description={isZh ? '请清除或调整搜索条件。' : 'Clear or adjust the search.'}>
        {#snippet action()}
          <Button type="button" variant="outline" size="sm" onclick={clearSearch}>
            <X size={16} aria-hidden="true" />{isZh ? '清除搜索' : 'Clear search'}
          </Button>
        {/snippet}
      </DataState>
    {:else}
      <!-- svelte-ignore a11y_no_noninteractive_tabindex (横向滚动区域需支持键盘聚焦与滚动) -->
      <div class="member-directory-scroll w-full min-w-0 overflow-x-auto" role="region" aria-label={isZh ? '成员目录' : 'Member directory'} tabindex="0">
        <table class="member-directory-table w-full border-collapse text-left text-sm" aria-label={isZh ? '成员列表' : 'Members'}>
          <thead class="border-b border-border bg-muted text-muted-foreground">
            <tr>
              <th scope="col" class="px-4 py-3 font-medium">{isZh ? '姓名' : 'Name'}</th>
              <th scope="col" class="px-4 py-3 font-medium">{isZh ? '邮箱' : 'Email'}</th>
              <th scope="col" class="px-4 py-3 font-medium">{isZh ? '角色' : 'Role'}</th>
            </tr>
          </thead>
          <tbody>
            {#each filtered as row (row.id)}
              <tr class="border-b border-border hover:bg-muted/50">
                <th scope="row" class="px-4 py-3 font-medium text-foreground break-words">{row.name}</th>
                <td class="px-4 py-3 text-muted-foreground break-all">{row.email}</td>
                <td class="px-4 py-3 text-foreground break-words">{row.role}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {/if}
  </div>
{/if}

<style>
  /* 保持可读列宽；局部尺寸合同优先于 clean-flat 的通用表格收缩规则。 */
  .member-directory-scroll > table.member-directory-table {
    min-width: var(--container-xl, 36rem);
  }
</style>
