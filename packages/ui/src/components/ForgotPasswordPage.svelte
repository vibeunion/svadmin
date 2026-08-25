<script lang="ts">
  import { captureAdminContext, useForgotPassword } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';

  import { Button } from './ui/button/index.js';
  import { Input } from './ui/input/index.js';
  import { Label } from './ui/label/index.js';
  import * as Alert from './ui/alert/index.js';
  import AuthPageShell from './AuthPageShell.svelte';
  import { User, ArrowLeft, Loader2, AlertCircle } from '@lucide/svelte';

  const i18n = useTranslation();

  let { title = 'Admin' } = $props<{
    title?: string;
  }>();

  const adminContext = captureAdminContext();
  const forgot = useForgotPassword({ successNotification: false });

  let identifier = $state('');
  let error = $state('');
  let sent = $state(false);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    error = '';

    if (!identifier) { error = i18n.t('auth.usernameOrEmailRequired'); return; }

    const result = await forgot.mutate({ email: identifier, username: identifier });
    if (result.success) {
      sent = true;
    } else {
      error = result.error?.message ?? i18n.t('common.operationFailed');
    }
  }
</script>

<AuthPageShell brand={title} title={sent ? i18n.t('auth.resetLinkSentTitle') : i18n.t('auth.forgotPassword')} description={sent ? i18n.t('auth.resetLinkSentDescription') : i18n.t('auth.forgotPasswordDescription')}>
      {#if sent}
        <div class="space-y-4">
          <Button variant="outline" class="w-full" onclick={() => adminContext.navigate('/login')}>
            <ArrowLeft class="h-4 w-4 mr-2" />
            {i18n.t('auth.backToLogin')}
          </Button>
        </div>
      {:else}
        <form onsubmit={handleSubmit} class="space-y-5">
          {#if error}
            <Alert.Root variant="destructive">
              <AlertCircle class="h-4 w-4" />
              <Alert.Description>{error}</Alert.Description>
            </Alert.Root>
          {/if}

          <div class="space-y-2">
            <Label for="forgot-identifier">{i18n.t('auth.usernameOrEmail')}</Label>
            <div class="relative">
              <User class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-[1]" />
              <Input
                id="forgot-identifier"
                type="text"
                placeholder={i18n.t('auth.identifierPlaceholder')}
                bind:value={identifier}
                class="pl-9"
                autocomplete="username"
              />
            </div>
          </div>

          <Button type="submit" class="w-full h-10" disabled={forgot.isLoading}>
            {#if forgot.isLoading}
              <Loader2 class="h-4 w-4 animate-spin mr-2" />
            {/if}
            {i18n.t('auth.sendResetLink')}
          </Button>
        </form>

        <div class="mt-6 flex items-center justify-center border-t pt-5">
          <Button variant="link" class="text-sm h-auto p-0 font-medium inline-flex items-center gap-1" onclick={() => adminContext.navigate('/login')}>
            <ArrowLeft class="h-3 w-3" />
            {i18n.t('auth.backToLogin')}
          </Button>
        </div>
      {/if}
</AuthPageShell>
