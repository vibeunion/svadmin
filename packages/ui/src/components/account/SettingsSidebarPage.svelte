<script lang="ts">
  import { captureAdminContext } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import { Button } from '../ui/button/index.js';
  import ContentPageShell from '../content/ContentPageShell.svelte';
  import ContentPageHeader from '../content/ContentPageHeader.svelte';
  import SettingsGroup from '../content/SettingsGroup.svelte';
  import FeedbackNotice from '../content/FeedbackNotice.svelte';
  import ProfilePage from '../ProfilePage.svelte';
  import IntegrationsSettings from '../IntegrationsSettings.svelte';
  import AppearanceSettings from '../AppearanceSettings.svelte';
  const i18n = useTranslation();
  const adminContext = captureAdminContext();
  const credentialProvider = $derived(adminContext.credentialProvider);
  const isZh = $derived(i18n.locale === 'zh-CN');
  const sections = $derived([{ id: 'profile', title: i18n.t('account.basicSettings') }, { id: 'signin', title: i18n.t('account.socialSignIn') }, { id: 'preferences', title: i18n.t('account.preferences') }, { id: 'api', title: i18n.t('account.manageApi') }]);
  let active = $state('profile');
</script>

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
        <ProfilePage />
      {:else if active === 'signin'}
        <IntegrationsSettings />
      {:else if active === 'preferences'}
        <AppearanceSettings />
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
