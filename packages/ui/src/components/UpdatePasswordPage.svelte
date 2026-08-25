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
      <form onsubmit={handleSubmit} class="space-y-5">
        {#if error}
          <Alert.Root variant="destructive">
            <AlertCircle class="h-4 w-4" />
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

        <Button type="submit" class="w-full h-10" disabled={updatePw.isLoading}>
          {#if updatePw.isLoading}
            <Loader2 class="h-4 w-4 animate-spin mr-2" />
          {/if}
          {i18n.t('auth.resetPassword')}
        </Button>

        <div class="flex items-center justify-center mt-2">
          <Button variant="link" class="text-sm h-auto p-0 font-medium" onclick={() => adminContext.navigate('/login')}>
            {i18n.t('auth.backToLogin')}
          </Button>
        </div>
      </form>
</AuthPageShell>
