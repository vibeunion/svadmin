<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import { ArrowRight, Building2, Check, KeyRound, Palette, Plug, ShieldCheck, UserRound, Users } from '@lucide/svelte';
  import * as Card from '../ui/card/index.js';
  import { Badge } from '../ui/badge/index.js';
  import { Button } from '../ui/button/index.js';
  import ContentPageShell from '../content/ContentPageShell.svelte';
  import ContentPageHeader from '../content/ContentPageHeader.svelte';

  const i18n = useTranslation();
  let completed = $state<string[]>(['profile', 'security']);
  const isZh = $derived(i18n.locale === 'zh-CN');
  const entries = $derived([
    { id: 'profile', title: isZh ? '个人资料' : 'User profile', description: isZh ? '维护联系人、工作状态、文件和日历连接。' : 'Maintain contact details, work status, files, and calendar connections.', href: '#/account/home/user-profile', icon: UserRound },
    { id: 'company', title: isZh ? '企业资料' : 'Company profile', description: isZh ? '配置企业信息、品牌资料、成员和数据导入。' : 'Configure company details, branding, members, and data imports.', href: '#/account/home/company-profile', icon: Building2 },
    { id: 'members', title: isZh ? '成员与邀请' : 'Members and invites', description: isZh ? '邀请成员、分配角色或从 CSV 批量导入。' : 'Invite members, assign roles, or import a CSV roster.', href: '#/account/members/team-members', icon: Users },
    { id: 'security', title: isZh ? '安全设置' : 'Security setup', description: isZh ? '启用两步验证并检查账户安全事件。' : 'Enable two-factor authentication and review account security events.', href: '#/authentication/branded/2fa', icon: ShieldCheck },
    { id: 'appearance', title: isZh ? '外观与偏好' : 'Appearance and preferences', description: isZh ? '设置主题、密度、语言和辅助功能。' : 'Set theme, density, language, and accessibility preferences.', href: '#/account/appearance', icon: Palette },
    { id: 'integrations', title: isZh ? '集成与 API' : 'Integrations and API', description: isZh ? '连接外部服务，并管理 API 密钥和 Webhook。' : 'Connect external services and manage API keys and webhooks.', href: '#/account/integrations', icon: Plug },
  ]);
  const progress = $derived(Math.round(completed.length / entries.length * 100));

  function toggleCompleted(id: string) {
    completed = completed.includes(id) ? completed.filter((item) => item !== id) : [...completed, id];
  }
</script>

<ContentPageShell pageId="account-get-started" width="wide">
  <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
    <ContentPageHeader title={i18n.t('account.getStarted')} description={isZh ? '从账户功能入口快速完成组织、成员、安全和集成配置。' : 'Use the account hub to complete organization, member, security, and integration setup.'} />
    <Badge variant="outline">{progress}% {isZh ? '已完成' : 'complete'}</Badge>
  </div>

  <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_19rem]">
    <div class="grid gap-4 md:grid-cols-2">
      {#each entries as entry (entry.id)}
        <Card.Card class="flex min-h-52 flex-col">
          <Card.CardContent class="flex flex-1 flex-col p-5">
            <div class="flex items-start justify-between gap-3">
              <span class="flex size-9 items-center justify-center rounded-md border border-border bg-card text-primary"><entry.icon class="size-4" /></span>
              <button type="button" class="flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground" aria-label={isZh ? '切换完成状态' : 'Toggle completion'} onclick={() => toggleCompleted(entry.id)}>
                {#if completed.includes(entry.id)}<Check class="size-4 text-success" />{/if}
              </button>
            </div>
            <h2 class="mt-4 text-base font-semibold text-foreground">{entry.title}</h2>
            <p class="mt-1 flex-1 text-sm leading-6 text-muted-foreground">{entry.description}</p>
            <Button href={entry.href} variant="link" class="mt-4 h-auto justify-start p-0">{isZh ? '打开设置' : 'Open settings'}<ArrowRight class="size-3.5" /></Button>
          </Card.CardContent>
        </Card.Card>
      {/each}
    </div>

    <aside class="space-y-5">
      <section class="rounded-lg border border-border bg-card p-5">
        <div class="flex items-center gap-3"><span class="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary"><KeyRound class="size-4" /></span><div><h2 class="text-sm font-semibold text-foreground">{isZh ? '账户准备度' : 'Account readiness'}</h2><p class="text-xs text-muted-foreground">{completed.length} / {entries.length}</p></div></div>
        <div class="mt-4 h-2 overflow-hidden rounded-full bg-muted"><div class="h-full rounded-full bg-primary" style:width={`${progress}%`}></div></div>
        <div class="mt-4 divide-y divide-border border-y border-border">
          {#each entries as entry (entry.id)}<div class="flex items-center justify-between gap-3 py-3 text-sm"><span class="text-muted-foreground">{entry.title}</span>{#if completed.includes(entry.id)}<Badge variant="secondary">{isZh ? '完成' : 'Done'}</Badge>{:else}<span class="text-xs text-muted-foreground">{isZh ? '待配置' : 'Pending'}</span>{/if}</div>{/each}
        </div>
      </section>
      <Button class="w-full" onclick={() => completed = entries.map((entry) => entry.id)}>{isZh ? '标记全部完成' : 'Mark all complete'}</Button>
    </aside>
  </div>
</ContentPageShell>
