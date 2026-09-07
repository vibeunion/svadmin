<script lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
  import { Input } from './ui/input/index.js';
  import TooltipButton from './TooltipButton.svelte';
  import { Label } from './ui/label/index.js';
  import { Lock, Eye, EyeOff } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core/i18n';

  const i18n = useTranslation();

  interface Props {
    id: string;
    label: string;
    value: string;
    placeholder?: string;
    autocomplete?: string;
    showStrength?: boolean;
    disabled?: boolean;
    class?: string;
  }

  let {
    id,
    label,
    value = $bindable(''),
    placeholder = '••••••••',
    autocomplete = 'current-password',
    showStrength = false,
    disabled = false,
    class: className = '',
  }: Props = $props();

  let showPassword = $state(false);

  // Password strength calculation
  const strength = $derived.by(() => {
    if (!showStrength || !value) return 0;
    let score = 0;
    if (value.length >= 8) score += 25;
    if (value.length >= 12) score += 10;
    if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 25;
    if (/\d/.test(value)) score += 20;
    if (/[^a-zA-Z0-9]/.test(value)) score += 20;
    return Math.min(score, 100);
  });

  const strengthColor = $derived(
    strength < 30 ? 'bg-destructive' :
    strength < 60 ? 'bg-warning' :
    strength < 80 ? 'bg-info' : 'bg-success'
  );

  const strengthLabel = $derived(
    strength < 30 ? 'Weak' :
    strength < 60 ? 'Fair' :
    strength < 80 ? 'Good' : 'Strong'
  );
</script>

<div class="svadmin-u-6f7e013d6499 {className}">
  <Label for={id}>{label}</Label>
  <div class="svadmin-u-d89972fe17d6">
    <Lock class="svadmin-u-da4dbfbc4fdc svadmin-u-22e59b722111 svadmin-u-d694ba66e322 svadmin-u-36b381be4df3 svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-bfa603190748 svadmin-u-a4326536b8f5 svadmin-u-536a7530a44f" />
    <Input
      {id}
      type={showPassword ? 'text' : 'password'}
      {placeholder}
      bind:value
      class="svadmin-u-9e83b2412bc9 svadmin-u-1b1df78e4d0a"
      autocomplete={autocomplete as any}
      {disabled}
    />
    <TooltipButton
      tooltip={showPassword ? i18n.t('common.hidePassword') : i18n.t('common.showPassword')}
      variant="ghost"
      size="icon"
      type="button"
      class="svadmin-u-da4dbfbc4fdc svadmin-u-68d3fc190004 svadmin-u-d694ba66e322 svadmin-u-36b381be4df3 svadmin-u-d0a52b312f7d svadmin-u-cbbf90f9a828 svadmin-u-536a7530a44f"
      onclick={(e) => { e.preventDefault(); showPassword = !showPassword; }}
      {disabled}
      tabindex={-1}
    >
      {#if showPassword}
        <EyeOff class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
      {:else}
        <Eye class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
      {/if}
    </TooltipButton>
  </div>
  {#if showStrength && value}
    <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4">
      <div class="svadmin-u-36e579c0b41c svadmin-u-095acb275581 svadmin-u-ac204c108886 svadmin-u-2ef11f1cb219 svadmin-u-2cd02d11d1af">
        <div
          class="svadmin-u-668b21aa5409 svadmin-u-ac204c108886 svadmin-u-0fe7d7d814d0 svadmin-u-7890552ecd63 {strengthColor}"
          style="width: {strength}%"
        ></div>
      </div>
      <span class="svadmin-u-359090c2d529 svadmin-u-bfa603190748 svadmin-u-e7e371071bc5 svadmin-u-308fc069e46e">{strengthLabel}</span>
    </div>
  {/if}
</div>
