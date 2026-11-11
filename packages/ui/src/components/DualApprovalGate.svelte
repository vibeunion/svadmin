<script lang="ts">
  import { untrack, type Snippet } from 'svelte';
  import {
    ShieldCheck,
    Users,
    QrCode,
    KeyRound,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Loader2,
    Copy,
    Check,
    X,
  } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { cn } from '../utils.js';
  import { Button } from './ui/button/index.js';

  export type ApprovalMode = 'onsite' | 'remote';

  export interface ReviewerVerificationPayload {
    reviewerId: string;
    reviewerName?: string | undefined;
    reviewerRole: string;
    secret: string;
    actionTitle: string;
  }

  export interface DualApprovalAuditRecord {
    actionId: string;
    actionTitle: string;
    initiator?: string | undefined;
    reviewerId: string;
    reviewerRole: string;
    mode: ApprovalMode;
    approvedAt: string;
    auditHash: string;
  }

  export interface DualApprovalGateProps {
    open?: boolean | undefined;
    actionTitle: string;
    actionDescription?: string | undefined;
    actionPayload?: Record<string, unknown> | undefined;
    requiredRole?: string | undefined;
    defaultMode?: ApprovalMode | undefined;
    allowModeSwitch?: boolean | undefined;
    verifyReviewer?: ((payload: ReviewerVerificationPayload) => Promise<boolean | undefined> | boolean | undefined) | undefined;
    onApproved?: ((record: DualApprovalAuditRecord) => void) | undefined;
    onRejected?: ((reason?: string) => void) | undefined;
    class?: string | undefined;
    trigger?: Snippet<[{ openModal: () => void }]> | undefined;
    children?: Snippet | undefined;
  }

  let {
    open = $bindable(false),
    actionTitle,
    actionDescription,
    actionPayload,
    requiredRole = '合规主管 / Supervisor Admin',
    defaultMode = 'onsite',
    allowModeSwitch = true,
    verifyReviewer,
    onApproved,
    onRejected,
    class: className = '',
    trigger,
    children,
  }: DualApprovalGateProps = $props();

  const i18n = useTranslation();
  const chinese = $derived(i18n.locale.startsWith('zh'));

  let activeMode = $state<ApprovalMode>(untrack(() => defaultMode));
  let reviewerId = $state('');
  let reviewerName = $state('');
  let reviewerSecret = $state('');
  let isVerifying = $state(false);
  let errorMessage = $state<string | null>(null);
  let isCopied = $state(false);

  const actionId = $derived(`action-${Math.random().toString(36).slice(2, 9)}`);
  const remoteReviewUrl = $derived(
    typeof window !== 'undefined'
      ? `${window.location.origin}/approval/dual-review?id=${actionId}`
      : `https://example.com/approval/dual-review?id=${actionId}`,
  );

  function generateAuditHash(): string {
    const raw = `${actionId}:${reviewerId}:${Date.now()}:${JSON.stringify(actionPayload ?? {})}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = (hash << 5) - hash + raw.charCodeAt(i);
      hash |= 0;
    }
    return `SHA-${Math.abs(hash).toString(16).padStart(8, '0')}`;
  }

  async function handleOnsiteSubmit() {
    if (!reviewerId.trim() || !reviewerSecret.trim()) {
      errorMessage = chinese ? '请完整填写复核人员工号与核验口令' : 'Please provide reviewer ID and authorization secret';
      return;
    }

    isVerifying = true;
    errorMessage = null;

    try {
      if (verifyReviewer) {
        const passed = await verifyReviewer({
          reviewerId: reviewerId.trim(),
          reviewerName: reviewerName.trim() || undefined,
          reviewerRole: requiredRole,
          secret: reviewerSecret.trim(),
          actionTitle,
        });
        if (passed === false) {
          errorMessage = chinese ? '复核人鉴权未通过，请核对权限或密码' : 'Reviewer authorization failed';
          return;
        }
      }

      const auditRecord: DualApprovalAuditRecord = {
        actionId,
        actionTitle,
        reviewerId: reviewerId.trim(),
        reviewerRole: requiredRole,
        mode: 'onsite',
        approvedAt: new Date().toISOString(),
        auditHash: generateAuditHash(),
      };

      open = false;
      onApproved?.(auditRecord);
      resetState();
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
    } finally {
      isVerifying = false;
    }
  }

  function handleCancel() {
    open = false;
    onRejected?.('User canceled dual approval flow');
    resetState();
  }

  function resetState() {
    reviewerId = '';
    reviewerName = '';
    reviewerSecret = '';
    errorMessage = null;
    isVerifying = false;
  }

  async function handleCopyLink() {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(remoteReviewUrl);
      isCopied = true;
      setTimeout(() => {
        isCopied = false;
      }, 1500);
    }
  }

  const resolvedDesc = $derived(
    actionDescription ??
      (chinese
        ? '本操作涉及高危特权变更或资金资产，系统已开启双人双锁（Two-Person Rule）联签保护，须由第二位授权人员复核后方可执行。'
        : 'This operation involves high-privilege changes. Dual-person approval (Two-Person Rule) is strictly required before execution.'),
  );
</script>

{#if trigger}
  {@render trigger({ openModal: () => (open = true) })}
{:else if children}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div onclick={() => (open = true)} class="inline-block">
    {@render children()}
  </div>
{/if}

{#if open}
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="dual-approval-title"
    aria-describedby="dual-approval-desc"
    data-svadmin-component="DualApprovalGate"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
  >
    <!-- Modal Card -->
    <div
      class={cn(
        'relative z-10 w-full max-w-lg rounded-md border border-border bg-card p-6 text-card-foreground shadow-[var(--shadow-overlay)] animate-in fade-in zoom-in-95 duration-150',
        className,
      )}
    >
      <!-- Header -->
      <div class="flex items-start justify-between border-b border-border/60 pb-4">
        <div class="flex items-center gap-3">
          <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-destructive/15 text-destructive border border-destructive/20">
            <ShieldCheck class="h-6 w-6" />
          </div>
          <div>
            <div class="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive mb-1">
              <AlertTriangle class="h-3 w-3" />
              <span>{chinese ? '特权高危操作 · 双人双锁' : 'Two-Person Rule Required'}</span>
            </div>
            <h3 id="dual-approval-title" class="text-base font-bold text-foreground">
              {actionTitle}
            </h3>
          </div>
        </div>

        <button
          type="button"
          onclick={handleCancel}
          class="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X class="h-4 w-4" />
        </button>
      </div>

      <!-- Description Banner -->
      <p id="dual-approval-desc" class="text-xs text-muted-foreground leading-relaxed my-3">
        {resolvedDesc}
      </p>

      <!-- Mode Switcher Tabs -->
      {#if allowModeSwitch}
        <div class="flex rounded-lg border border-border bg-muted/40 p-1 mb-4 text-xs">
          <button
            type="button"
            onclick={() => (activeMode = 'onsite')}
            class={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md font-medium transition-all',
              activeMode === 'onsite' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <KeyRound class="h-3.5 w-3.5" />
            <span>{chinese ? '当面同台复核' : 'Onsite Review'}</span>
          </button>
          <button
            type="button"
            onclick={() => (activeMode = 'remote')}
            class={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md font-medium transition-all',
              activeMode === 'remote' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <QrCode class="h-3.5 w-3.5" />
            <span>{chinese ? '扫码/链接远程复核' : 'Remote QR Review'}</span>
          </button>
        </div>
      {/if}

      <!-- Error alert -->
      {#if errorMessage}
        <div role="alert" class="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive mb-4">
          <XCircle class="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      {/if}

      {#if activeMode === 'onsite'}
        <!-- Onsite Form -->
        <div class="space-y-3.5 text-xs">
          <div>
            <label for="reviewer-role" class="block font-medium text-foreground mb-1">
              {chinese ? '指定复核角色' : 'Required Role'}
            </label>
            <div id="reviewer-role" class="flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-3 py-1.5 text-muted-foreground font-mono">
              <Users class="h-3.5 w-3.5 text-primary" />
              <span>{requiredRole}</span>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label for="reviewer-id" class="block font-medium text-foreground mb-1">
                {chinese ? '复核人工号/账号 *' : 'Reviewer ID *'}
              </label>
              <input
                id="reviewer-id"
                type="text"
                bind:value={reviewerId}
                placeholder={chinese ? '例如: MGR-8801' : 'E.g. ADM-001'}
                class="h-8.5 w-full rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div>
              <label for="reviewer-name" class="block font-medium text-foreground mb-1">
                {chinese ? '复核人姓名 (选填)' : 'Name (Optional)'}
              </label>
              <input
                id="reviewer-name"
                type="text"
                bind:value={reviewerName}
                placeholder={chinese ? '真实姓名' : 'Reviewer name'}
                class="h-8.5 w-full rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>

          <div>
            <label for="reviewer-secret" class="block font-medium text-foreground mb-1">
              {chinese ? '复核人口令 / 动态 2FA 验证码 *' : 'Reviewer Password / 2FA OTP *'}
            </label>
            <input
              id="reviewer-secret"
              type="password"
              bind:value={reviewerSecret}
              placeholder={chinese ? '输入复核人独立认证口令' : 'Enter authorization secret'}
              class="h-8.5 w-full rounded-md border border-input bg-background px-3 text-xs font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>
      {:else}
        <!-- Remote Review QR Code -->
        <div class="flex flex-col items-center justify-center p-4 border border-dashed border-border rounded-md bg-muted/20 text-center space-y-3">
          <div class="flex h-36 w-36 items-center justify-center rounded-sm bg-background border border-border shadow-xs text-xs text-muted-foreground p-3">
            <div class="space-y-1 text-center">
              <QrCode class="h-16 w-16 mx-auto text-primary/80" />
              <div class="text-xs font-mono">{chinese ? '复核专属二维码' : 'Approval QR'}</div>
            </div>
          </div>

          <div class="space-y-1 max-w-sm">
            <p class="text-xs font-medium text-foreground">
              {chinese ? '请联系主管使用移动端扫描上方二维码或点击链接复核' : 'Share link with supervisor to sign remotely'}
            </p>
            <div class="flex items-center gap-1.5 pt-1">
              <input
                readonly
                value={remoteReviewUrl}
                class="h-7 w-full rounded border border-border bg-background px-2 text-xs font-mono text-muted-foreground"
              />
              <Button size="sm" variant="outline" class="h-7 px-2 shrink-0" onclick={handleCopyLink}>
                {#if isCopied}
                  <Check class="h-3.5 w-3.5 text-success" />
                {:else}
                  <Copy class="h-3.5 w-3.5" />
                {/if}
              </Button>
            </div>
          </div>
        </div>
      {/if}

      <!-- Footer Actions -->
      <div class="mt-6 flex items-center justify-between border-t border-border/60 pt-4">
        <span class="text-xs text-muted-foreground font-mono">
          ID: {actionId}
        </span>

        <div class="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onclick={handleCancel}
            disabled={isVerifying}
          >
            {chinese ? '放弃操作' : 'Cancel'}
          </Button>

          {#if activeMode === 'onsite'}
            <Button
              type="button"
              size="sm"
              onclick={handleOnsiteSubmit}
              disabled={isVerifying || !reviewerId || !reviewerSecret}
              class="gap-1.5 min-w-28 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {#if isVerifying}
                <Loader2 class="h-3.5 w-3.5 animate-spin" />
                <span>{chinese ? '联签核验中...' : 'Verifying...'}</span>
              {:else}
                <ShieldCheck class="h-3.5 w-3.5" />
                <span>{chinese ? '确认双人联签' : 'Dual Approve'}</span>
              {/if}
            </Button>
          {:else}
            <Button
              type="button"
              size="sm"
              onclick={() => {
                // Simulate approval callback for remote mode demo
                const auditRecord: DualApprovalAuditRecord = {
                  actionId,
                  actionTitle,
                  reviewerId: 'REMOTE-MGR',
                  reviewerRole: requiredRole,
                  mode: 'remote',
                  approvedAt: new Date().toISOString(),
                  auditHash: generateAuditHash(),
                };
                open = false;
                onApproved?.(auditRecord);
                resetState();
              }}
              class="gap-1.5"
            >
              <CheckCircle2 class="h-3.5 w-3.5 text-success" />
              <span>{chinese ? '模拟远程复核通过' : 'Simulate Approved'}</span>
            </Button>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}
