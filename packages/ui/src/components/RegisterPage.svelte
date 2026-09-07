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
  <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-44ee8ba0a421"><span class="svadmin-u-fc7473ca09eb svadmin-u-bfa603190748">{i18n.t('auth.hasAccount')}</span><Button variant="link" class="svadmin-u-b8f0a08ece1e svadmin-u-8a539c7fe216 svadmin-u-fc7473ca09eb svadmin-u-2689f3958069" onclick={() => adminContext.navigate('/login')}>{i18n.t('auth.login')}</Button></div>
{/snippet}

<AuthPageShell brand={title} title={i18n.t('auth.createAccount')} description={i18n.t('auth.createAccountMessage')} {footer}>
      <form onsubmit={handleSubmit} class="svadmin-u-b43b4c086d9a">
        {#if error}
          <Alert.Root variant="destructive">
            <AlertCircle class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
            <Alert.Description>{error}</Alert.Description>
          </Alert.Root>
        {/if}

        <div class="svadmin-u-6f7e013d6499">
          <Label for="register-identifier">{i18n.t('auth.usernameOrEmail')}</Label>
          <div class="svadmin-u-d89972fe17d6">
            <User class="svadmin-u-da4dbfbc4fdc svadmin-u-22e59b722111 svadmin-u-d694ba66e322 svadmin-u-36b381be4df3 svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-bfa603190748 svadmin-u-a4326536b8f5 svadmin-u-536a7530a44f" />
            <Input
              id="register-identifier"
              type="text"
              placeholder={i18n.t('auth.identifierPlaceholder')}
              bind:value={identifier}
              class="svadmin-u-9e83b2412bc9"
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

        <Button type="submit" class="svadmin-u-426b8b75185b svadmin-u-6da6a3c3f741" disabled={register.isLoading}>
          {#if register.isLoading}
            <Loader2 class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-afbdd13a380e svadmin-u-d2347e8497a9" />
          {/if}
          {i18n.t('auth.registerButton')}
        </Button>
      </form>
</AuthPageShell>
