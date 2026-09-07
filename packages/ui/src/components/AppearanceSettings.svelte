<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import { getTheme, setTheme, getColorTheme, setColorTheme, getColorPresets } from '@svadmin/core';
  import { Check, Monitor, Moon, Sun } from '@lucide/svelte';
  import SettingsGroup from './content/SettingsGroup.svelte';
  import SettingsFieldRow from './content/SettingsFieldRow.svelte';

  const i18n = useTranslation();
  const themeOptions = [
    { value: 'light' as const, icon: Sun, label: 'settings.light' },
    { value: 'dark' as const, icon: Moon, label: 'settings.dark' },
    { value: 'system' as const, icon: Monitor, label: 'settings.systemTheme' },
  ];
  let currentTheme = $derived(getTheme());
  let currentColor = $derived(getColorTheme());
  let currentLocale = $derived(i18n.locale);
  const availableLocales = i18n.getAvailableLocales();
  const presets = getColorPresets();
  const DENSITY_KEY = 'svadmin-sidebar-density';
  let density = $state<'compact' | 'standard'>((typeof window !== 'undefined' ? localStorage.getItem(DENSITY_KEY) : null) as 'compact' | 'standard' ?? 'standard');
  const PAGE_SIZE_KEY = 'svadmin-default-page-size';
  const pageSizeOptions = [10, 20, 50];
  let pageSize = $state(typeof window !== 'undefined' ? parseInt(localStorage.getItem(PAGE_SIZE_KEY) ?? '10', 10) : 10);
  const localeNames: Record<string, string> = { 'zh-CN': '中文（简体）', en: 'English', ja: '日本語', ko: '한국어' };
  function setDensity(value: 'compact' | 'standard') { density = value; if (typeof window !== 'undefined') { localStorage.setItem(DENSITY_KEY, value); window.dispatchEvent(new CustomEvent('svadmin-density-change', { detail: value })); } }
  function setPageSize(size: number) { pageSize = size; if (typeof window !== 'undefined') localStorage.setItem(PAGE_SIZE_KEY, String(size)); }
</script>

<div class="svadmin-u-b3542e058833">
  <div><h2 class="svadmin-u-d5c9b0001e7e svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{i18n.t('settings.appearance')}</h2><p class="svadmin-u-b6b02c0ebef6 svadmin-u-fc7473ca09eb svadmin-u-bfa603190748">{i18n.t('settings.settingsDescription')}</p></div>
  <SettingsGroup title={i18n.t('settings.themeMode')}>
    <div class="svadmin-u-f3c543ad5fe9 svadmin-u-be2e831be5dd svadmin-u-1004c0c3954c">
      {#each themeOptions as option (option.value)}
        {@const active = currentTheme === option.value}
        <button class="svadmin-u-d89972fe17d6 svadmin-u-60fbb7713999 svadmin-u-7e0b7cdf1a94 svadmin-u-8dddea0773ed svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-8e63407b5ceb svadmin-u-ceb69a6b0e5f {active ? 'svadmin-u-6cbc84dd9e1a svadmin-u-989c466fdbe7' : 'svadmin-u-18049387f0af svadmin-u-c7824f6076ea'}" onclick={() => setTheme(option.value)} aria-pressed={active}>
          {#if active}<Check class="svadmin-u-da4dbfbc4fdc svadmin-u-7b2d63937d23 svadmin-u-9a2db8f949b6 svadmin-u-783b0d9d1e2c svadmin-u-20aaf08a7ed1" />{/if}
          <span class="svadmin-u-60fbb7713999 svadmin-u-7bbb00f9ba7a svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-421ac2be5045 {active ? 'svadmin-u-375dc44df6e9 svadmin-u-20aaf08a7ed1' : 'svadmin-u-2ef11f1cb219 svadmin-u-bfa603190748'}"><option.icon class="svadmin-u-add63bc6753d" /></span>
          <span class="svadmin-u-f283ea9bea0e svadmin-u-359090c2d529 svadmin-u-2689f3958069 {active ? 'svadmin-u-20aaf08a7ed1' : 'svadmin-u-bfa603190748'}">{i18n.t(option.label)}</span>
        </button>
      {/each}
    </div>
  </SettingsGroup>
  <SettingsGroup title={i18n.t('settings.colorAccent')}>
    <div class="svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-1004c0c3954c">
      {#each presets as preset (preset.name)}
        {@const active = currentColor === preset.name}
        <button class="svadmin-u-d89972fe17d6 svadmin-u-665f07fe73cc svadmin-u-ac204c108886 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-67d6184a0024 {active ? 'svadmin-u-16b1efa5875e svadmin-u-fd1dda07320a svadmin-u-0c15f6cff5a0 svadmin-u-582e6ef4b245' : 'svadmin-u-0c67ca474a69 svadmin-u-5da1d5250e75'}" style="background-color: {preset.color}" onclick={() => setColorTheme(preset.name as Parameters<typeof setColorTheme>[0])} aria-label={preset.label} aria-pressed={active}>{#if active}<Check class="svadmin-u-da4dbfbc4fdc svadmin-u-7b7df0449b80 svadmin-u-e12dfd448aa6 svadmin-u-f7b5fa971871 svadmin-u-72a4c7cdeef7 drop-shadow-sm" />{/if}</button>
      {/each}
    </div>
  </SettingsGroup>
  <SettingsGroup title={i18n.t('settings.interface')}>
    <div class="svadmin-u-fa6acbf81d74 svadmin-u-e783642739e3">
      <SettingsFieldRow label={i18n.t('settings.language')} description={localeNames[currentLocale] ?? currentLocale}>{#snippet control()}<select class="svadmin-u-e7a768f922d2 svadmin-u-3713c4c7843d svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-e5795dad4d22 svadmin-u-e6f9e383a762 svadmin-u-0e17f2bd9074 svadmin-u-fc7473ca09eb svadmin-u-582e6ef4b245 svadmin-u-55d048ebfb1c svadmin-u-608dd26cd5ba svadmin-u-80b9d0ae125f svadmin-u-6b22a22a9752" value={currentLocale} onchange={(event) => i18n.setLocale((event.target as HTMLSelectElement).value)}>{#each availableLocales as locale (locale)}<option value={locale}>{localeNames[locale] ?? locale}</option>{/each}</select>{/snippet}</SettingsFieldRow>
      <SettingsFieldRow label={i18n.t('settings.sidebarDensity')}>{#snippet control()}<div class="svadmin-u-60fbb7713999 svadmin-u-2cd02d11d1af svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-e5795dad4d22"><button class="svadmin-u-0e17f2bd9074 svadmin-u-ec0091ee009b svadmin-u-359090c2d529 svadmin-u-2689f3958069 {density === 'compact' ? 'svadmin-u-75b1bec3ea0e svadmin-u-30ca335ae9c2' : 'svadmin-u-e6f9e383a762 svadmin-u-bfa603190748 svadmin-u-0557b88819cd'}" onclick={() => setDensity('compact')}>{i18n.t('settings.compact')}</button><button class="svadmin-u-0e17f2bd9074 svadmin-u-ec0091ee009b svadmin-u-359090c2d529 svadmin-u-2689f3958069 {density === 'standard' ? 'svadmin-u-75b1bec3ea0e svadmin-u-30ca335ae9c2' : 'svadmin-u-e6f9e383a762 svadmin-u-bfa603190748 svadmin-u-0557b88819cd'}" onclick={() => setDensity('standard')}>{i18n.t('settings.standard')}</button></div>{/snippet}</SettingsFieldRow>
      <SettingsFieldRow label={i18n.t('settings.defaultPageSize')}>{#snippet control()}<div class="svadmin-u-60fbb7713999 svadmin-u-2cd02d11d1af svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-e5795dad4d22">{#each pageSizeOptions as size (size)}<button class="svadmin-u-0e17f2bd9074 svadmin-u-ec0091ee009b svadmin-u-0e65706bcccd svadmin-u-359090c2d529 svadmin-u-2689f3958069 {pageSize === size ? 'svadmin-u-75b1bec3ea0e svadmin-u-30ca335ae9c2' : 'svadmin-u-e6f9e383a762 svadmin-u-bfa603190748 svadmin-u-0557b88819cd'}" onclick={() => setPageSize(size)}>{size}</button>{/each}</div>{/snippet}</SettingsFieldRow>
    </div>
  </SettingsGroup>
</div>
