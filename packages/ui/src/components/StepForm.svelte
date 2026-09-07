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

<div class={cn('svadmin-u-b3542e058833 svadmin-u-a217b4eaa918 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-cd0ad9a56558 svadmin-u-0478c89a150f svadmin-u-cef5b893cf23', className)}>
  <!-- Step Navigation Header -->
  <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-77a2a20e90d4 svadmin-u-1384f66f41d0 svadmin-u-9fcd8a13827e svadmin-u-65fdbade2025 svadmin-u-05faf5c801ff">
    {#each steps as step, index (index)}
      {@const isCompleted = index < currentStep}
      {@const isCurrent = index === currentStep}
      <button
        type="button"
        class={cn(
          'svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-1004c0c3954c svadmin-u-ceb69a6b0e5f svadmin-u-2eba0d65d059 group svadmin-u-34516836730d svadmin-u-7f19cdf4c5bb svadmin-u-119b2aa0b8f6 svadmin-u-8a539c7fe216',
          index <= currentStep ? 'svadmin-u-3972e98dc84f' : 'svadmin-u-0b8c506a0596 svadmin-u-c79b07fb641f'
        )}
        onclick={() => goToStep(index)}
        disabled={isSubmitting || isMoving}
      >
        <div
          class={cn(
            'svadmin-u-60fbb7713999 svadmin-u-e7a768f922d2 svadmin-u-ae2181c7b10f svadmin-u-012fbd121f37 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-ac204c108886 svadmin-u-359090c2d529 svadmin-u-e83a7042bc91 svadmin-u-0fe7d7d814d0 svadmin-u-cef5b893cf23',
            isCompleted
              ? 'svadmin-u-3355648fe22b svadmin-u-5a1ab9dd55a5'
              : isCurrent
                ? 'svadmin-u-75b1bec3ea0e svadmin-u-30ca335ae9c2 svadmin-u-44559afbdbd7 svadmin-u-2b6f77ad4036'
                : 'svadmin-u-2ef11f1cb219 svadmin-u-bfa603190748 svadmin-u-1b5347a3c1a4'
          )}
        >
          {#if isCompleted}
            <Check class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
          {:else if step.icon}
            <step.icon class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
          {:else}
            {index + 1}
          {/if}
        </div>

        <div class="svadmin-u-99d72c7fc3e2 svadmin-u-676c91deb47e">
          <div class={cn('svadmin-u-359090c2d529 svadmin-u-2689f3958069', isCurrent ? 'svadmin-u-d4108abe6359 svadmin-u-e83a7042bc91' : 'svadmin-u-bfa603190748')}>
            {step.title}
          </div>
          {#if step.description}
            <div class="svadmin-u-d058ca6de60f svadmin-u-cddc79d3aaec svadmin-u-f283ea9bea0e svadmin-u-1d274d2422d8">
              {step.description}
            </div>
          {/if}
        </div>
      </button>

      {#if index < steps.length - 1}
        <div class="svadmin-u-99d72c7fc3e2 svadmin-u-36e579c0b41c svadmin-u-02fc11cfd270 svadmin-u-3960ffc248d9 svadmin-u-d5eab218aa34">
          <div class={cn('svadmin-u-10db0d558201 svadmin-u-6da6a3c3f741 svadmin-u-07389a777c1f svadmin-u-ceb69a6b0e5f', index < currentStep ? 'svadmin-u-3355648fe22b' : 'svadmin-u-a59afa8d9b9d')}></div>
        </div>
      {/if}
    {/each}
  </div>

  <!-- Step Content Body -->
  <div class="svadmin-u-03b4dd7f172b svadmin-u-4b159de349a5">
    {#if stepContent}
      {@render stepContent(currentStep)}
    {:else if children}
      {@render children()}
    {/if}
  </div>

  <!-- Actions Footer -->
  <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-173fa8f06789 svadmin-u-b950dda299d3 svadmin-u-05faf5c801ff">
    <div>
      {#if oncancel}
        <Button variant="ghost" size="sm" onclick={oncancel} disabled={isSubmitting || isMoving}>
          Cancel
        </Button>
      {/if}
    </div>

    <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4">
      {#if currentStep > 0}
        <Button
          variant="outline"
          size="sm"
          onclick={handlePrev}
          disabled={isSubmitting || isMoving}
          class="svadmin-u-44ee8ba0a421"
        >
          <ChevronLeft class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
          {prevText}
        </Button>
      {/if}

      <Button
        size="sm"
        onclick={handleNext}
        disabled={isSubmitting || isMoving}
        class="svadmin-u-44ee8ba0a421 svadmin-u-25effcb585ab"
      >
        {#if isSubmitting || isMoving}
          <Loader2 class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-afbdd13a380e" />
        {:else if currentStep === steps.length - 1}
          {submitText}
        {:else}
          {nextText}
          <ChevronRight class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
        {/if}
      </Button>
    </div>
  </div>
</div>
