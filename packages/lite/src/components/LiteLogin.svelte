<script lang="ts">
  /**
   * LiteLogin — Simple login form for SSR.
   * Posts to SvelteKit form action, no JS needed.
   */
  import { t } from '@svadmin/core/i18n';

  interface Props {
    error?: string;
    brandName?: string;
    action?: string;
    /** Caller class merged with the built-in class list. */
    class?: string;
  }

  let {
    error,
    brandName = 'Admin',
    action = '?/login',
    class: className = '',
  }: Props = $props();
</script>

<div class="lite-login-wrapper {className}">
  <div class="lite-login-card">
    <div class="lite-card">
      <h2 style="text-align:center;margin:0 0 20px;font-size:20px;font-weight:600;">{brandName}</h2>

      {#if error}
        <div class="lite-alert lite-alert-error">{error}</div>
      {/if}

      <form method="POST" action={action}>
        <div class="lite-form-group">
          <label for="email">{t('auth.email') || 'Email'}</label>
          <input type="text" name="email" id="email" class="lite-input" placeholder="user@example.com" required />
        </div>
        <div class="lite-form-group">
          <label for="password">{t('auth.password') || 'Password'}</label>
          <input type="password" name="password" id="password" class="lite-input" required />
        </div>
        <button type="submit" class="lite-btn lite-btn-primary" style="width:100%;padding:10px;">
          {t('auth.signIn') || 'Sign In'}
        </button>
      </form>
    </div>
  </div>
</div>
