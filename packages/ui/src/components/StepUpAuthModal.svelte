<script lang="ts">
  import { onDestroy } from 'svelte';
  import {
    ShieldAlert,
    Smartphone,
    KeyRound,
    UserCheck,
    Lock,
    Unlock,
    AlertTriangle,
    X,
    CheckCircle2,
    RefreshCw,
  } from 'lucide-svelte';

  export type StepUpAuthMethod = 'totp' | 'sms' | 'hardware' | 'supervisor';
  export type StepUpRiskLevel = 'low' | 'medium' | 'high' | 'critical';

  interface Props {
    open?: boolean;
    title?: string;
    subtitle?: string;
    operationName?: string;
    riskLevel?: StepUpRiskLevel;
    clientIp?: string;
    phoneMask?: string;
    methods?: StepUpAuthMethod[];
    defaultMethod?: StepUpAuthMethod;
    maxAttempts?: number;
    cooldownSeconds?: number;
    lockoutDurationSeconds?: number;
    onverify?: (payload: { method: StepUpAuthMethod; code: string; supervisorToken?: string }) => Promise<boolean> | boolean | void;
    oncancel?: () => void;
    onlockout?: () => void;
  }

  let {
    open = $bindable(false),
    title = '高敏特权二次认证',
    subtitle = '当前操作涉及高风险核心资源变更，需完成多因子特权鉴权',
    operationName = '特权操作执行 / 敏感数据导出',
    riskLevel = 'critical',
    clientIp = '10.12.88.42',
    phoneMask = '138****8888',
    methods = ['totp', 'sms', 'supervisor'],
    defaultMethod = 'totp',
    maxAttempts = 5,
    cooldownSeconds = 60,
    lockoutDurationSeconds = 300,
    onverify,
    oncancel,
    onlockout,
  }: Props = $props();

  let activeMethod = $state<StepUpAuthMethod>(defaultMethod);
  let digits = $state<string[]>(['', '', '', '', '', '']);
  let supervisorToken = $state('');
  let attemptsCount = $state(0);
  let isLocked = $state(false);
  let lockoutTimer = $state(0);
  let smsCooldown = $state(0);
  let isSubmitting = $state(false);
  let errorMsg = $state<string | null>(null);
  let successMsg = $state<string | null>(null);

  let intervalId: ReturnType<typeof setInterval> | null = null;
  let smsIntervalId: ReturnType<typeof setInterval> | null = null;

  let remainingAttempts = $derived(Math.max(0, maxAttempts - attemptsCount));
  let isCodeComplete = $derived(
    activeMethod === 'supervisor'
      ? supervisorToken.trim().length >= 6
      : digits.every((d) => d.trim().length > 0)
  );

  function resetCode() {
    digits = ['', '', '', '', '', ''];
    supervisorToken = '';
    errorMsg = null;
  }

  function handleMethodSwitch(method: StepUpAuthMethod) {
    if (isLocked) return;
    activeMethod = method;
    resetCode();
  }

  function handleDigitInput(index: number, event: Event) {
    if (isLocked) return;
    const input = event.target as HTMLInputElement;
    const val = input.value.slice(-1);
    digits[index] = val;

    if (val && index < 5) {
      const nextInput = document.getElementById(`stepup-digit-${index + 1}`) as HTMLInputElement | null;
      if (nextInput) nextInput.focus();
    }
  }

  function handleDigitKeydown(index: number, event: KeyboardEvent) {
    if (isLocked) return;
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      const prevInput = document.getElementById(`stepup-digit-${index - 1}`) as HTMLInputElement | null;
      if (prevInput) prevInput.focus();
    } else if (event.key === 'ArrowLeft' && index > 0) {
      const prevInput = document.getElementById(`stepup-digit-${index - 1}`) as HTMLInputElement | null;
      if (prevInput) prevInput.focus();
    } else if (event.key === 'ArrowRight' && index < 5) {
      const nextInput = document.getElementById(`stepup-digit-${index + 1}`) as HTMLInputElement | null;
      if (nextInput) nextInput.focus();
    } else if (event.key === 'Enter' && isCodeComplete) {
      handleSubmit();
    }
  }

  function handlePaste(event: ClipboardEvent) {
    if (isLocked) return;
    event.preventDefault();
    const pasteData = event.clipboardData?.getData('text') ?? '';
    const numeric = pasteData.replace(/\D/g, '').slice(0, 6);
    if (!numeric) return;
    for (let i = 0; i < 6; i++) {
      digits[i] = numeric[i] || '';
    }
    const focusIndex = Math.min(numeric.length, 5);
    const targetInput = document.getElementById(`stepup-digit-${focusIndex}`) as HTMLInputElement | null;
    if (targetInput) targetInput.focus();
  }

  function sendSmsCode() {
    if (smsCooldown > 0 || isLocked) return;
    smsCooldown = cooldownSeconds;
    smsIntervalId = setInterval(() => {
      smsCooldown -= 1;
      if (smsCooldown <= 0 && smsIntervalId) {
        clearInterval(smsIntervalId);
        smsIntervalId = null;
      }
    }, 1000);
  }

  function startLockout() {
    isLocked = true;
    lockoutTimer = lockoutDurationSeconds;
    if (onlockout) onlockout();
    intervalId = setInterval(() => {
      lockoutTimer -= 1;
      if (lockoutTimer <= 0) {
        if (intervalId) clearInterval(intervalId);
        isLocked = false;
        attemptsCount = 0;
        lockoutTimer = 0;
      }
    }, 1000);
  }

  async function handleSubmit() {
    if (isLocked || isSubmitting) return;
    const code = activeMethod === 'supervisor' ? supervisorToken.trim() : digits.join('');
    if (!code) return;

    isSubmitting = true;
    errorMsg = null;

    try {
      if (onverify) {
        const result = await onverify({
          method: activeMethod,
          code,
          supervisorToken: activeMethod === 'supervisor' ? supervisorToken : undefined,
        });
        if (result === false) {
          handleFailure();
          return;
        }
      }
      successMsg = '特权鉴权成功，正在执行授权指令...';
      setTimeout(() => {
        open = false;
        isSubmitting = false;
        successMsg = null;
        resetCode();
      }, 600);
    } catch (err: unknown) {
      handleFailure(err instanceof Error ? err.message : '验证失败，请重试');
    } finally {
      if (!successMsg) {
        isSubmitting = false;
      }
    }
  }

  function handleFailure(customMsg?: string) {
    attemptsCount += 1;
    if (attemptsCount >= maxAttempts) {
      errorMsg = '连续鉴权失败次数超限，特权通道已锁定！';
      startLockout();
    } else {
      errorMsg = customMsg || `验证码错误，还剩 ${remainingAttempts} 次机会`;
      resetCode();
      const firstInput = document.getElementById('stepup-digit-0') as HTMLInputElement | null;
      if (firstInput) firstInput.focus();
    }
  }

  function handleClose() {
    if (isLocked) return;
    open = false;
    if (oncancel) oncancel();
  }

  onDestroy(() => {
    if (intervalId) clearInterval(intervalId);
    if (smsIntervalId) clearInterval(smsIntervalId);
  });
</script>

{#if open}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
    data-svadmin-component="StepUpAuthModal"
    role="dialog"
    aria-modal="true"
    aria-labelledby="stepup-auth-title"
  >
    <!-- Modal Card -->
    <div
      class="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl transition-all"
    >
      <!-- Close button -->
      {#if !isLocked}
        <button
          type="button"
          class="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          onclick={handleClose}
          aria-label="关闭"
        >
          <X class="h-5 w-5" />
        </button>
      {/if}

      <!-- Header Icon & Security Summary -->
      <div class="flex items-start gap-4 mb-5">
        <div
          class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive border border-destructive/20"
        >
          <ShieldAlert class="h-6 w-6" />
        </div>
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <h2 id="stepup-auth-title" class="text-lg font-semibold tracking-tight text-foreground">
              {title}
            </h2>
            <span
              class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wider
                {riskLevel === 'critical' ? 'bg-destructive/15 text-destructive border border-destructive/30 animate-pulse' :
                 riskLevel === 'high' ? 'bg-warning/15 text-warning border border-warning/30' :
                 'bg-muted text-muted-foreground'}"
            >
              {riskLevel === 'critical' ? '严重高危' : riskLevel === 'high' ? '高风险' : '特权操作'}
            </span>
          </div>
          <p class="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      <!-- Operation Target & Client Meta Banner -->
      <div class="mb-5 rounded-lg border border-border/80 bg-muted/40 p-3 text-xs space-y-1.5">
        <div class="flex items-center justify-between text-muted-foreground">
          <span>拟操作项目</span>
          <span class="font-medium text-foreground font-mono">{operationName}</span>
        </div>
        <div class="flex items-center justify-between text-muted-foreground">
          <span>终端来源</span>
          <span class="font-mono text-muted-foreground">{clientIp}</span>
        </div>
      </div>

      <!-- Lockout Alert -->
      {#if isLocked}
        <div
          class="mb-5 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3.5 text-destructive"
          role="alert"
        >
          <Lock class="h-5 w-5 shrink-0 mt-0.5" />
          <div class="text-xs space-y-1">
            <div class="font-semibold">特权鉴权通道已锁定</div>
            <div>
              连续错误次数已达上限。为确保系统资产安全，特权通道将在
              <span class="font-bold font-mono text-sm underline">{lockoutTimer}s</span>
              后自动解除。
            </div>
          </div>
        </div>
      {/if}

      <!-- Method Switch Tabs -->
      {#if methods.length > 1 && !isLocked}
        <div class="mb-5 flex rounded-lg border border-border bg-muted/30 p-1">
          {#if methods.includes('totp')}
            <button
              type="button"
              class="flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors
                {activeMethod === 'totp' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
              onclick={() => handleMethodSwitch('totp')}
            >
              <KeyRound class="h-3.5 w-3.5" />
              <span>动态口令 TOTP</span>
            </button>
          {/if}
          {#if methods.includes('sms')}
            <button
              type="button"
              class="flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors
                {activeMethod === 'sms' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
              onclick={() => handleMethodSwitch('sms')}
            >
              <Smartphone class="h-3.5 w-3.5" />
              <span>短信验证码</span>
            </button>
          {/if}
          {#if methods.includes('supervisor')}
            <button
              type="button"
              class="flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors
                {activeMethod === 'supervisor' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
              onclick={() => handleMethodSwitch('supervisor')}
            >
              <UserCheck class="h-3.5 w-3.5" />
              <span>主管授权码</span>
            </button>
          {/if}
        </div>
      {/if}

      <!-- Interactive Inputs -->
      <div class="space-y-4">
        {#if activeMethod === 'sms'}
          <div class="flex items-center justify-between text-xs text-muted-foreground">
            <span>已发送至绑定手机：<span class="font-mono font-medium text-foreground">{phoneMask}</span></span>
            <button
              type="button"
              class="font-medium text-primary hover:underline disabled:opacity-50 disabled:no-underline transition-colors"
              disabled={smsCooldown > 0 || isLocked}
              onclick={sendSmsCode}
            >
              {#if smsCooldown > 0}
                重新获取 ({smsCooldown}s)
              {:else}
                获取验证码
              {/if}
            </button>
          </div>
        {/if}

        {#if activeMethod === 'totp'}
          <div class="text-xs text-muted-foreground text-center">
            请输入身份验证器 App (Google Authenticator / 1Password) 生成的 6 位数字
          </div>
        {/if}

        {#if activeMethod === 'supervisor'}
          <div class="space-y-2">
            <label for="stepup-supervisor-token" class="text-xs text-muted-foreground">
              请输入直属主管或合规官签署的 6 位以上审批授权令牌（Ticket Key）
            </label>
            <input
              id="stepup-supervisor-token"
              type="text"
              class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono tracking-wider text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="SUPV-AUTH-XXXXXX"
              disabled={isLocked || isSubmitting}
              bind:value={supervisorToken}
            />
          </div>
        {:else}
          <!-- 6-digit PIN Box Grid -->
          <div class="flex items-center justify-center gap-2 sm:gap-3" onpaste={handlePaste}>
            {#each digits as digit, i}
              <input
                id="stepup-digit-{i}"
                type="text"
                inputmode="numeric"
                maxlength="1"
                class="h-12 w-11 rounded-lg border border-input bg-background text-center text-lg font-bold font-mono text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                value={digit}
                disabled={isLocked || isSubmitting}
                oninput={(e) => handleDigitInput(i, e)}
                onkeydown={(e) => handleDigitKeydown(i, e)}
              />
            {/each}
          </div>
        {/if}

        <!-- Error & Success Messages -->
        {#if errorMsg && !isLocked}
          <div class="flex items-center gap-2 text-xs text-destructive font-medium justify-center">
            <AlertTriangle class="h-3.5 w-3.5" />
            <span>{errorMsg}</span>
          </div>
        {/if}

        {#if successMsg}
          <div class="flex items-center gap-2 text-xs text-success font-medium justify-center">
            <CheckCircle2 class="h-3.5 w-3.5 text-success" />
            <span>{successMsg}</span>
          </div>
        {/if}

        {#if !isLocked && !successMsg && attemptsCount > 0}
          <div class="text-[11px] text-muted-foreground text-center">
            剩余尝试次数：<span class="font-bold text-foreground">{remainingAttempts}</span> / {maxAttempts}
          </div>
        {/if}
      </div>

      <!-- Action Footer -->
      <div class="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-border">
        {#if !isLocked}
          <button
            type="button"
            class="rounded-lg border border-input bg-background px-4 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            onclick={handleClose}
            disabled={isSubmitting}
          >
            取消操作
          </button>
        {/if}

        <button
          type="button"
          class="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-xs font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 transition-colors"
          disabled={!isCodeComplete || isLocked || isSubmitting}
          onclick={handleSubmit}
        >
          {#if isSubmitting}
            <RefreshCw class="h-3.5 w-3.5 animate-spin" />
            <span>正在校验特权...</span>
          {:else}
            <Unlock class="h-3.5 w-3.5" />
            <span>验证并执行</span>
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}
