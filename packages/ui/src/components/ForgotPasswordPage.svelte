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
        <div class="svadmin-u-3e7ce58d64fa">
          <Button variant="outline" class="svadmin-u-6da6a3c3f741" onclick={() => adminContext.navigate('/login')}>
            <ArrowLeft class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-d2347e8497a9" />
            {i18n.t('auth.backToLogin')}
          </Button>
        </div>
      {:else}
        <form onsubmit={handleSubmit} class="svadmin-u-b43b4c086d9a">
          {#if error}
            <Alert.Root variant="destructive">
              <AlertCircle class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
              <Alert.Description>{error}</Alert.Description>
            </Alert.Root>
          {/if}

          <div class="svadmin-u-6f7e013d6499">
            <Label for="forgot-identifier">{i18n.t('auth.usernameOrEmail')}</Label>
            <div class="svadmin-u-d89972fe17d6">
              <User class="svadmin-u-da4dbfbc4fdc svadmin-u-22e59b722111 svadmin-u-d694ba66e322 svadmin-u-36b381be4df3 svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-bfa603190748 svadmin-u-a4326536b8f5 svadmin-u-536a7530a44f" />
              <Input
                id="forgot-identifier"
                type="text"
                placeholder={i18n.t('auth.identifierPlaceholder')}
                bind:value={identifier}
                class="svadmin-u-9e83b2412bc9"
                autocomplete="username"
              />
            </div>
          </div>

          <Button type="submit" class="svadmin-u-6da6a3c3f741 svadmin-u-426b8b75185b" disabled={forgot.isLoading}>
            {#if forgot.isLoading}
              <Loader2 class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-afbdd13a380e svadmin-u-d2347e8497a9" />
            {/if}
            {i18n.t('auth.sendResetLink')}
          </Button>
        </form>

        <div class="svadmin-u-31f2553311b6 svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-b950dda299d3 svadmin-u-52be28846b5f">
          <Button variant="link" class="svadmin-u-fc7473ca09eb svadmin-u-b8f0a08ece1e svadmin-u-8a539c7fe216 svadmin-u-2689f3958069 svadmin-u-52083e7da442 svadmin-u-3960ffc248d9 svadmin-u-44ee8ba0a421" onclick={() => adminContext.navigate('/login')}>
            <ArrowLeft class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" />
            {i18n.t('auth.backToLogin')}
          </Button>
        </div>
      {/if}
</AuthPageShell>
