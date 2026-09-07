<script lang="ts">
  import { Progress } from './ui/progress/index.js';

  let {
    value = 0,
    label = 'Progress',
    showLabel = true,
  } = $props<{
    value?: number;
    label?: string;
    showLabel?: boolean;
  }>();

  const safeValue = $derived(Math.max(0, Math.min(100, Number(value ?? 0))));
</script>

<div class="svadmin-u-5a2508227c6a">
  {#if showLabel}
    <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-d058ca6de60f svadmin-u-bfa603190748">
      <span>{label}</span>
      <span class="svadmin-u-0e65706bcccd">{safeValue}%</span>
    </div>
  {/if}
  <Progress value={safeValue} max={100} class="svadmin-u-095acb275581" />
</div>
