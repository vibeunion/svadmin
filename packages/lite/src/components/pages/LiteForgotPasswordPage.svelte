<script lang="ts">
  interface Props {
    title?: string;
    description?: string;
    action?: string;
    loginUrl?: string;
    errors?: string[];
    successMessage?: string;
  }

  let {
    title = 'Forgot Password',
    description = 'Enter your email to receive a password reset link',
    action = '?/forgot_password',
    loginUrl = '/lite/login',
    errors = [],
    successMessage = '',
  }: Props = $props();
</script>

<div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #F7F8FA; padding: 20px;">
  <div class="lite-card" style="width: 100%; max-width: 400px; padding: 32px;">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="font-size: 24px; font-weight: 600; color: #1D2129; margin: 0 0 8px;">{title}</h1>
      <p style="font-size: 14px; color: #4E5969; margin: 0;">{description}</p>
    </div>

    <form method="POST" {action} class="lite-stack-lg">
      <div class="lite-form-group">
        <label for="email">Email</label>
        <input type="email" id="email" name="email" class="lite-input" required />
      </div>

      {#if errors.length > 0}
        <div style="padding: 12px; background: #FFECE8; border-radius: 6px; color: #F53F3F; font-size: 13px;">
          <ul style="margin: 0; padding-left: 20px;">
            {#each errors as err, _i (_i)}
              <li>{err}</li>
            {/each}
          </ul>
        </div>
      {/if}

      {#if successMessage}
        <div style="padding: 12px; background: #E8FFEA; border-radius: 6px; color: #00B42A; font-size: 13px;">
          {successMessage}
        </div>
      {/if}

      <button type="submit" class="lite-btn lite-btn-primary" style="width: 100%; justify-content: center; padding: 10px;">
        Send Reset Link
      </button>

      <div style="text-align: center; font-size: 13px; color: #4E5969; margin-top: 8px;">
        Remember your password? <a href={loginUrl} style="color: #165DFF; text-decoration: none;">Back to Login</a>
      </div>
    </form>
  </div>
</div>
