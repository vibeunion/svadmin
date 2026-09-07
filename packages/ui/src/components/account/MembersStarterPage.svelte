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

  <section class="svadmin-u-f3c543ad5fe9 svadmin-u-2cd02d11d1af svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-cd0ad9a56558 svadmin-u-687e17559be1">
    <div class="svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-f92d02360b8f svadmin-u-61357c0c2f29 svadmin-u-ca6bf63030aa">
      <span class="svadmin-u-60fbb7713999 svadmin-u-7a9ad020b130 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-5f22e64f2282 svadmin-u-375dc44df6e9 svadmin-u-20aaf08a7ed1"><Users class="svadmin-u-9af3b4b6dc9e" /></span>
      <Badge variant="outline" class="svadmin-u-fb77735ed17c">0 {isZh ? '名成员' : 'members'}</Badge>
      <h2 class="svadmin-u-0ab8667228fd svadmin-u-d5c9b0001e7e svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{isZh ? '邀请你的第一位团队成员' : 'Invite your first team member'}</h2>
      <p class="svadmin-u-50d0d216a2f8 svadmin-u-6199866f612f svadmin-u-fc7473ca09eb svadmin-u-18550d5945ae svadmin-u-bfa603190748">{isZh ? '成员加入后，你可以继续分配角色、设置权限、查看活动状态，并在团队成员页批量管理。' : 'After members join, assign roles, configure access, review activity, and manage them in the full team member table.'}</p>
      <div class="svadmin-u-31f2553311b6 svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-86843cf1e227 svadmin-u-77a2a20e90d4"><Button onclick={() => inviteOpen = true}><UserPlus class="svadmin-u-f7b5fa971871" />{isZh ? '邀请成员' : 'Invite member'}</Button><Button href="#/account/members/import-members" variant="outline"><Upload class="svadmin-u-f7b5fa971871" />{isZh ? '导入 CSV' : 'Import CSV'}</Button></div>
    </div>

    <aside class="svadmin-u-b950dda299d3 svadmin-u-18049387f0af svadmin-u-46daeb0b661f svadmin-u-c07e54fd1439 svadmin-u-bb3e95154365 svadmin-u-7d283214b870">
      <h2 class="svadmin-u-fc7473ca09eb svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{isZh ? '团队准备清单' : 'Team setup checklist'}</h2>
      <div class="svadmin-u-0ab8667228fd svadmin-u-3e7ce58d64fa">
        {#each [isZh ? '邀请至少一名管理员' : 'Invite at least one admin', isZh ? '确认默认成员角色' : 'Confirm the default member role', isZh ? '准备成员 CSV 模板' : 'Prepare the member CSV template'] as item, index (item)}
          {@const completed = index === 0 && invited.length > 0}
          <div class="svadmin-u-60fbb7713999 svadmin-u-60541e1e26f8 svadmin-u-1004c0c3954c" data-checklist-status={completed ? 'complete' : 'pending'}><span class={'svadmin-u-15e1b1f444fe svadmin-u-60fbb7713999 svadmin-u-9af3b4b6dc9e svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f ' + (completed ? 'svadmin-u-18a6e7a36f29 svadmin-u-17a9f7af2265 svadmin-u-76747e5e02ff' : 'svadmin-u-18049387f0af svadmin-u-bfa603190748')}>{#if completed}<Check class="svadmin-u-783b0d9d1e2c" />{:else}<span class="svadmin-u-359090c2d529">{index + 1}</span>{/if}</span><p class="svadmin-u-fc7473ca09eb svadmin-u-7054e2767710 svadmin-u-bfa603190748">{item}</p></div>
        {/each}
      </div>
      <a href="#/account/members/team-members" class="svadmin-u-31f2553311b6 svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-44ee8ba0a421 svadmin-u-b950dda299d3 svadmin-u-18049387f0af svadmin-u-173fa8f06789 svadmin-u-fc7473ca09eb svadmin-u-2689f3958069 svadmin-u-20aaf08a7ed1">{isZh ? '查看完整成员管理' : 'Open full member management'}<ArrowRight class="svadmin-u-783b0d9d1e2c" /></a>
      <Button variant="outline" size="sm" class="svadmin-u-eccd13ef4f2f svadmin-u-6da6a3c3f741"><Download class="svadmin-u-783b0d9d1e2c" />{isZh ? '下载 CSV 模板' : 'Download CSV template'}</Button>
    </aside>
  </section>

  {#if inviteOpen}
    <Card.Card data-member-invite-panel>
      <Card.CardContent class="svadmin-u-f3c543ad5fe9 svadmin-u-0c3bc98565dd svadmin-u-c07e54fd1439 svadmin-u-d7bf6780c9a5 svadmin-u-bf60a82ffbd9">
        <span class="svadmin-u-60fbb7713999 svadmin-u-7bbb00f9ba7a svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-421ac2be5045 svadmin-u-375dc44df6e9 svadmin-u-20aaf08a7ed1"><Mail class="svadmin-u-f7b5fa971871" /></span>
        <label><span class="svadmin-u-fc7473ca09eb svadmin-u-2689f3958069 svadmin-u-d4108abe6359">{isZh ? '成员邮箱' : 'Member email'}</span><Input class="svadmin-u-50d0d216a2f8" type="email" bind:value={email} placeholder="teammate@example.com" /></label>
        <div class="svadmin-u-60fbb7713999 svadmin-u-77a2a20e90d4"><Button variant="outline" onclick={() => inviteOpen = false}>{i18n.t('common.cancel')}</Button><Button onclick={sendInvite}>{isZh ? '发送邀请' : 'Send invite'}</Button></div>
      </Card.CardContent>
    </Card.Card>
  {/if}

  {#if invited.length > 0}
    <section class="svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-cd0ad9a56558"><div class="svadmin-u-65fdbade2025 svadmin-u-18049387f0af svadmin-u-f0faeb26d656 svadmin-u-1b2d54a3fd12"><h2 class="svadmin-u-fc7473ca09eb svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{isZh ? '待接受邀请' : 'Pending invitations'}</h2></div><div class="svadmin-u-fa6acbf81d74 svadmin-u-e783642739e3">{#each invited as invite (invite)}<div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-1004c0c3954c svadmin-u-f0faeb26d656 svadmin-u-1b2d54a3fd12"><div><p class="svadmin-u-fc7473ca09eb svadmin-u-2689f3958069 svadmin-u-d4108abe6359">{invite}</p><p class="svadmin-u-359090c2d529 svadmin-u-bfa603190748">{isZh ? '刚刚发送' : 'Sent just now'}</p></div><Badge variant="outline">{isZh ? '已邀请' : 'Invited'}</Badge></div>{/each}</div></section>
  {/if}
</ContentPageShell>
