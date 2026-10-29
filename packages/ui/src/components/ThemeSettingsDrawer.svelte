<script lang="ts">
  import { Check, RotateCcw, Settings2, Monitor, Moon, Sun } from '@lucide/svelte';
  import { getColorPresets, getColorTheme, getTheme, setColorTheme, setTheme } from '@svadmin/core';
  import { Button } from './ui/button/index.js';
  import * as Sheet from './ui/sheet/index.js';
  import { Switch } from './ui/switch/index.js';
  import { resetUiPreferences, uiPreferences, updateUiPreferences } from '../ui-preferences.svelte.js';

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
    title = 'Appearance',
    description = 'Tune the shell without leaving the page.',
    triggerLabel = 'Appearance settings',
  }: Props = $props();

  const modes = [
    { value: 'light' as const, label: 'Light', icon: Sun },
    { value: 'dark' as const, label: 'Dark', icon: Moon },
    { value: 'system' as const, label: 'System', icon: Monitor },
  ];
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
  <Button variant="ghost" size="icon-sm" aria-label={triggerLabel} onclick={() => (open = true)}>
    <Settings2 size={16} aria-hidden="true" />
  </Button>
{/if}

<Sheet.Root bind:open side="right" aria-label={title}>
  <header class="svadmin-theme-settings__header">
    <div>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
    <Button variant="outline" size="sm" onclick={resetUiPreferences}>
      <RotateCcw size={14} aria-hidden="true" />
      Reset
    </Button>
  </header>

  <div class="svadmin-theme-settings__body">
    <section class="svadmin-theme-settings__section">
      <h3>Theme mode</h3>
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
      <h3>Accent color</h3>
      <div class="svadmin-theme-settings__swatches" role="group" aria-label="Accent color">
        {#each presets as preset (preset.name)}
          {@const active = currentColor === preset.name}
          <button
            type="button"
            class="svadmin-theme-settings__swatch"
            style:background-color={preset.color}
            aria-label={preset.label}
            aria-pressed={active}
            onclick={() => setColorTheme(preset.name as Parameters<typeof setColorTheme>[0])}
          >
            {#if active}<Check size={14} aria-hidden="true" />{/if}
          </button>
        {/each}
      </div>
    </section>

    <section class="svadmin-theme-settings__section">
      <h3>Navigation</h3>
      <label class="svadmin-theme-settings__field">
        <span>Navigation mode</span>
        <select value={uiPreferences.navigation} onchange={(event) => chooseNavigation((event.currentTarget as HTMLSelectElement).value as 'side' | 'top' | 'mix' | 'split')}>
          <option value="side">Sidebar</option>
          <option value="top">Top bar</option>
          <option value="mix">Mixed</option>
          <option value="split">Split sidebar</option>
        </select>
      </label>
      <label class="svadmin-theme-settings__field">
        <span>Navigation theme</span>
        <select value={uiPreferences.navigationTheme} onchange={(event) => updateUiPreferences({ navigationTheme: (event.currentTarget as HTMLSelectElement).value as 'light' | 'dark' | 'system' })}>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">Follow theme</option>
        </select>
      </label>
      <label class="svadmin-theme-settings__field">
        <span>Content width</span>
        <select value={uiPreferences.contentWidth} onchange={(event) => updateUiPreferences({ contentWidth: (event.currentTarget as HTMLSelectElement).value as 'fluid' | 'fixed' | 'wide' })}>
          <option value="fixed">Fixed</option>
          <option value="fluid">Fluid</option>
          <option value="wide">Wide</option>
        </select>
      </label>
    </section>

    <section class="svadmin-theme-settings__section">
      <h3>Display</h3>
      <label class="svadmin-theme-settings__toggle">
        <span><strong>Compact density</strong><small>Reduce table and form spacing.</small></span>
        <Switch checked={uiPreferences.compactDensity} onCheckedChange={(checked) => updateUiPreferences({ compactDensity: checked })} />
      </label>
      <label class="svadmin-theme-settings__toggle">
        <span><strong>Color-safe mode</strong><small>Increase reliance on text and borders.</small></span>
        <Switch checked={uiPreferences.colorWeak} onCheckedChange={(checked) => updateUiPreferences({ colorWeak: checked })} />
      </label>
      <label class="svadmin-theme-settings__toggle">
        <span><strong>Page transitions</strong><small>Animate route content changes.</small></span>
        <Switch checked={uiPreferences.pageTransition} onCheckedChange={(checked) => updateUiPreferences({ pageTransition: checked })} />
      </label>
      <label class="svadmin-theme-settings__field">
        <span>Motion</span>
        <select value={uiPreferences.motion} onchange={(event) => updateUiPreferences({ motion: (event.currentTarget as HTMLSelectElement).value as 'system' | 'reduced' })}>
          <option value="system">System</option>
          <option value="reduced">Reduced motion</option>
        </select>
      </label>
      <div class="svadmin-theme-settings__segmented" role="group" aria-label="Corner radius">
        {#each [{ value: 'compact', label: 'Compact' }, { value: 'default', label: 'Default' }, { value: 'rounded', label: 'Rounded' }] as option (option.value)}
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
  .svadmin-theme-settings__field select {
    width: 100%;
    height: var(--svadmin-control-h);
    border: 1px solid var(--input);
    border-radius: var(--radius-sm);
    background: var(--background);
    color: var(--foreground);
    padding-inline: var(--svadmin-space-2);
  }
  .svadmin-theme-settings__toggle { display: flex; align-items: center; justify-content: space-between; gap: var(--svadmin-space-4); }
  .svadmin-theme-settings__toggle span { display: grid; gap: 0.1rem; }
  .svadmin-theme-settings__toggle strong { font-size: var(--svadmin-text-label); font-weight: 600; color: var(--foreground); }
  .svadmin-theme-settings__toggle small { color: var(--muted-foreground); font-size: var(--svadmin-text-caption); }
  .svadmin-theme-settings__segmented { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border: 1px solid var(--border); border-radius: var(--radius-sm); overflow: hidden; }
  .svadmin-theme-settings__segmented button { min-height: var(--svadmin-control-h); border: 0; border-inline-end: 1px solid var(--border); background: transparent; color: var(--muted-foreground); font-size: var(--svadmin-text-label); }
  .svadmin-theme-settings__segmented button:last-child { border-inline-end: 0; }
  .svadmin-theme-settings__segmented button[aria-pressed='true'] { background: var(--accent); color: var(--accent-foreground); font-weight: 600; }
</style>