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
  <div class="svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-1004c0c3954c svadmin-u-020ba687fa12 svadmin-u-64cac80d2e9a svadmin-u-3b9871a0bf93">
    <ContentPageHeader title={i18n.t('account.getStarted')} description={isZh ? '从账户功能入口快速完成组织、成员、安全和集成配置。' : 'Use the account hub to complete organization, member, security, and integration setup.'} />
    <Badge variant="outline">{progress}% {isZh ? '已完成' : 'complete'}</Badge>
  </div>

  <div class="svadmin-u-f3c543ad5fe9 svadmin-u-0d304f904cb0 svadmin-u-078ed38802b9">
    <div class="svadmin-u-f3c543ad5fe9 svadmin-u-0c3bc98565dd svadmin-u-e4d6f343b9ff">
      {#each entries as entry (entry.id)}
        <Card.Card class="svadmin-u-60fbb7713999 svadmin-u-a0206a0583c8 svadmin-u-8dddea0773ed">
          <Card.CardContent class="svadmin-u-60fbb7713999 svadmin-u-36e579c0b41c svadmin-u-8dddea0773ed svadmin-u-c07e54fd1439">
            <div class="svadmin-u-60fbb7713999 svadmin-u-60541e1e26f8 svadmin-u-8ef2268efbbc svadmin-u-1004c0c3954c">
              <span class="svadmin-u-60fbb7713999 svadmin-u-665f07fe73cc svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-cd0ad9a56558 svadmin-u-20aaf08a7ed1"><entry.icon class="svadmin-u-f7b5fa971871" /></span>
              <button type="button" class="svadmin-u-60fbb7713999 svadmin-u-d8f5213f0fe0 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-bfa603190748 svadmin-u-ea7b2e9e070e" aria-label={isZh ? '切换完成状态' : 'Toggle completion'} onclick={() => toggleCompleted(entry.id)}>
                {#if completed.includes(entry.id)}<Check class="svadmin-u-f7b5fa971871 svadmin-u-76747e5e02ff" />{/if}
              </button>
            </div>
            <h2 class="svadmin-u-0ab8667228fd svadmin-u-4ee734926ff6 svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{entry.title}</h2>
            <p class="svadmin-u-b6b02c0ebef6 svadmin-u-36e579c0b41c svadmin-u-fc7473ca09eb svadmin-u-18550d5945ae svadmin-u-bfa603190748">{entry.description}</p>
            <Button href={entry.href} variant="link" class="svadmin-u-0ab8667228fd svadmin-u-b8f0a08ece1e svadmin-u-4b5cc19bfdfc svadmin-u-8a539c7fe216">{isZh ? '打开设置' : 'Open settings'}<ArrowRight class="svadmin-u-783b0d9d1e2c" /></Button>
          </Card.CardContent>
        </Card.Card>
      {/each}
    </div>

    <aside class="svadmin-u-b43b4c086d9a">
      <section class="svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-cd0ad9a56558 svadmin-u-c07e54fd1439">
        <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-1004c0c3954c"><span class="svadmin-u-60fbb7713999 svadmin-u-665f07fe73cc svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-421ac2be5045 svadmin-u-375dc44df6e9 svadmin-u-20aaf08a7ed1"><KeyRound class="svadmin-u-f7b5fa971871" /></span><div><h2 class="svadmin-u-fc7473ca09eb svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{isZh ? '账户准备度' : 'Account readiness'}</h2><p class="svadmin-u-359090c2d529 svadmin-u-bfa603190748">{completed.length} / {entries.length}</p></div></div>
        <div class="svadmin-u-0ab8667228fd svadmin-u-2f2a842e50fa svadmin-u-2cd02d11d1af svadmin-u-ac204c108886 svadmin-u-2ef11f1cb219"><div class="svadmin-u-668b21aa5409 svadmin-u-ac204c108886 svadmin-u-75b1bec3ea0e" style:width={`${progress}%`}></div></div>
        <div class="svadmin-u-0ab8667228fd svadmin-u-fa6acbf81d74 svadmin-u-e783642739e3 svadmin-u-8b8196092091 svadmin-u-18049387f0af">
          {#each entries as entry (entry.id)}<div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-1004c0c3954c svadmin-u-1b2d54a3fd12 svadmin-u-fc7473ca09eb"><span class="svadmin-u-bfa603190748">{entry.title}</span>{#if completed.includes(entry.id)}<Badge variant="secondary">{isZh ? '完成' : 'Done'}</Badge>{:else}<span class="svadmin-u-359090c2d529 svadmin-u-bfa603190748">{isZh ? '待配置' : 'Pending'}</span>{/if}</div>{/each}
        </div>
      </section>
      <Button class="svadmin-u-6da6a3c3f741" onclick={() => completed = entries.map((entry) => entry.id)}>{isZh ? '标记全部完成' : 'Mark all complete'}</Button>
    </aside>
  </div>
</ContentPageShell>
