<script lang="ts">
  import type { Snippet } from 'svelte';
  import ContentPageShell from '../content/ContentPageShell.svelte';
  import ContentPageHeader from '../content/ContentPageHeader.svelte';
  import StepForm, { type FormStep } from '../StepForm.svelte';

  interface Props {
    title: string;
    description?: string;
    actions?: Snippet;
    steps: FormStep[];
    currentStep?: number;
    children: Snippet;
    stepContent?: Snippet<[number]>;
    onstepchange?: (newStep: number, prevStep: number) => boolean | Promise<boolean> | undefined;
    onfinish?: () => void | Promise<void>;
    oncancel?: () => void;
    submitText?: string;
    nextText?: string;
    prevText?: string;
    isSubmitting?: boolean;
    pageId?: string;
    width?: 'narrow' | 'default' | 'wide';
  }

  let {
    title,
    description,
    actions,
    steps,
    currentStep = $bindable(0),
    children,
    stepContent,
    onstepchange,
    onfinish,
    oncancel,
    submitText = 'Submit',
    nextText = 'Next step',
    prevText = 'Previous step',
    isSubmitting = false,
    pageId = 'step-form',
    width = 'default',
  }: Props = $props();
</script>

<ContentPageShell {pageId} {width}>
  <ContentPageHeader {title} {...(description ? { description } : {})} {...(actions ? { actions } : {})} />
  <StepForm
    {steps}
    bind:currentStep
    {...(stepContent ? { stepContent } : {})}
    {...(onstepchange ? { onstepchange } : {})}
    {...(onfinish ? { onfinish } : {})}
    {...(oncancel ? { oncancel } : {})}
    {submitText}
    {nextText}
    {prevText}
    {isSubmitting}
  >
    {@render children()}
  </StepForm>
</ContentPageShell>