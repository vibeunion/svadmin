<script lang="ts">
  import { fly } from 'svelte/transition';
  import { captureAdminContext, useStepsForm, deriveValidator } from '@svadmin/core';
  import type { FieldDefinition } from '@svadmin/core';
  import { getResource } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';

  import { Button } from './ui/button/index.js';
  import * as Card from './ui/card/index.js';
  import { Badge } from './ui/badge/index.js';
  import { Progress } from './ui/progress/index.js';
  import { Save, ArrowLeft, ArrowRight, Check, Loader2 } from '@lucide/svelte';
  import FieldRenderer from './FieldRenderer.svelte';

  const i18n = useTranslation();

  interface StepDef {
    title: string;
    fields: string[];
  }

  interface Props {
    resourceName: string;
    id?: string | number;
    mode?: 'create' | 'edit';
    steps: StepDef[];
  }

  let { resourceName, id, mode = 'create', steps }: Props = $props();
  const adminContext = captureAdminContext();

  const resource = $derived(getResource(resourceName));
  const primaryKey = $derived(resource.primaryKey ?? 'id');

  // All fields used across all steps
  const flatStepsFields = $derived(steps.flatMap(s => s.fields)
    .map(key => resource.fields.find(f => f.key === key))
    .filter((f): f is FieldDefinition => f != null));

  // Default values from field metadata
  function getDefaultForType(field: FieldDefinition): unknown {
    switch (field.type) {
      case 'text': case 'textarea': case 'richtext': case 'image': return '';
      case 'number': return 0;
      case 'boolean': return false;
      case 'tags': case 'images': case 'multiselect': return [];
      case 'select': return field.options?.[0]?.value ?? '';
      case 'json': return {};
      default: return '';
    }
  }

  const defaults = $derived((() => {
    const d: Record<string, unknown> = {};
    for (const f of flatStepsFields) d[f.key] = f.defaultValue ?? getDefaultForType(f);
    return d;
  })());

  const validator = $derived(deriveValidator(flatStepsFields, { translate: i18n.t }));
  const stepsCount = $derived(steps.length);

  // ─── useStepsForm: form state + step navigation ──────────────────
  const form = useStepsForm({
    get resource() { return resourceName; },
    get action() { return mode; },
    get id() { return id; },
    get defaultValues() { return defaults; },
    get stepsCount() { return stepsCount; },
    redirect: 'list',
    warnWhenUnsavedChanges: true,
    get validate() { return validator; },
  });

  const totalSteps = $derived(steps.length);
  const progressValue = $derived(((form.steps.currentStep + 1) / totalSteps) * 100);
  const isLastStep = $derived(form.steps.currentStep >= totalSteps - 1);

  // Fields for the current step
  const currentFields = $derived(
    steps[form.steps.currentStep]?.fields
      .map(key => resource.fields.find(f => f.key === key))
      .filter((f): f is FieldDefinition => f != null && f.key !== primaryKey) ?? []
  );

  // Validate only fields in the current step
  function validateCurrentStep(): boolean {
    let valid = true;
    form.clearErrors();
    const errors = validator(form.values);
    if (errors) {
      for (const field of currentFields) {
        if (errors[field.key]) {
          form.setFieldError(field.key, errors[field.key]);
          valid = false;
        }
      }
    }
    return valid;
  }

  async function handleSubmit() {
    if (!validateCurrentStep()) return;

    if (!isLastStep) {
      form.steps.nextStep();
      return;
    }

    // Last step — submit the full form
    await form.submit({ redirect: 'list' });
  }
</script>

<div class="svadmin-u-b3542e058833">
  <!-- Step indicators -->
  <div class="svadmin-u-6ed543e2fbbb">
    <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-fc7473ca09eb">
      {#each steps as step, i (i)}
        <Button
          variant="ghost"
          type="button"
          class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-ceb69a6b0e5f svadmin-u-b8f0a08ece1e svadmin-u-660d2effb880 svadmin-u-d5eab218aa34 {i === form.steps.currentStep ? 'svadmin-u-20aaf08a7ed1 svadmin-u-e83a7042bc91' : 'svadmin-u-bfa603190748'}"
          onclick={() => form.steps.gotoStep(i)}
        >
          <span
            class="svadmin-u-60fbb7713999 svadmin-u-d0a52b312f7d svadmin-u-cbbf90f9a828 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-ac204c108886 svadmin-u-359090c2d529 svadmin-u-2689f3958069 svadmin-u-ceb69a6b0e5f"
            class:bg-primary={i <= form.steps.currentStep}
            class:text-primary-foreground={i <= form.steps.currentStep}
            class:bg-muted={i > form.steps.currentStep}
            class:text-muted-foreground={i > form.steps.currentStep}
          >
            {#if i < form.steps.currentStep}
              <Check class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
            {:else}
              {i + 1}
            {/if}
          </span>
          <span class="svadmin-u-99d72c7fc3e2 svadmin-u-ee3c1259a368">{step.title}</span>
        </Button>
        {#if i < steps.length - 1}
          <div class="svadmin-u-36e579c0b41c svadmin-u-9e10c04e17bb svadmin-u-aea6160836e7 svadmin-u-a59afa8d9b9d" class:bg-primary={i < form.steps.currentStep}></div>
        {/if}
      {/each}
    </div>
    <Progress value={progressValue} class="svadmin-u-095acb275581" />
  </div>

  <!-- Step content -->
  <Card.Root>
    <Card.CardHeader>
      <Card.CardTitle>{steps[form.steps.currentStep]?.title ?? ''}</Card.CardTitle>
      <Badge variant="outline" class="svadmin-u-92e7450ad20d">
        {i18n.t('common.step')} {form.steps.currentStep + 1} / {totalSteps}
      </Badge>
    </Card.CardHeader>
    <Card.CardContent>
      {#key form.steps.currentStep}
        <form class="svadmin-u-b43b4c086d9a" onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} in:fly={{ x: 30, duration: 250 }}>
        {#each currentFields as field (field.key)}
          <FieldRenderer
            {field}
            value={form.values[field.key]}
            onchange={(v) => form.setFieldValue(field.key, v)}
          />
          {#if form.errors[field.key]}
            <p class="svadmin-u-811148b13d1e svadmin-u-1d5904e7e755 svadmin-u-b6b02c0ebef6">{form.errors[field.key]}</p>
          {/if}
        {/each}

        <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-173fa8f06789">
          <Button
            type="button"
            variant="outline"
            onclick={() => form.steps.currentStep === 0 ? adminContext.navigate(`/${resourceName}`) : form.steps.prevStep()}
          >
            <ArrowLeft class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" data-icon="inline-start" />
            {form.steps.currentStep === 0 ? i18n.t('common.cancel') : i18n.t('common.back')}
          </Button>

          <Button type="submit" disabled={form.submitting}>
            {#if form.submitting}
              <Loader2 class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-afbdd13a380e" data-icon="inline-start" />
            {:else if isLastStep}
              <Save class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" data-icon="inline-start" />
            {:else}
              <ArrowRight class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" data-icon="inline-start" />
            {/if}
            {isLastStep ? i18n.t('common.save') : i18n.t('common.next')}
          </Button>
        </div>
      </form>
      {/key}
    </Card.CardContent>
  </Card.Root>
</div>
