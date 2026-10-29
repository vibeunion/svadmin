<script lang="ts">
  import { captureAdminContext, getColorTheme, getResolvedTheme } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import { Badge } from './ui/badge/index.js';
  import DescriptionList from './content/DescriptionList.svelte';
  import SettingsGroup from './content/SettingsGroup.svelte';
  import ContentPageHeader from './content/ContentPageHeader.svelte';

  const i18n = useTranslation();
  const adminContext = captureAdminContext();
  const resources = $derived(adminContext.resources.filter((resource) => resource.meta?.['aboutVisible'] !== false));
  const providerNames = $derived(adminContext.getDataProviderNames());
  let { version: suppliedVersion, headingLevel = 'h1' }: { version?: string; headingLevel?: 'h1' | 'h2' } = $props();
  const buildVersion = '__SVADMIN_VERSION__';
  const version = $derived(suppliedVersion ?? (
    buildVersion.startsWith('__')
      ? (i18n.locale === 'zh-CN' ? '开发构建（未提供版本）' : 'Development build (version unavailable)')
      : buildVersion
  ));
  const themeLabelKeys: Record<string, string> = {
    light: 'settings.light',
    dark: 'settings.dark',
    system: 'settings.systemTheme',
  };
  const accentLabelKeys: Record<string, string> = {
    neutral: 'settings.accent.neutral',
    indigo: 'settings.accent.indigo',
    blue: 'settings.accent.blue',
    green: 'settings.accent.green',
    rose: 'settings.accent.rose',
    orange: 'settings.accent.orange',
    violet: 'settings.accent.violet',
    arco: 'settings.accent.arco',
    stripe: 'settings.accent.stripe',
  };
  function environmentLabel(value: string, labelKeys: Record<string, string>): string {
    const key = labelKeys[value];
    return key ? i18n.t(key) : value;
  }
</script>

<div class="space-y-6">
  <ContentPageHeader title={i18n.t('settings.about')} {headingLevel} />
  <SettingsGroup title="svadmin" description={i18n.t('settings.currentEnvironment')} bodyClass="space-y-6" headingLevel={headingLevel === 'h1' ? 'h2' : 'h3'}>
    <DescriptionList columns={2} items={[
      { label: i18n.t('settings.version'), value: version },
      { label: i18n.t('settings.language'), value: i18n.locale },
      { label: i18n.t('settings.themeMode'), value: environmentLabel(getResolvedTheme(), themeLabelKeys) },
      { label: i18n.t('settings.colorAccent'), value: environmentLabel(getColorTheme(), accentLabelKeys) },
    ]} />
    <div class="border-t border-border pt-5">
      <h3 class="text-sm font-medium text-foreground">{i18n.t('settings.registeredResources')}</h3>
      <div class="mt-3 flex flex-wrap gap-2">{#each resources as resource (resource.name)}<Badge variant="outline" class="text-xs">{resource.label || resource.name}</Badge>{:else}<span class="text-sm text-muted-foreground">—</span>{/each}</div>
    </div>
    <div class="border-t border-border pt-5">
      <h3 class="text-sm font-medium text-foreground">{i18n.t('settings.dataProvider')}</h3>
      <div class="mt-3 flex flex-wrap gap-2">{#each providerNames as name (name)}<Badge variant="outline" class="font-mono text-xs">{name}</Badge>{:else}<span class="text-sm text-muted-foreground">—</span>{/each}</div>
    </div>
  </SettingsGroup>
</div>
