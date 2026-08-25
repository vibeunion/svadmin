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

<div class="space-y-6">
  <div><h2 class="text-xl font-semibold text-foreground">{i18n.t('settings.appearance')}</h2><p class="mt-1 text-sm text-muted-foreground">{i18n.t('settings.settingsDescription')}</p></div>
  <SettingsGroup title={i18n.t('settings.themeMode')}>
    <div class="grid grid-cols-3 gap-3">
      {#each themeOptions as option (option.value)}
        {@const active = currentTheme === option.value}
        <button class="relative flex min-w-0 flex-col items-center gap-2 rounded-lg border p-4 transition-colors {active ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/50'}" onclick={() => setTheme(option.value)} aria-pressed={active}>
          {#if active}<Check class="absolute right-2 top-2 size-3.5 text-primary" />{/if}
          <span class="flex size-10 items-center justify-center rounded-md {active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}"><option.icon class="size-5" /></span>
          <span class="truncate text-xs font-medium {active ? 'text-primary' : 'text-muted-foreground'}">{i18n.t(option.label)}</span>
        </button>
      {/each}
    </div>
  </SettingsGroup>
  <SettingsGroup title={i18n.t('settings.colorAccent')}>
    <div class="flex flex-wrap gap-3">
      {#each presets as preset (preset.name)}
        {@const active = currentColor === preset.name}
        <button class="relative size-9 rounded-full border border-border transition-opacity {active ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'opacity-70 hover:opacity-100'}" style="background-color: {preset.color}" onclick={() => setColorTheme(preset.name as Parameters<typeof setColorTheme>[0])} aria-label={preset.label} aria-pressed={active}>{#if active}<Check class="absolute inset-0 m-auto size-4 text-white drop-shadow-sm" />{/if}</button>
      {/each}
    </div>
  </SettingsGroup>
  <SettingsGroup title={i18n.t('settings.interface')}>
    <div class="divide-y divide-border">
      <SettingsFieldRow label={i18n.t('settings.language')} description={localeNames[currentLocale] ?? currentLocale}>{#snippet control()}<select class="h-9 max-w-44 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" value={currentLocale} onchange={(event) => i18n.setLocale((event.target as HTMLSelectElement).value)}>{#each availableLocales as locale (locale)}<option value={locale}>{localeNames[locale] ?? locale}</option>{/each}</select>{/snippet}</SettingsFieldRow>
      <SettingsFieldRow label={i18n.t('settings.sidebarDensity')}>{#snippet control()}<div class="flex overflow-hidden rounded-md border border-input"><button class="px-3 py-1.5 text-xs font-medium {density === 'compact' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-accent'}" onclick={() => setDensity('compact')}>{i18n.t('settings.compact')}</button><button class="px-3 py-1.5 text-xs font-medium {density === 'standard' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-accent'}" onclick={() => setDensity('standard')}>{i18n.t('settings.standard')}</button></div>{/snippet}</SettingsFieldRow>
      <SettingsFieldRow label={i18n.t('settings.defaultPageSize')}>{#snippet control()}<div class="flex overflow-hidden rounded-md border border-input">{#each pageSizeOptions as size (size)}<button class="px-3 py-1.5 font-mono text-xs font-medium {pageSize === size ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-accent'}" onclick={() => setPageSize(size)}>{size}</button>{/each}</div>{/snippet}</SettingsFieldRow>
    </div>
  </SettingsGroup>
</div>
