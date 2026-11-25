<script lang="ts">
  import { Check, RotateCcw, Settings2, Monitor, Moon, Sun } from '@lucide/svelte';
  import { getColorPresets, getColorTheme, getTheme, setColorTheme, setTheme } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import { Button } from './ui/button/index.js';
  import * as Sheet from './ui/sheet/index.js';
  import { Switch } from './ui/switch/index.js';
  import { resetUiPreferences, uiPreferences, updateUiPreferences } from '../ui-preferences.svelte.js';

  const i18n = useTranslation();

  const defaultColorLabels: Record<string, string> = {
    default: 'Default',
    neutral: 'Neutral',
    indigo: 'Indigo',
    blue: 'Blue',
    green: 'Green',
    rose: 'Rose',
    orange: 'Orange',
    violet: 'Violet',
    stripe: 'Stripe',
  };

  function colorLabel(name: string, label: string): string {
    if (defaultColorLabels[name] !== label) return label;
    const key = `settings.accent.${name}`;
    const translated = i18n.t(key);
    return translated === key ? label : translated;
  }

  interface Props {
    open?: boolean;
    showTrigger?: boolean;
    title?: string;
    description?: string;
    triggerLabel?: string;
  }

  let {
    open = $bindable(false),
    showTrigger = true,
    title,
    description,
    triggerLabel,
  }: Props = $props();

  const resolvedTitle = $derived(title ?? i18n.t('settings.appearance'));
  const resolvedDescription = $derived(description ?? i18n.t('themeSettings.description'));
  const resolvedTriggerLabel = $derived(triggerLabel ?? i18n.t('themeSettings.triggerLabel'));

  const modes = $derived([
    { value: 'light' as const, label: i18n.t('settings.light'), icon: Sun },
    { value: 'dark' as const, label: i18n.t('settings.dark'), icon: Moon },
    { value: 'system' as const, label: i18n.t('settings.systemTheme'), icon: Monitor },
  ]);
  const presets = getColorPresets();
  const currentMode = $derived(getTheme());
  const currentColor = $derived(getColorTheme());

  function chooseNavigation(value: 'side' | 'top' | 'mix' | 'split'): void {
    updateUiPreferences({ navigation: value });
  }

  function chooseRadius(value: 'compact' | 'default' | 'rounded'): void {
    updateUiPreferences({ radius: value });
  }
</script>

{#if showTrigger}
  <Button variant="ghost" size="icon-sm" aria-label={resolvedTriggerLabel} title={resolvedTriggerLabel} onclick={() => (open = true)}>
    <Settings2 size={16} aria-hidden="true" />
  </Button>
{/if}

<Sheet.Root bind:open side="right" aria-label={resolvedTitle}>
  <header class="svadmin-theme-settings__header">
    <div>
      <h2>{resolvedTitle}</h2>
      <p>{resolvedDescription}</p>
    </div>
    <Button variant="outline" size="sm" onclick={resetUiPreferences}>
      <RotateCcw size={14} aria-hidden="true" />
      {i18n.t('common.reset')}
    </Button>
  </header>

  <div class="svadmin-theme-settings__body">
    <section class="svadmin-theme-settings__section">
      <h3>{i18n.t('settings.themeMode')}</h3>
      <div class="svadmin-theme-settings__choices">
        {#each modes as mode (mode.value)}
          {@const active = currentMode === mode.value}
          <button type="button" class="svadmin-theme-settings__choice" aria-pressed={active} onclick={() => setTheme(mode.value)}>
            <mode.icon size={16} aria-hidden="true" />
            <span>{mode.label}</span>
            {#if active}<Check size={14} aria-hidden="true" />{/if}
          </button>
        {/each}
      </div>
    </section>

    <section class="svadmin-theme-settings__section">
      <h3>{i18n.t('settings.colorAccent')}</h3>
      <div class="svadmin-theme-settings__swatches" role="group" aria-label={i18n.t('settings.colorAccent')}>
        {#each presets as preset (preset.name)}
          {@const active = currentColor === preset.name}
          {@const presetLabel = colorLabel(preset.name, preset.label)}
          <button
            type="button"
            class="svadmin-theme-settings__swatch"
            style:background-color={preset.color}
            aria-label={presetLabel}
            title={presetLabel}
            aria-pressed={active}
            onclick={() => setColorTheme(preset.name as Parameters<typeof setColorTheme>[0])}
          >
            {#if active}<Check size={14} aria-hidden="true" />{/if}
          </button>
        {/each}
      </div>
    </section>

    <section class="svadmin-theme-settings__section">
      <h3>{i18n.t('themeSettings.navigation')}</h3>
      <label class="svadmin-theme-settings__field">
        <span>{i18n.t('themeSettings.navigationMode')}</span>
        <select class="svadmin-select" value={uiPreferences.navigation} onchange={(event) => chooseNavigation((event.currentTarget as HTMLSelectElement).value as 'side' | 'top' | 'mix' | 'split')}>
          <option value="side">{i18n.t('settings.navSide')}</option>
          <option value="top">{i18n.t('settings.navTop')}</option>
          <option value="mix">{i18n.t('settings.navMix')}</option>
          <option value="split">{i18n.t('themeSettings.navSplit')}</option>
        </select>
      </label>
      <label class="svadmin-theme-settings__field">
        <span>{i18n.t('themeSettings.navigationTheme')}</span>
        <select class="svadmin-select" value={uiPreferences.navigationTheme} onchange={(event) => updateUiPreferences({ navigationTheme: (event.currentTarget as HTMLSelectElement).value as 'light' | 'dark' | 'system' })}>
          <option value="light">{i18n.t('settings.light')}</option>
          <option value="dark">{i18n.t('settings.dark')}</option>
          <option value="system">{i18n.t('themeSettings.followTheme')}</option>
        </select>
      </label>
      <label class="svadmin-theme-settings__field">
        <span>{i18n.t('settings.contentWidth')}</span>
        <select class="svadmin-select" value={uiPreferences.contentWidth} onchange={(event) => updateUiPreferences({ contentWidth: (event.currentTarget as HTMLSelectElement).value as 'fluid' | 'fixed' | 'wide' })}>
          <option value="fixed">{i18n.t('settings.widthFixed')}</option>
          <option value="fluid">{i18n.t('settings.widthFluid')}</option>
          <option value="wide">{i18n.t('themeSettings.widthWide')}</option>
        </select>
      </label>
    </section>

    <section class="svadmin-theme-settings__section">
      <h3>{i18n.t('themeSettings.display')}</h3>
      <label class="svadmin-theme-settings__toggle">
        <span><strong>{i18n.t('themeSettings.compactDensity')}</strong><small>{i18n.t('themeSettings.compactDensityDesc')}</small></span>
        <Switch checked={uiPreferences.compactDensity} onCheckedChange={(checked) => updateUiPreferences({ compactDensity: checked })} />
      </label>
      <label class="svadmin-theme-settings__toggle">
        <span><strong>{i18n.t('themeSettings.colorSafe')}</strong><small>{i18n.t('themeSettings.colorSafeDesc')}</small></span>
        <Switch checked={uiPreferences.colorWeak} onCheckedChange={(checked) => updateUiPreferences({ colorWeak: checked })} />
      </label>
      <label class="svadmin-theme-settings__toggle">
        <span><strong>{i18n.t('themeSettings.pageTransitions')}</strong><small>{i18n.t('themeSettings.pageTransitionsDesc')}</small></span>
        <Switch checked={uiPreferences.pageTransition} onCheckedChange={(checked) => updateUiPreferences({ pageTransition: checked })} />
      </label>
      <label class="svadmin-theme-settings__field">
        <span>{i18n.t('themeSettings.motion')}</span>
        <select class="svadmin-select" value={uiPreferences.motion} onchange={(event) => updateUiPreferences({ motion: (event.currentTarget as HTMLSelectElement).value as 'system' | 'reduced' })}>
          <option value="system">{i18n.t('settings.systemTheme')}</option>
          <option value="reduced">{i18n.t('themeSettings.motionReduced')}</option>
        </select>
      </label>
      <div class="svadmin-theme-settings__segmented" role="group" aria-label={i18n.t('themeSettings.cornerRadius')}>
        {#each [{ value: 'compact', label: i18n.t('common.compact') }, { value: 'default', label: i18n.t('themeSettings.radiusDefault') }, { value: 'rounded', label: i18n.t('themeSettings.radiusRounded') }] as option (option.value)}
          <button type="button" aria-pressed={uiPreferences.radius === option.value} onclick={() => chooseRadius(option.value as 'compact' | 'default' | 'rounded')}>{option.label}</button>
        {/each}
      </div>
    </section>
  </div>
</Sheet.Root>

<style>
  .svadmin-theme-settings__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--svadmin-space-3);
    padding: var(--svadmin-space-5) var(--svadmin-space-5) var(--svadmin-space-4);
    border-block-end: 1px solid var(--border);
  }
  .svadmin-theme-settings__header h2 { margin: 0; font-size: var(--svadmin-text-section); font-weight: 600; color: var(--foreground); }
  .svadmin-theme-settings__header p { margin: var(--svadmin-space-1) 0 0; color: var(--muted-foreground); font-size: var(--svadmin-text-label); }
  .svadmin-theme-settings__body { display: grid; gap: var(--svadmin-space-5); padding: var(--svadmin-space-5); overflow: auto; }
  .svadmin-theme-settings__section { display: grid; gap: var(--svadmin-space-3); }
  .svadmin-theme-settings__section h3 { margin: 0; font-size: var(--svadmin-text-body); font-weight: 600; color: var(--foreground); }
  .svadmin-theme-settings__choices { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--svadmin-space-2); }
  .svadmin-theme-settings__choice {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--svadmin-space-1);
    min-height: var(--svadmin-control-h);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--background);
    color: var(--foreground);
    font-size: var(--svadmin-text-label);
  }
  .svadmin-theme-settings__choice[aria-pressed='true'] { border-color: var(--primary); color: var(--primary); background: var(--accent); }
  .svadmin-theme-settings__swatches { display: flex; flex-wrap: wrap; gap: var(--svadmin-space-2); }
  .svadmin-theme-settings__swatch {
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    border: 2px solid var(--background);
    border-radius: 999px;
    color: var(--primary-foreground);
    box-shadow: 0 0 0 1px var(--border);
  }
  .svadmin-theme-settings__swatch[aria-pressed='true'] { box-shadow: 0 0 0 2px var(--foreground); }
  .svadmin-theme-settings__field { display: grid; gap: var(--svadmin-space-1); color: var(--foreground); font-size: var(--svadmin-text-label); }
  .svadmin-theme-settings__field select { width: 100%; }
  .svadmin-theme-settings__toggle { display: flex; align-items: center; justify-content: space-between; gap: var(--svadmin-space-4); }
  .svadmin-theme-settings__toggle span { display: grid; gap: 0.1rem; }
  .svadmin-theme-settings__toggle strong { font-size: var(--svadmin-text-label); font-weight: 600; color: var(--foreground); }
  .svadmin-theme-settings__toggle small { color: var(--muted-foreground); font-size: var(--svadmin-text-caption); }
  .svadmin-theme-settings__segmented { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border: 1px solid var(--border); border-radius: var(--radius-sm); overflow: hidden; }
  .svadmin-theme-settings__segmented button { min-height: var(--svadmin-control-h); border: 0; border-inline-end: 1px solid var(--border); background: transparent; color: var(--muted-foreground); font-size: var(--svadmin-text-label); }
  .svadmin-theme-settings__segmented button:last-child { border-inline-end: 0; }
  .svadmin-theme-settings__segmented button[aria-pressed='true'] { background: var(--accent); color: var(--accent-foreground); font-weight: 600; }
</style>
