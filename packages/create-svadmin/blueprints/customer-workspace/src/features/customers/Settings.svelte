<script lang="ts">
  import { ContentPageShell, Input, SettingsFieldRow, SettingsGroup } from '@svadmin/ui';
  import { brand, designPresets, type DesignPresetId } from '../../design.svelte';
  let { resourceName }: { resourceName: string } = $props();
  function choosePreset(value: string) {
    if (Object.hasOwn(designPresets, value)) brand.preset = value as DesignPresetId;
  }
</script>

<ContentPageShell title="工作区设置" pageId={resourceName} width="narrow">
  <SettingsGroup title="品牌">
    <SettingsFieldRow label="工作区名称">
      {#snippet control()}<Input aria-label="工作区名称" bind:value={brand.name} maxlength={40} />{/snippet}
    </SettingsFieldRow>
  </SettingsGroup>
  <SettingsGroup title="界面">
    <SettingsFieldRow label="设计预设">
      {#snippet control()}
        <select aria-label="设计预设" value={brand.preset} onchange={event => choosePreset(event.currentTarget.value)}>
          {#each Object.entries(designPresets) as [id, preset] (id)}
            <option value={id}>{preset.label}</option>
          {/each}
        </select>
      {/snippet}
    </SettingsFieldRow>
  </SettingsGroup>
</ContentPageShell>

<style>
  select { max-width: 100%; min-height: 2.5rem; padding: .5rem; border: 1px solid var(--border); border-radius: .375rem; background: var(--background); color: var(--foreground); font: inherit; }
  select:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
</style>
