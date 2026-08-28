<script lang="ts">
  import type { Snippet, Component } from 'svelte';
  import { Button } from './ui/button/index.js';
  import { Check, ChevronRight, ChevronLeft, Loader2 } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export interface FormStep {
    title: string;
    description?: string;
    icon?: Component;
  }

  interface Props {
    steps: FormStep[];
    currentStep?: number;
    onstepchange?: (newStep: number, prevStep: number) => boolean | Promise<boolean> | undefined;
    onfinish?: () => void | Promise<void>;
    oncancel?: () => void;
    submitText?: string;
    nextText?: string;
    prevText?: string;
    isSubmitting?: boolean;
    class?: string;
    children?: Snippet;
    stepContent?: Snippet<[number]>;
  }

  let {
    steps,
    currentStep = $bindable(0),
    onstepchange,
    onfinish,
    oncancel,
    submitText = 'Submit',
    nextText = 'Next Step',
    prevText = 'Previous Step',
    isSubmitting = false,
    class: className = '',
    children,
    stepContent,
  }: Props = $props();

  let isMoving = $state(false);

  async function goToStep(targetIndex: number) {
    if (targetIndex < 0 || targetIndex >= steps.length) return;
    if (targetIndex === currentStep) return;

    isMoving = true;
    try {
      if (onstepchange) {
        const canProceed = await onstepchange(targetIndex, currentStep);
        if (canProceed === false) return;
      }
      currentStep = targetIndex;
    } finally {
      isMoving = false;
    }
  }

  async function handleNext() {
    if (currentStep < steps.length - 1) {
      await goToStep(currentStep + 1);
    } else {
      await onfinish?.();
    }
  }

  async function handlePrev() {
    if (currentStep > 0) {
      await goToStep(currentStep - 1);
    }
  }
</script>

<div class={cn('space-y-6 rounded-xl border border-border bg-card p-6 shadow-xs', className)}>
  <!-- Step Navigation Header -->
  <div class="flex items-center justify-between gap-2 overflow-x-auto pb-4 border-b border-border/60">
    {#each steps as step, index (index)}
      {@const isCompleted = index < currentStep}
      {@const isCurrent = index === currentStep}
      <button
        type="button"
        class={cn(
          'flex items-center gap-3 transition-colors text-left group cursor-pointer bg-transparent border-0 p-0',
          index <= currentStep ? 'opacity-100' : 'opacity-50 hover:opacity-75'
        )}
        onclick={() => goToStep(index)}
        disabled={isSubmitting || isMoving}
      >
        <div
          class={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all shadow-xs',
            isCompleted
              ? 'bg-success text-success-foreground'
              : isCurrent
                ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                : 'bg-muted text-muted-foreground group-hover:bg-muted/80'
          )}
        >
          {#if isCompleted}
            <Check class="h-4 w-4" />
          {:else if step.icon}
            <step.icon class="h-4 w-4" />
          {:else}
            {index + 1}
          {/if}
        </div>

        <div class="hidden sm:block">
          <div class={cn('text-xs font-medium', isCurrent ? 'text-foreground font-semibold' : 'text-muted-foreground')}>
            {step.title}
          </div>
          {#if step.description}
            <div class="text-[11px] text-muted-foreground/70 truncate max-w-32">
              {step.description}
            </div>
          {/if}
        </div>
      </button>

      {#if index < steps.length - 1}
        <div class="hidden flex-1 sm:flex items-center px-2">
          <div class={cn('h-0.5 w-full rounded transition-colors', index < currentStep ? 'bg-success' : 'bg-border')}></div>
        </div>
      {/if}
    {/each}
  </div>

  <!-- Step Content Body -->
  <div class="py-2 min-h-48">
    {#if stepContent}
      {@render stepContent(currentStep)}
    {:else if children}
      {@render children()}
    {/if}
  </div>

  <!-- Actions Footer -->
  <div class="flex items-center justify-between pt-4 border-t border-border/60">
    <div>
      {#if oncancel}
        <Button variant="ghost" size="sm" onclick={oncancel} disabled={isSubmitting || isMoving}>
          Cancel
        </Button>
      {/if}
    </div>

    <div class="flex items-center gap-2">
      {#if currentStep > 0}
        <Button
          variant="outline"
          size="sm"
          onclick={handlePrev}
          disabled={isSubmitting || isMoving}
          class="gap-1"
        >
          <ChevronLeft class="h-4 w-4" />
          {prevText}
        </Button>
      {/if}

      <Button
        size="sm"
        onclick={handleNext}
        disabled={isSubmitting || isMoving}
        class="gap-1 min-w-24"
      >
        {#if isSubmitting || isMoving}
          <Loader2 class="h-4 w-4 animate-spin" />
        {:else if currentStep === steps.length - 1}
          {submitText}
        {:else}
          {nextText}
          <ChevronRight class="h-4 w-4" />
        {/if}
      </Button>
    </div>
  </div>
</div>
