<script lang="ts">
  interface CronPreset {
    label: string;
    value: string;
  }

  interface Props {
    value?: string;
    name?: string;
    label?: string;
    description?: string;
    presets?: CronPreset[];
    formAction?: string;
    disabled?: boolean;
    class?: string;
  }

  let {
    value = '',
    name = 'cron',
    label = 'Cron expression',
    description = 'Use a preset value or edit the expression directly; the visual builder is a client enhancement.',
    presets = [
      { label: 'Every minute', value: '* * * * *' },
      { label: 'Every hour', value: '0 * * * *' },
      { label: 'Every day at midnight', value: '0 0 * * *' },
      { label: 'Every Monday at 09:00', value: '0 9 * * 1' },
    ],
    formAction,
    disabled = false,
    class: className = '',
  }: Props = $props();

  let expression = $state(value);
</script>

<section class="lite-cron-builder lite-card {className}" aria-label={label}>
  <header>
    <h2>{label}</h2>
    {#if description}<p>{description}</p>{/if}
  </header>

  <div class="lite-cron-preset">
    <span class="lite-cron-preset-label">Presets</span>
    <ul>
      {#each presets as preset (preset.value)}
        <li><strong>{preset.label}</strong> <code>{preset.value}</code></li>
      {/each}
    </ul>
  </div>

  {#if formAction}
    <form method="POST" action={formAction}>
      <label for="lite-cron-expression">Expression</label>
      <input id="lite-cron-expression" {name} bind:value={expression} {disabled} autocomplete="off" spellcheck="false" />
      <button type="submit" {disabled}>Save schedule</button>
    </form>
  {:else}
    <label for="lite-cron-expression">Expression</label>
    <input id="lite-cron-expression" {name} bind:value={expression} {disabled} autocomplete="off" spellcheck="false" />
  {/if}

  <code class="lite-cron-preview">{expression || '—'}</code>
</section>

<style>
  .lite-cron-builder { padding: 16px; }
  .lite-cron-builder header h2 { margin: 0; color: #1d2129; font-size: 16px; }
  .lite-cron-builder header p { margin: 4px 0 12px; color: #4e5969; font-size: 12px; line-height: 1.5; }
  .lite-cron-builder label { display: block; margin: 10px 0 4px; color: #4e5969; font-size: 12px; font-weight: 600; }
  .lite-cron-preset-label { display: block; margin: 10px 0 4px; color: #4e5969; font-size: 12px; font-weight: 600; }
  .lite-cron-preset ul { margin: 0; padding: 0; list-style: none; }
  .lite-cron-preset li { padding: 5px 0; color: #4e5969; font-size: 12px; }
  .lite-cron-preset li strong { margin-right: 6px; color: #1d2129; }
  .lite-cron-builder input { width: 100%; box-sizing: border-box; padding: 7px 9px; border: 1px solid #e5e6eb; border-radius: 4px; background: #fff; color: #1d2129; font: inherit; font-size: 13px; }
  .lite-cron-builder button { margin-top: 10px; padding: 7px 12px; border: 0; border-radius: 4px; background: #165dff; color: #fff; font-size: 12px; cursor: pointer; }
  .lite-cron-preview { display: block; margin-top: 10px; padding: 8px 10px; border-radius: 4px; background: #f7f8fa; color: #1d2129; font-size: 12px; }
</style>
