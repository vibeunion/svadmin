<script lang="ts">
  import { captureAdminContext, useUpdatePassword } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';

  import { Button } from './ui/button/index.js';
  import * as Alert from './ui/alert/index.js';
  import AuthPageShell from './AuthPageShell.svelte';
  import PasswordInput from './PasswordInput.svelte';
  import { Loader2, AlertCircle } from '@lucide/svelte';

  const i18n = useTranslation();

  let { title = 'Admin' } = $props<{
    title?: string;
  }>();

  const adminContext = captureAdminContext();
  const updatePw = useUpdatePassword();

  let password = $state('');
  let confirmPassword = $state('');
  let error = $state('');

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    error = '';

    if (!password) { error = i18n.t('auth.passwordRequired'); return; }
    if (password !== confirmPassword) { error = i18n.t('auth.passwordMismatch'); return; }

    const result = await updatePw.mutate({ password, confirmPassword });
    if (!result.success) {
      error = result.error?.message ?? i18n.t('common.operationFailed');
    }
  }
</script>

<AuthPageShell brand={title} title={i18n.t('auth.resetPassword')} description={i18n.t('auth.resetPasswordDescription')}>
      <form onsubmit={handleSubmit} class="svadmin-u-b43b4c086d9a">
        {#if error}
          <Alert.Root variant="destructive">
            <AlertCircle class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
            <Alert.Description>{error}</Alert.Description>
          </Alert.Root>
        {/if}

        <PasswordInput
          id="new-password"
          label={i18n.t('auth.password')}
          bind:value={password}
          autocomplete="new-password"
          showStrength
        />

        <PasswordInput
          id="confirm-password"
          label={i18n.t('auth.confirmPassword')}
          bind:value={confirmPassword}
          autocomplete="new-password"
        />

        <Button type="submit" class="svadmin-u-6da6a3c3f741 svadmin-u-426b8b75185b" disabled={updatePw.isLoading}>
          {#if updatePw.isLoading}
            <Loader2 class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-afbdd13a380e svadmin-u-d2347e8497a9" />
          {/if}
          {i18n.t('auth.resetPassword')}
        </Button>

        <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-50d0d216a2f8">
          <Button variant="link" class="svadmin-u-fc7473ca09eb svadmin-u-b8f0a08ece1e svadmin-u-8a539c7fe216 svadmin-u-2689f3958069" onclick={() => adminContext.navigate('/login')}>
            {i18n.t('auth.backToLogin')}
          </Button>
        </div>
      </form>
</AuthPageShell>
