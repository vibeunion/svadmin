<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import { Button } from '../ui/button/index.js';
  import { Input } from '../ui/input/index.js';
  import { Switch } from '../ui/switch/index.js';
  import ContentPageShell from '../content/ContentPageShell.svelte';
  import ContentPageHeader from '../content/ContentPageHeader.svelte';
  import SettingsGroup from '../content/SettingsGroup.svelte';
  import SettingsFieldRow from '../content/SettingsFieldRow.svelte';
  const i18n = useTranslation();
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
  <div class="grid gap-6 lg:grid-cols-[12rem_minmax(0,1fr)]">
    <nav class="flex gap-1 overflow-x-auto lg:flex-col" aria-label={i18n.t('account.settingsSidebar')}>
      {#each sections as section (section.id)}
        <button type="button" class={'whitespace-nowrap rounded-md px-3 py-2 text-left text-sm ' + (active === section.id ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground')} aria-current={active === section.id ? 'page' : undefined} onclick={() => active = section.id}>{section.title}</button>
      {/each}
    </nav>
    <div class="min-w-0">
      {#if active === 'profile'}
        <SettingsGroup title={i18n.t('account.basicSettings')} description={i18n.t('account.settingsPlainDescription')} bodyClass="space-y-4">
          <div class="grid gap-4 sm:grid-cols-2"><Input value="Alex Chen" aria-label={i18n.t('profile.name')} /><Input value="Nebula Labs" aria-label="Company" /></div>
          <div><SettingsFieldRow label={i18n.t('account.visibility')} control={visibilityControl} separated /><SettingsFieldRow label={i18n.t('account.availability')} control={availabilityControl} separated /></div>
        </SettingsGroup>
      {:else if active === 'signin'}
        <SettingsGroup title={i18n.t('account.socialSignIn')} description="Connect the providers your team trusts for sign in." bodyClass="flex flex-wrap gap-2"><Button variant="outline">GitHub</Button><Button variant="outline">Google</Button></SettingsGroup>
      {:else if active === 'preferences'}
        <SettingsGroup title={i18n.t('account.preferences')} bodyClass="grid gap-4 sm:grid-cols-3"><Input value="English" aria-label={i18n.t('account.language')} /><Input value="Asia/Shanghai" aria-label={i18n.t('account.timezone')} /><Input value="CNY" aria-label={i18n.t('account.currency')} /></SettingsGroup>
      {:else}
        <SettingsGroup title={i18n.t('account.manageApi')} description="Use scoped credentials and rotate them when access changes." bodyClass="flex flex-col gap-3 sm:flex-row"><Input readonly value="sv_demo_pub_9f3e********41ab" aria-label="API key" /><Button variant="outline">{i18n.t('common.copy')}</Button></SettingsGroup>
      {/if}
    </div>
  </div>
</ContentPageShell>
