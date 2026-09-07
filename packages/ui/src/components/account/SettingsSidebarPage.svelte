<script lang="ts">
  import { captureAdminContext } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import { Button } from '../ui/button/index.js';
  import { Input } from '../ui/input/index.js';
  import { Switch } from '../ui/switch/index.js';
  import ContentPageShell from '../content/ContentPageShell.svelte';
  import ContentPageHeader from '../content/ContentPageHeader.svelte';
  import SettingsGroup from '../content/SettingsGroup.svelte';
  import SettingsFieldRow from '../content/SettingsFieldRow.svelte';
  import FeedbackNotice from '../content/FeedbackNotice.svelte';
  const i18n = useTranslation();
  const adminContext = captureAdminContext();
  const credentialProvider = $derived(adminContext.credentialProvider);
  const isZh = $derived(i18n.locale === 'zh-CN');
  const sections = [{ id: 'profile', title: i18n.t('account.basicSettings') }, { id: 'signin', title: i18n.t('account.socialSignIn') }, { id: 'preferences', title: i18n.t('account.preferences') }, { id: 'api', title: i18n.t('account.manageApi') }];
  let active = $state('profile');
  let visible = $state(true);
  let available = $state(true);
</script>

{#snippet visibilityControl()}
  <Switch bind:checked={visible} aria-label={i18n.t('account.visibility')} />
{/snippet}

{#snippet availabilityControl()}
  <Switch bind:checked={available} aria-label={i18n.t('account.availability')} />
{/snippet}

<ContentPageShell pageId="account-settings-sidebar" width="wide">
  <ContentPageHeader title={i18n.t('account.settingsSidebar')} description={i18n.t('account.settingsSidebarDescription')} />
  <div class="svadmin-u-f3c543ad5fe9 svadmin-u-0d304f904cb0 svadmin-u-7178afa5bad6">
    <nav class="svadmin-u-60fbb7713999 svadmin-u-44ee8ba0a421 svadmin-u-1384f66f41d0 svadmin-u-a94f89d92058" aria-label={i18n.t('account.settingsSidebar')}>
      {#each sections as section (section.id)}
        <button type="button" class={'svadmin-u-e82ae8be04aa svadmin-u-421ac2be5045 svadmin-u-0e17f2bd9074 svadmin-u-03b4dd7f172b svadmin-u-2eba0d65d059 svadmin-u-fc7473ca09eb ' + (active === section.id ? 'svadmin-u-2ef11f1cb219 svadmin-u-2689f3958069 svadmin-u-d4108abe6359' : 'svadmin-u-bfa603190748 svadmin-u-39f703dbe296 svadmin-u-ea7b2e9e070e')} aria-current={active === section.id ? 'page' : undefined} onclick={() => active = section.id}>{section.title}</button>
      {/each}
    </nav>
    <div class="svadmin-u-7e0b7cdf1a94">
      {#if active === 'profile'}
        <SettingsGroup title={i18n.t('account.basicSettings')} description={i18n.t('account.settingsPlainDescription')} bodyClass="space-y-4">
          <div class="svadmin-u-f3c543ad5fe9 svadmin-u-0c3bc98565dd svadmin-u-e00ad81645a2"><Input value="Alex Chen" aria-label={i18n.t('profile.name')} /><Input value="Nebula Labs" aria-label="Company" /></div>
          <div><SettingsFieldRow label={i18n.t('account.visibility')} control={visibilityControl} separated /><SettingsFieldRow label={i18n.t('account.availability')} control={availabilityControl} separated /></div>
        </SettingsGroup>
      {:else if active === 'signin'}
        <SettingsGroup title={i18n.t('account.socialSignIn')} description="Connect the providers your team trusts for sign in." bodyClass="flex flex-wrap gap-2"><Button variant="outline">GitHub</Button><Button variant="outline">Google</Button></SettingsGroup>
      {:else if active === 'preferences'}
        <SettingsGroup title={i18n.t('account.preferences')} bodyClass="grid gap-4 sm:grid-cols-3"><Input value="English" aria-label={i18n.t('account.language')} /><Input value="Asia/Shanghai" aria-label={i18n.t('account.timezone')} /><Input value="CNY" aria-label={i18n.t('account.currency')} /></SettingsGroup>
      {:else}
        <SettingsGroup title={i18n.t('account.manageApi')} description={isZh ? '使用有作用域的真实凭据，并在权限变更时轮换。' : 'Use scoped credentials and rotate them when access changes.'} bodyClass="space-y-3">
          {#if credentialProvider}
            <Button variant="outline" onclick={() => void adminContext.navigate('/settings/api')}>{isZh ? '打开 API 凭据管理' : 'Open API credential management'}</Button>
          {:else}
            <FeedbackNotice tone="warning" message={isZh ? '未配置 CredentialProvider，不会显示或生成演示密钥。' : 'CredentialProvider is not configured. No demo credential is displayed or generated.'} />
          {/if}
        </SettingsGroup>
      {/if}
    </div>
  </div>
</ContentPageShell>
