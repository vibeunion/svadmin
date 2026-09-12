<script lang="ts">
  import { definedOptions, definedReactiveOptions } from '@svadmin/core/options';

  import { fly } from 'svelte/transition';
  import { tick } from 'svelte';
  import { captureAdminContext, captureAuthSession, deriveValidator, useStepsForm, useResourceContract, getContractFormFields, useCan } from '@svadmin/core';
  import type { FieldDefinition } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';

  import { Button } from './ui/button/index.js';
  import * as Card from './ui/card/index.js';
  import { Badge } from './ui/badge/index.js';
  import { Progress } from './ui/progress/index.js';
  import { Save, ArrowLeft, ArrowRight, Check, Loader2 } from '@lucide/svelte';
  import FieldRenderer from './FieldRenderer.svelte';
  import ConfirmDialog from './ConfirmDialog.svelte';
  import { Skeleton } from './ui/skeleton/index.js';

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
    onSuccess?: () => void;
  }

  let { resourceName, id, mode = 'create', steps, onSuccess }: Props = $props();
  const adminContext = captureAdminContext();
  const binding = useResourceContract(() => resourceName);

  const resource = $derived(adminContext.getResource(resourceName));
  const primaryKey = $derived(resource.primaryKey ?? 'id');
  const writableFields = $derived(getContractFormFields(binding.resource, mode));
  const permission = useCan(() => definedOptions({ resource: resourceName, action: mode, id }));
  const allowed = $derived(permission.allowed && (mode === 'create' ? resource.canCreate !== false : resource.canEdit !== false));

  // All fields used across all steps
  const flatStepsFields = $derived(steps.flatMap(s => s.fields)
    .map(key => resource.fields.find(f => f.key === key))
    .filter((f): f is FieldDefinition => f != null && writableFields.includes(f.key)));
  const configurationValid = $derived(steps.every(step => step.fields.every(key =>
    flatStepsFields.some(field => field.key === key && key !== primaryKey && field.showInForm !== false &&
      (mode === 'create' ? field.showInCreate !== false : field.showInEdit !== false)))));

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

  // ─── useStepsForm: form state + step navigation ──────────────────
  const form = useStepsForm(definedReactiveOptions({
    get resource() { return binding.resource; },
    get action() { return mode; },
    get id() { return id; },
    get defaultValues() { return defaults; },
    get steps() { return steps.map(step => ({ fields: step.fields })); },
    get enabled() { return allowed && configurationValid; },
    get dataProviderName() { return binding.dataProviderName; },
    redirect: 'list',
    warnWhenUnsavedChanges: true,
    get validate() { return validator; },
    get onMutationSuccess() {
      const callback = onSuccess;
      return callback ? () => callback() : undefined;
    },
  }));

  const totalSteps = $derived(form.steps.totalSteps);
  const progressValue = $derived(totalSteps > 0 ? ((form.steps.currentStep + 1) / totalSteps) * 100 : 0);
  const isLastStep = $derived(form.steps.currentStep >= totalSteps - 1);

  // Fields for the current step
  const currentFields = $derived(
    steps[form.steps.currentStep]?.fields
      .map(key => resource.fields.find(f => f.key === key))
      .filter((f): f is FieldDefinition => f != null && f.key !== primaryKey && writableFields.includes(f.key)) ?? []
  );

  let element = $state.raw<HTMLFormElement>();
  let submitError = $state<string | null>(null);
  let submission = $state.raw<object>();
  const scope = $derived({
    contract: binding.resource, id, mode, allowed, configurationValid,
    steps: JSON.stringify(steps), provider: adminContext.providers?.[binding.dataProviderName],
    meta: binding.meta, tenant: adminContext.tenantCacheKey?.__svadminTenant,
    auth: adminContext.authProvider, router: adminContext.routerProvider,
    session: captureAuthSession(adminContext.authProvider),
  });
  const rendered = $derived({ scope, step: form.steps.currentStep });
  let mounted = true;
  let confirmation = $state.raw<typeof rendered>();
  const currentRendered = (origin: typeof rendered) => mounted && origin === rendered &&
    origin.scope.session.isCurrent() && form.ready;
  const confirmOpen = $derived(confirmation !== undefined && currentRendered(confirmation));
  $effect(() => {
    void scope;
    submitError = null;
    submission = undefined;
    confirmation = undefined;
  });
  $effect(() => () => { mounted = false; submission = undefined; confirmation = undefined; });
  function errorId(field: string): string { return `${resourceName}-step-${field}-error`; }
  async function focusInvalid(origin: typeof scope) {
    await tick();
    if (mounted && scope === origin && origin.session.isCurrent() && element?.isConnected) {
      element.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    }
  }
  const changeStep = $derived.by(() => {
    const origin = rendered;
    return (step: number) => () => {
      if (!currentRendered(origin) || !allowed || form.submitting) return;
      submitError = null;
      if (!form.steps.gotoStep(step)) void focusInvalid(origin.scope);
    };
  });
  const fieldChange = $derived.by(() => {
    const origin = rendered;
    return (key: string) => (value: unknown) => {
      if (currentRendered(origin)) form.setFieldValue(key, value);
    };
  });
  function leave(origin: typeof rendered) {
    if (!currentRendered(origin)) return;
    confirmation = undefined;
    void adminContext.navigate(`/${encodeURIComponent(resourceName)}`).catch(() => {
      if (currentRendered(origin) && element?.isConnected) submitError = i18n.t('common.operationFailed');
    });
  }
  const back = $derived.by(() => {
    const origin = rendered;
    const previous = changeStep(origin.step - 1);
    return () => {
      if (!currentRendered(origin) || form.submitting) return;
      if (origin.step > 0) previous();
      else if (form.isDirty) confirmation = origin;
      else leave(origin);
    };
  });
  const confirmLeave = $derived.by(() => {
    const origin = confirmation;
    return () => { if (origin && confirmation === origin) leave(origin); };
  });
  const cancelLeave = $derived.by(() => {
    const origin = confirmation;
    return () => { if (origin && confirmation === origin) confirmation = undefined; };
  });
  const retry = $derived.by(() => {
    const origin = scope;
    const refetch = form.query.refetch;
    return () => {
      if (mounted && scope === origin && origin.session.isCurrent()) void refetch().catch(() => {});
    };
  });

  const handleSubmit = $derived.by(() => {
    const origin = rendered;
    return async () => {
      if (!currentRendered(origin) || !allowed || form.submitting || submission) return;
      submitError = null;
      if (!isLastStep) {
        if (!form.steps.nextStep()) void focusInvalid(origin.scope);
        return;
      }
      const token = {};
      submission = token;
      try { await form.submit(); }
      catch {
        if (submission === token && mounted && scope === origin.scope && origin.scope.session.isCurrent()) {
          submitError = i18n.t('common.operationFailed');
          void focusInvalid(origin.scope);
        }
      } finally {
        if (submission === token) submission = undefined;
      }
    };
  });
  const submitEvent = $derived.by(() => {
    const submit = handleSubmit;
    return (event: Event) => { event.preventDefault(); void submit(); };
  });
</script>

<div class="svadmin-u-b3542e058833">
  {#if permission.isLoading || form.loading}
    <Skeleton class="svadmin-u-426b8b75185b svadmin-u-6da6a3c3f741" />
  {:else if !allowed || !configurationValid || (!form.ready && form.error)}
    <p role="alert">{i18n.t('common.operationFailed')}</p>
    {#if allowed && configurationValid && form.query.isError}
      <Button type="button" variant="outline" onclick={retry}>
        {i18n.t('common.retry')}
      </Button>
    {/if}
  {:else if form.ready}  <!-- Step indicators -->
  <div class="svadmin-u-6ed543e2fbbb">
    <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-fc7473ca09eb">
      {#each steps as step, i (i)}
        <Button
          variant="ghost"
          type="button"
          class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-ceb69a6b0e5f svadmin-u-b8f0a08ece1e svadmin-u-660d2effb880 svadmin-u-d5eab218aa34 {i === form.steps.currentStep ? 'svadmin-u-20aaf08a7ed1 svadmin-u-e83a7042bc91' : 'svadmin-u-bfa603190748'}"
          aria-current={i === form.steps.currentStep ? 'step' : undefined}
          disabled={form.submitting || !!submission}
          onclick={changeStep(i)}        >
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
      {#key rendered}
        <form bind:this={element} class="svadmin-u-b43b4c086d9a" novalidate onsubmit={submitEvent} in:fly={{ x: 30, duration: 250 }}>
        {#if submitError || form.error}
          <p role="alert">{submitError ?? i18n.t('common.operationFailed')}</p>
        {/if}        {#each currentFields as field (field.key)}
          <FieldRenderer
            {field}
            value={form.values[field.key]}
            onchange={fieldChange(field.key)}
            invalid={!!form.errors[field.key]}
            {...definedOptions({ errorId: form.errors[field.key] ? errorId(field.key) : undefined })}
          />
          {#if form.errors[field.key]}
            <p id={errorId(field.key)} role="alert" aria-live="polite" class="svadmin-u-811148b13d1e svadmin-u-1d5904e7e755 svadmin-u-b6b02c0ebef6">{form.errors[field.key]}</p>          {/if}
        {/each}

        <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-173fa8f06789">
          <Button
            type="button"
            variant="outline"
            disabled={form.submitting || !!submission}
            onclick={back}
          >
            <ArrowLeft class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" data-icon="inline-start" />
            {form.steps.currentStep === 0 ? i18n.t('common.cancel') : i18n.t('common.back')}
          </Button>

          <Button type="submit" disabled={form.submitting || !!submission}>
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
  {/if}
</div>

{#key confirmation}
  <ConfirmDialog open={confirmOpen} message={i18n.t('common.unsavedChanges')}
    onconfirm={confirmLeave} oncancel={cancelLeave} />
{/key}
