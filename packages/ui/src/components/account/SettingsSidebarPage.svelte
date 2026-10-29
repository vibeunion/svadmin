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
  <div class="grid gap-6 lg:grid-cols-[12rem_minmax(0,1fr)]">
    <nav class="flex gap-1 overflow-x-auto lg:flex-col" aria-label={i18n.t('account.settingsSidebar')}>
      {#each sections as section (section.id)}
        <button type="button" class={'whitespace-nowrap rounded-md px-3 py-2 text-left text-sm ' + (active === section.id ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground')} aria-current={active === section.id ? 'page' : undefined} onclick={() => active = section.id}>{section.title}</button>
      {/each}
    </nav>
    <div class="min-w-0">
      {#if active === 'profile'}
        <ProfilePage headingLevel="h2" />
      {:else if active === 'signin'}
        <IntegrationsSettings headingLevel="h2" />
      {:else if active === 'preferences'}
        <AppearanceSettings headingLevel="h2" />
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
