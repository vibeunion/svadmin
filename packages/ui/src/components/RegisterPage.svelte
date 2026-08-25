<script lang="ts">
  import { captureAdminContext, useRegister } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import { Button } from './ui/button/index.js';
  import { Input } from './ui/input/index.js';
  import { Label } from './ui/label/index.js';
  import * as Alert from './ui/alert/index.js';
  import AuthPageShell from './AuthPageShell.svelte';
  import PasswordInput from './PasswordInput.svelte';
  import { User, Loader2, AlertCircle } from '@lucide/svelte';

  const i18n = useTranslation();

  let { title = 'Admin', onSuccess } = $props<{
    title?: string;
    onSuccess?: () => void;
  }>();

  const adminContext = captureAdminContext();
  const register = useRegister();

  let identifier = $state('');
  let password = $state('');
  let confirmPassword = $state('');
  let error = $state('');

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    error = '';

    if (!identifier) { error = i18n.t('auth.usernameOrEmailRequired'); return; }
    if (!password) { error = i18n.t('auth.passwordRequired'); return; }
    if (password !== confirmPassword) { error = i18n.t('auth.passwordMismatch'); return; }

    const result = await register.mutate({ email: identifier, username: identifier, password });
    if (result.success) {
      onSuccess?.();
    } else {
      error = result.error?.message ?? i18n.t('common.operationFailed');
    }
  }
</script>

{#snippet footer()}
  <div class="flex items-center justify-center gap-1"><span class="text-sm text-muted-foreground">{i18n.t('auth.hasAccount')}</span><Button variant="link" class="h-auto p-0 text-sm font-medium" onclick={() => adminContext.navigate('/login')}>{i18n.t('auth.login')}</Button></div>
{/snippet}

<AuthPageShell brand={title} title={i18n.t('auth.createAccount')} description={i18n.t('auth.createAccountMessage')} {footer}>
      <form onsubmit={handleSubmit} class="space-y-5">
        {#if error}
          <Alert.Root variant="destructive">
            <AlertCircle class="h-4 w-4" />
            <Alert.Description>{error}</Alert.Description>
          </Alert.Root>
        {/if}

        <div class="space-y-2">
          <Label for="register-identifier">{i18n.t('auth.usernameOrEmail')}</Label>
          <div class="relative">
            <User class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-[1]" />
            <Input
              id="register-identifier"
              type="text"
              placeholder={i18n.t('auth.identifierPlaceholder')}
              bind:value={identifier}
              class="pl-9"
              autocomplete="username"
            />
          </div>
        </div>

        <PasswordInput
          id="register-password"
          label={i18n.t('auth.password')}
          bind:value={password}
          autocomplete="new-password"
          showStrength
        />

        <PasswordInput
          id="register-confirm"
          label={i18n.t('auth.confirmPassword')}
          bind:value={confirmPassword}
          autocomplete="new-password"
        />

        <Button type="submit" class="h-10 w-full" disabled={register.isLoading}>
          {#if register.isLoading}
            <Loader2 class="h-4 w-4 animate-spin mr-2" />
          {/if}
          {i18n.t('auth.registerButton')}
        </Button>
      </form>
</AuthPageShell>
