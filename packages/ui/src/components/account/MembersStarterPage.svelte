<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import { ArrowRight, Check, Download, Mail, Upload, UserPlus, Users } from '@lucide/svelte';
  import * as Card from '../ui/card/index.js';
  import { Button } from '../ui/button/index.js';
  import { Input } from '../ui/input/index.js';
  import { Badge } from '../ui/badge/index.js';
  import ContentPageShell from '../content/ContentPageShell.svelte';
  import ContentPageHeader from '../content/ContentPageHeader.svelte';

  const i18n = useTranslation();
  let inviteOpen = $state(false);
  let email = $state('');
  let invited = $state<string[]>([]);
  const isZh = $derived(i18n.locale === 'zh-CN');

  function sendInvite() {
    const normalized = email.trim();
    if (!normalized || invited.includes(normalized)) return;
    invited = [...invited, normalized];
    email = '';
  }
</script>

<ContentPageShell pageId="account-members-starter" width="wide">
  <ContentPageHeader title={isZh ? '开始组建团队' : 'Start building your team'} description={isZh ? '这是零成员工作区的起始页。邀请第一位成员，或通过 CSV 批量导入。' : 'This is the starting state for a workspace with no members. Invite the first teammate or import a CSV roster.'} />

  <section class="grid overflow-hidden rounded-lg border border-border bg-card lg:grid-cols-[minmax(0,1fr)_21rem]">
    <div class="flex flex-col items-center justify-center px-6 py-12 text-center">
      <span class="flex size-14 items-center justify-center rounded-lg bg-primary/10 text-primary"><Users class="size-6" /></span>
      <Badge variant="outline" class="mt-5">0 {isZh ? '名成员' : 'members'}</Badge>
      <h2 class="mt-4 text-xl font-semibold text-foreground">{isZh ? '邀请你的第一位团队成员' : 'Invite your first team member'}</h2>
      <p class="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">{isZh ? '成员加入后，你可以继续分配角色、设置权限、查看活动状态，并在团队成员页批量管理。' : 'After members join, assign roles, configure access, review activity, and manage them in the full team member table.'}</p>
      <div class="mt-6 flex flex-wrap justify-center gap-2"><Button onclick={() => inviteOpen = true}><UserPlus class="size-4" />{isZh ? '邀请成员' : 'Invite member'}</Button><Button href="#/account/members/import-members" variant="outline"><Upload class="size-4" />{isZh ? '导入 CSV' : 'Import CSV'}</Button></div>
    </div>

    <aside class="border-t border-border bg-muted/15 p-5 lg:border-l lg:border-t-0">
      <h2 class="text-sm font-semibold text-foreground">{isZh ? '团队准备清单' : 'Team setup checklist'}</h2>
      <div class="mt-4 space-y-4">
        {#each [isZh ? '邀请至少一名管理员' : 'Invite at least one admin', isZh ? '确认默认成员角色' : 'Confirm the default member role', isZh ? '准备成员 CSV 模板' : 'Prepare the member CSV template'] as item, index (item)}
          {@const completed = index === 0 && invited.length > 0}
          <div class="flex items-start gap-3" data-checklist-status={completed ? 'complete' : 'pending'}><span class={'mt-0.5 flex size-6 items-center justify-center rounded-md border ' + (completed ? 'border-success/30 bg-success/10 text-success' : 'border-border text-muted-foreground')}>{#if completed}<Check class="size-3.5" />{:else}<span class="text-xs">{index + 1}</span>{/if}</span><p class="text-sm leading-5 text-muted-foreground">{item}</p></div>
        {/each}
      </div>
      <a href="#/account/members/team-members" class="mt-6 flex items-center gap-1 border-t border-border pt-4 text-sm font-medium text-primary">{isZh ? '查看完整成员管理' : 'Open full member management'}<ArrowRight class="size-3.5" /></a>
      <Button variant="outline" size="sm" class="mt-3 w-full"><Download class="size-3.5" />{isZh ? '下载 CSV 模板' : 'Download CSV template'}</Button>
    </aside>
  </section>

  {#if inviteOpen}
    <Card.Card data-member-invite-panel>
      <Card.CardContent class="grid gap-4 p-5 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-end">
        <span class="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary"><Mail class="size-4" /></span>
        <label><span class="text-sm font-medium text-foreground">{isZh ? '成员邮箱' : 'Member email'}</span><Input class="mt-2" type="email" bind:value={email} placeholder="teammate@example.com" /></label>
        <div class="flex gap-2"><Button variant="outline" onclick={() => inviteOpen = false}>{i18n.t('common.cancel')}</Button><Button onclick={sendInvite}>{isZh ? '发送邀请' : 'Send invite'}</Button></div>
      </Card.CardContent>
    </Card.Card>
  {/if}

  {#if invited.length > 0}
    <section class="rounded-lg border border-border bg-card"><div class="border-b border-border px-4 py-3"><h2 class="text-sm font-semibold text-foreground">{isZh ? '待接受邀请' : 'Pending invitations'}</h2></div><div class="divide-y divide-border">{#each invited as invite (invite)}<div class="flex items-center justify-between gap-3 px-4 py-3"><div><p class="text-sm font-medium text-foreground">{invite}</p><p class="text-xs text-muted-foreground">{isZh ? '刚刚发送' : 'Sent just now'}</p></div><Badge variant="outline">{isZh ? '已邀请' : 'Invited'}</Badge></div>{/each}</div></section>
  {/if}
</ContentPageShell>
