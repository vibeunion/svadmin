<script lang="ts">
  import { untrack } from 'svelte';
  import { Input } from './ui/input/index.js';
  import TooltipButton from './TooltipButton.svelte';
  import { Label } from './ui/label/index.js';
  import { Lock, Eye, EyeOff } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import type { FullAutoFill } from 'svelte/elements';

  const i18n = useTranslation();

  interface Props {
    id: string;
    label?: string;
    value?: string;
    defaultValue?: string;
    placeholder?: string;
    autocomplete?: FullAutoFill;
    showStrength?: boolean;
    disabled?: boolean;
    showLabel?: boolean;
    visibilityToggle?: boolean;
    visibility?: boolean;
    defaultVisibility?: boolean;
    size?: 'mini' | 'small' | 'default' | 'large';
    status?: 'error' | 'warning' | 'normal';
    class?: string;
    ariaInvalid?: 'true' | 'false' | undefined;
    ariaDescribedby?: string | undefined;
    onvisibilitychange?: (visible: boolean) => void;
  }

  let {
    id,
    label = 'Password',
    defaultValue = '',
    value = $bindable(untrack(() => defaultValue)),
    placeholder = '••••••••',
    autocomplete = 'current-password',
    showStrength = false,
    disabled = false,
    showLabel = true,
    visibilityToggle = true,
    visibility = $bindable(),
    defaultVisibility = false,
    size = 'default',
    status = 'normal',
    class: className = '',
    ariaInvalid,
    ariaDescribedby,
    onvisibilitychange,
  }: Props = $props();

  let internalVisibility = $state(untrack(() => defaultVisibility));
  const isVisible = $derived(visibility !== undefined ? visibility : internalVisibility);

  function toggleVisibility(e: MouseEvent) {
    e.preventDefault();
    const next = !isVisible;
    if (visibility !== undefined) {
      visibility = next;
    } else {
      internalVisibility = next;
    }
    onvisibilitychange?.(next);
  }

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

<div
  class="svadmin-password-input {className}"
  data-svadmin-password-input
  data-svadmin-login-password
  data-password-visible={isVisible ? 'true' : 'false'}
  data-status={status !== 'normal' ? status : undefined}
  data-size={size !== 'default' ? size : undefined}
>
  {#if showLabel}
    <Label for={id} class="svadmin-password-input__label" data-svadmin-password-label>{label}</Label>
  {/if}
  <div class="svadmin-password-input__field" data-svadmin-password-field>
    <Lock class="svadmin-password-input__icon" data-svadmin-password-icon aria-hidden="true" />
    <Input
      {id}
      type={isVisible ? 'text' : 'password'}
      {placeholder}
      bind:value
      class="svadmin-password-input__control"
      data-svadmin-password-control
      {autocomplete}
      {disabled}
      aria-invalid={ariaInvalid}
      aria-describedby={ariaDescribedby}
    />
    {#if visibilityToggle}
    <TooltipButton
      tooltip={isVisible ? i18n.t('common.hidePassword') : i18n.t('common.showPassword')}
      variant="ghost"
      size="icon"
      type="button"
      class="svadmin-password-input__toggle"
      data-svadmin-password-toggle
      aria-controls={id}
      aria-pressed={isVisible}
      onclick={toggleVisibility}
      {disabled}
    >
      {#if isVisible}
        <EyeOff class="svadmin-password-input__glyph" />
      {:else}
        <Eye class="svadmin-password-input__glyph" />
      {/if}
    </TooltipButton>
    {/if}
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
