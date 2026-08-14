<script lang="ts">
  import { t } from '@svadmin/core/i18n';

  interface Props {
    user: { id?: string | number; name?: string; email?: string; [key: string]: unknown };
    action?: string;
    errors?: string[];
    successMessage?: string;
  }

  let {
    user,
    action = '?/update_profile',
    errors = [],
    successMessage = '',
  }: Props = $props();
</script>

<div class="lite-page">
  <div class="lite-page-header">
    <h1 class="lite-page-title">{t('common.profile') || 'User Profile'}</h1>
  </div>

  <div class="lite-card" style="max-width: 600px; margin: 0 auto; padding: 24px;">
    <form method="POST" {action} class="lite-stack-lg">
      <div class="lite-form-group">
        <label for="name">Name</label>
        <input type="text" id="name" name="name" class="lite-input" value={user?.name ?? ''} />
      </div>

      <div class="lite-form-group">
        <label for="email">Email</label>
        <input type="email" id="email" name="email" class="lite-input" value={user?.email ?? ''} required />
      </div>
      
      <!-- Password update fields can be added here or handled in a separate form -->

      {#if errors.length > 0}
        <div style="padding: 12px; background: #fef2f2; border-radius: 6px; color: #ef4444; font-size: 13px;">
          <ul style="margin: 0; padding-left: 20px;">
            {#each errors as err, _i (_i)}
              <li>{err}</li>
            {/each}
          </ul>
        </div>
      {/if}

      {#if successMessage}
        <div style="padding: 12px; background: #ecfdf5; border-radius: 6px; color: #10b981; font-size: 13px;">
          {successMessage}
        </div>
      {/if}

      <div style="display: flex; justify-content: flex-end; margin-top: 8px;">
        <button type="submit" class="lite-btn lite-btn-primary">
          {t('common.save') || 'Save Profile'}
        </button>
      </div>
    </form>
  </div>
</div>
