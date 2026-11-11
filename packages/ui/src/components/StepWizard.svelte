<script lang="ts">
  import { untrack, type Component, type Snippet } from 'svelte';
  import {
    AlertCircle,
    Check,
    ChevronLeft,
    ChevronRight,
    Loader2,
    RotateCcw,
    Save,
    X,
  } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { cn } from '../utils.js';
  import { Button } from './ui/button/index.js';
  import { Progress } from './ui/progress/index.js';

  export type StepWizardStatus = 'wait' | 'process' | 'finish' | 'error';

  export interface StepWizardItem {
    id: string;
    title: string;
    description?: string | undefined;
    icon?: Component | undefined;
    status?: StepWizardStatus | undefined;
    disabled?: boolean | undefined;
    /** Dynamic branch predicate: return false to hide this branch step */
    condition?: ((draft: Record<string, unknown>) => boolean) | undefined;
  }

  export interface StepWizardProps {
    steps: StepWizardItem[];
    currentStep?: number | undefined;
    draft?: Record<string, unknown> | undefined;
    direction?: 'horizontal' | 'vertical' | undefined;
    status?: StepWizardStatus | undefined;
    clickable?: boolean | undefined;
    storageKey?: string | undefined;
    showProgress?: boolean | undefined;
    beforeNext?:
      | ((stepIndex: number, step: StepWizardItem, draft: Record<string, unknown>) => Promise<boolean> | boolean)
      | undefined;
    onStepChange?: ((newStep: number, prevStep: number) => void) | undefined;
    onFinish?: ((draft: Record<string, unknown>) => Promise<void> | void) | undefined;
    onCancel?: (() => void) | undefined;
    onDraftRestore?: ((restored: { currentStep: number; draft: Record<string, unknown> }) => void) | undefined;
    submitText?: string | undefined;
    nextText?: string | undefined;
    prevText?: string | undefined;
    cancelText?: string | undefined;
    isSubmitting?: boolean | undefined;
    class?: string | undefined;
    stepContent?: Snippet<[{ step: StepWizardItem; index: number; draft: Record<string, unknown>; setDraft: (patch: Record<string, unknown>) => void }]> | undefined;
    children?: Snippet | undefined;
  }

  let {
    steps,
    currentStep = $bindable(0),
    draft = $bindable<Record<string, unknown>>({}),
    direction = 'horizontal',
    status = 'process',
    clickable = true,
    storageKey,
    showProgress = true,
    beforeNext,
    onStepChange,
    onFinish,
    onCancel,
    onDraftRestore,
    submitText,
    nextText,
    prevText,
    cancelText,
    isSubmitting = false,
    class: className = '',
    stepContent,
    children,
  }: StepWizardProps = $props();

  const i18n = useTranslation();
  const chinese = $derived(i18n.locale.startsWith('zh'));

  // Filter active steps dynamically based on condition predicates (branching)
  const activeSteps = $derived(
    steps.filter((step) => (step.condition ? step.condition(draft) : true)),
  );

  let isValidating = $state(false);
  let stepErrorMessage = $state<string | null>(null);
  let erroredStepIndex = $state<number | null>(null);
  let draftRestored = $state(false);
  let hydrated = false;

  // Clamp currentStep if dynamic branches collapse
  $effect(() => {
    if (activeSteps.length > 0 && currentStep >= activeSteps.length) {
      currentStep = activeSteps.length - 1;
    }
  });

  // Restore draft from localStorage on mount when storageKey is set
  $effect(() => {
    const key = storageKey;
    if (hydrated || !key || typeof window === 'undefined') return;
    hydrated = true;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;
      const record = parsed as Record<string, unknown>;
      const savedDraft = record['draft'];
      const savedStep = record['currentStep'];
      if (savedDraft && typeof savedDraft === 'object' && !Array.isArray(savedDraft)) {
        draft = { ...untrack(() => draft), ...(savedDraft as Record<string, unknown>) };
      }
      if (typeof savedStep === 'number' && Number.isFinite(savedStep) && savedStep >= 0) {
        currentStep = savedStep;
      }
      draftRestored = true;
      onDraftRestore?.({ currentStep, draft });
    } catch {
      // Ignore malformed draft payload
    }
  });

  // Persist draft and step automatically when storageKey is configured
  function persistDraft(nextStep: number, nextDraft: Record<string, unknown>) {
    if (!storageKey || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          currentStep: nextStep,
          draft: nextDraft,
          updatedAt: new Date().toISOString(),
        }),
      );
    } catch {
      // Storage quota or availability failure
    }
  }

  $effect(() => {
    const stepSnapshot = currentStep;
    const draftSnapshot = draft;
    if (!storageKey || !hydrated) return;
    persistDraft(stepSnapshot, draftSnapshot);
  });

  export function clearDraft(): void {
    if (storageKey && typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(storageKey);
      } catch {
        // Ignore
      }
    }
    draftRestored = false;
  }

  export function setDraft(patch: Record<string, unknown>): void {
    draft = { ...draft, ...patch };
  }

  function resolveStepStatus(index: number, item: StepWizardItem): StepWizardStatus {
    if (erroredStepIndex === index) return 'error';
    if (item.status) return item.status;
    if (index < currentStep) return 'finish';
    if (index === currentStep) return status;
    return 'wait';
  }

  async function goToStep(targetIndex: number) {
    if (isValidating || isSubmitting) return;
    if (targetIndex < 0 || targetIndex >= activeSteps.length) return;
    if (targetIndex === currentStep) return;

    const targetStep = activeSteps[targetIndex];
    if (!targetStep || targetStep.disabled) return;

    if (targetIndex > currentStep && beforeNext) {
      const current = activeSteps[currentStep];
      if (current) {
        isValidating = true;
        stepErrorMessage = null;
        erroredStepIndex = null;
        try {
          const ok = await beforeNext(currentStep, current, draft);
          if (!ok) {
            erroredStepIndex = currentStep;
            stepErrorMessage = chinese
              ? `步骤「${current.title}」校验未通过，请检查填写内容`
              : `Validation failed on step "${current.title}"`;
            return;
          }
        } catch (err) {
          erroredStepIndex = currentStep;
          stepErrorMessage =
            err instanceof Error
              ? err.message
              : chinese
                ? '步骤校验异常'
                : 'Step validation error';
          return;
        } finally {
          isValidating = false;
        }
      }
    } else {
      stepErrorMessage = null;
      erroredStepIndex = null;
    }

    const prev = currentStep;
    currentStep = targetIndex;
    persistDraft(currentStep, draft);
    onStepChange?.(currentStep, prev);
  }

  async function handleNext() {
    if (isValidating || isSubmitting) return;
    const isLast = currentStep >= activeSteps.length - 1;
    const current = activeSteps[currentStep];
    if (!current) return;

    if (beforeNext) {
      isValidating = true;
      stepErrorMessage = null;
      erroredStepIndex = null;
      try {
        const ok = await beforeNext(currentStep, current, draft);
        if (!ok) {
          erroredStepIndex = currentStep;
          stepErrorMessage = chinese
            ? `步骤「${current.title}」校验未通过，请完善必填信息`
            : `Step "${current.title}" validation did not pass`;
          return;
        }
      } catch (err) {
        erroredStepIndex = currentStep;
        stepErrorMessage =
          err instanceof Error
            ? err.message
            : chinese
              ? '步骤校验失败'
              : 'Step validation failed';
        return;
      } finally {
        isValidating = false;
      }
    } else {
      stepErrorMessage = null;
      erroredStepIndex = null;
    }

    if (!isLast) {
      const prev = currentStep;
      currentStep = currentStep + 1;
      persistDraft(currentStep, draft);
      onStepChange?.(currentStep, prev);
    } else {
      await onFinish?.(draft);
      clearDraft();
    }
  }

  function handlePrev() {
    if (currentStep > 0) {
      void goToStep(currentStep - 1);
    }
  }

  function handleResetWizard() {
    clearDraft();
    draft = {};
    currentStep = 0;
    stepErrorMessage = null;
    erroredStepIndex = null;
  }

  const currentItem = $derived(activeSteps[currentStep]);
  const isLastStep = $derived(activeSteps.length > 0 && currentStep >= activeSteps.length - 1);
  const progressPercentage = $derived(
    activeSteps.length > 0 ? Math.round(((currentStep + 1) / activeSteps.length) * 100) : 0,
  );

  const resolvedSubmitText = $derived(submitText ?? (chinese ? '提交完成' : 'Finish'));
  const resolvedNextText = $derived(nextText ?? (chinese ? '下一步' : 'Next'));
  const resolvedPrevText = $derived(prevText ?? (chinese ? '上一步' : 'Previous'));
  const resolvedCancelText = $derived(cancelText ?? (chinese ? '取消' : 'Cancel'));
</script>

<div
  data-svadmin-component="StepWizard"
  data-direction={direction}
  class={cn(
    'rounded-xl border border-border bg-card text-card-foreground shadow-xs overflow-hidden',
    className,
  )}
>
  {#if showProgress || (storageKey && draftRestored)}
    <div class="border-b border-border/60 bg-muted/20 px-6 py-3 space-y-2">
      <div class="flex items-center justify-between gap-3 text-xs">
        <span class="font-medium text-muted-foreground">
          {chinese
            ? `第 ${currentStep + 1} 步 / 共 ${activeSteps.length} 步`
            : `Step ${currentStep + 1} of ${activeSteps.length}`}
        </span>
        <div class="flex items-center gap-3">
          {#if storageKey && draftRestored}
            <span class="inline-flex items-center gap-1 rounded-full bg-info/10 px-2 py-0.5 text-[11px] font-medium text-info">
              <Save class="h-3 w-3" />
              {chinese ? '已自动恢复上次草稿' : 'Draft restored'}
            </span>
          {/if}
          {#if storageKey}
            <button
              type="button"
              onclick={handleResetWizard}
              class="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <RotateCcw class="h-3 w-3" />
              {chinese ? '清除草稿' : 'Reset Draft'}
            </button>
          {/if}
        </div>
      </div>
      {#if showProgress}
        <Progress value={progressPercentage} class="h-1.5" />
      {/if}
    </div>
  {/if}

  <div class={cn(direction === 'vertical' ? 'grid grid-cols-1 md:grid-cols-[260px_minmax(0,1fr)]' : 'flex flex-col')}>
    <nav
      aria-label="Wizard steps"
      class={cn(
        'bg-muted/10 p-6',
        direction === 'vertical'
          ? 'border-b md:border-b-0 md:border-r border-border/60'
          : 'border-b border-border/60',
      )}
    >
      <ol
        class={cn(
          'flex gap-3 list-none m-0 p-0',
          direction === 'vertical' ? 'flex-col' : 'flex-row items-center overflow-x-auto',
        )}
      >
        {#each activeSteps as step, index (step.id)}
          {@const stepState = resolveStepStatus(index, step)}
          {@const canClick = clickable && !step.disabled && !isValidating && !isSubmitting && index !== currentStep}
          <li
            class={cn(
              'relative flex',
              direction === 'vertical' ? 'flex-col' : 'flex-1 min-w-0 items-center gap-2',
              step.disabled && 'opacity-50',
            )}
            data-step-id={step.id}
            data-step-status={stepState}
          >
            <button
              type="button"
              disabled={!canClick}
              onclick={() => goToStep(index)}
              aria-current={index === currentStep ? 'step' : undefined}
              class={cn(
                'flex items-start gap-3 text-left rounded-lg p-1.5 -m-1.5 transition-colors bg-transparent border-0',
                canClick ? 'cursor-pointer hover:bg-accent/50' : 'cursor-default',
                direction === 'vertical' && 'w-full',
              )}
            >
              <span
                class={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-all',
                  stepState === 'finish' && 'border-success bg-success text-success-foreground',
                  stepState === 'process' && 'border-primary bg-primary text-primary-foreground ring-4 ring-primary/15',
                  stepState === 'error' && 'border-destructive bg-destructive text-destructive-foreground',
                  stepState === 'wait' && 'border-border bg-card text-muted-foreground',
                )}
              >
                {#if stepState === 'finish'}
                  <Check class="h-4 w-4" />
                {:else if stepState === 'error'}
                  <X class="h-4 w-4" />
                {:else if step.icon}
                  {@const IconComp = step.icon}
                  <IconComp class="h-4 w-4" />
                {:else}
                  {index + 1}
                {/if}
              </span>

              <span class="min-w-0 flex-1 pt-0.5">
                <span
                  class={cn(
                    'block text-xs font-semibold truncate',
                    stepState === 'process' ? 'text-foreground' : stepState === 'error' ? 'text-destructive' : 'text-muted-foreground',
                  )}
                >
                  {step.title}
                </span>
                {#if step.description}
                  <span class="block text-[11px] text-muted-foreground/80 truncate mt-0.5">
                    {step.description}
                  </span>
                {/if}
              </span>
            </button>

            {#if index < activeSteps.length - 1}
              {#if direction === 'horizontal'}
                <div class="hidden sm:flex flex-1 items-center px-1">
                  <div
                    class={cn(
                      'h-0.5 w-full rounded-full transition-colors',
                      stepState === 'finish' ? 'bg-success' : 'bg-border',
                    )}
                  ></div>
                </div>
              {:else}
                <div
                  class={cn(
                    'ml-4 my-1 w-0.5 h-5 rounded-full transition-colors',
                    stepState === 'finish' ? 'bg-success' : 'bg-border',
                  )}
                  aria-hidden="true"
                ></div>
              {/if}
            {/if}
          </li>
        {/each}
      </ol>
    </nav>

    <div class="flex flex-col justify-between p-6">
      <div class="space-y-4">
        {#if stepErrorMessage}
          <div
            role="alert"
            class="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-xs text-destructive"
          >
            <AlertCircle class="h-4 w-4 shrink-0" />
            <span>{stepErrorMessage}</span>
          </div>
        {/if}

        {#if currentItem}
          <div>
            {#if stepContent}
              {@render stepContent({ step: currentItem, index: currentStep, draft, setDraft })}
            {:else if children}
              {@render children()}
            {/if}
          </div>
        {/if}
      </div>

      <div class="mt-8 flex items-center justify-between pt-4 border-t border-border/60">
        <div>
          {#if onCancel}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onclick={onCancel}
              disabled={isValidating || isSubmitting}
            >
              {resolvedCancelText}
            </Button>
          {/if}
        </div>

        <div class="flex items-center gap-2.5">
          {#if currentStep > 0}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onclick={handlePrev}
              disabled={isValidating || isSubmitting}
              class="gap-1"
            >
              <ChevronLeft class="h-4 w-4" />
              {resolvedPrevText}
            </Button>
          {/if}

          <Button
            type="button"
            size="sm"
            onclick={handleNext}
            disabled={isValidating || isSubmitting || activeSteps.length === 0}
            class="gap-1 min-w-24"
          >
            {#if isValidating || isSubmitting}
              <Loader2 class="h-4 w-4 animate-spin" />
              <span>{chinese ? '校验处理中...' : 'Processing...'}</span>
            {:else if isLastStep}
              <Check class="h-4 w-4" />
              <span>{resolvedSubmitText}</span>
            {:else}
              <span>{resolvedNextText}</span>
              <ChevronRight class="h-4 w-4" />
            {/if}
          </Button>
        </div>
      </div>
    </div>
  </div>
</div>
