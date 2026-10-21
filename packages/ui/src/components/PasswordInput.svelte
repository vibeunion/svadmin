<script lang="ts">
  import { Input } from './ui/input/index.js';
  import TooltipButton from './TooltipButton.svelte';
  import { Label } from './ui/label/index.js';
  import { Lock, Eye, EyeOff } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import type { FullAutoFill } from 'svelte/elements';

  const i18n = useTranslation();

  interface Props {
    id: string;
    label: string;
    value: string;
    placeholder?: string;
    autocomplete?: FullAutoFill;
    showStrength?: boolean;
    disabled?: boolean;
    class?: string;
    ariaInvalid?: 'true' | 'false' | undefined;
    ariaDescribedby?: string | undefined;
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
    ariaInvalid,
    ariaDescribedby,
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

  const strengthTone = $derived(
    strength < 30 ? 'danger' :
    strength < 60 ? 'warning' :
    strength < 80 ? 'info' : 'success'
  );

  const strengthLabel = $derived(
    strength < 30 ? 'Weak' :
    strength < 60 ? 'Fair' :
    strength < 80 ? 'Good' : 'Strong'
  );
</script>

<!-- Stable anatomy classes and data hooks keep this field independent of host Tailwind. -->
<div
  class="svadmin-password-input {className}"
  data-svadmin-password-input
  data-svadmin-login-password
  data-password-visible={showPassword ? 'true' : 'false'}
>
  <Label for={id} class="svadmin-password-input__label">{label}</Label>
  <div class="svadmin-password-input__field" data-svadmin-password-field>
    <Lock class="svadmin-password-input__icon" data-svadmin-password-icon aria-hidden="true" />
    <Input
      {id}
      type={showPassword ? 'text' : 'password'}
      {placeholder}
      bind:value
      class="svadmin-password-input__control"
      data-svadmin-password-control
      {autocomplete}
      {disabled}
      aria-invalid={ariaInvalid}
      aria-describedby={ariaDescribedby}
    />
    <TooltipButton
      tooltip={showPassword ? i18n.t('common.hidePassword') : i18n.t('common.showPassword')}
      variant="ghost"
      size="icon"
      type="button"
      class="svadmin-password-input__toggle"
      data-svadmin-password-toggle
      aria-controls={id}
      aria-pressed={showPassword}
      onclick={(e) => { e.preventDefault(); showPassword = !showPassword; }}
      {disabled}
    >
      {#if showPassword}
        <EyeOff class="svadmin-password-input__glyph" />
      {:else}
        <Eye class="svadmin-password-input__glyph" />
      {/if}
    </TooltipButton>
  </div>
  {#if showStrength && value}
    <div class="svadmin-password-input__strength" data-svadmin-password-strength>
      <div class="svadmin-password-input__strength-track">
        <div
          class="svadmin-password-input__strength-fill"
          data-tone={strengthTone}
          style="width: {strength}%"
        ></div>
      </div>
      <span class="svadmin-password-input__strength-label">{strengthLabel}</span>
    </div>
  {/if}
</div>
