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
  import { withoutArrayFieldMetadata } from './fields/array-field-metadata.js';

  const i18n = useTranslation();

  interface StepDef {
    title: string;
    fields: string[];
  }

  interface Props {
    resourceName: string;
    id?: string | number | undefined;
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
    // 失败已经显示在当前步骤内，不再额外弹一条相同的 toast。
    errorNotification: false,
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
  const instanceId = $props.id();
  const scope = $derived({
    contract: binding.resource, id, mode, allowed, configurationValid,
    steps: JSON.stringify(steps), provider: adminContext.providers?.[binding.dataProviderName],
    meta: binding.meta, tenant: adminContext.tenantCacheKey?.__svadminTenant,
    auth: adminContext.authProvider, router: adminContext.routerProvider,
    session: captureAuthSession(adminContext.authProvider),
  });
  const rendered = $derived({ scope, step: form.steps.currentStep });
  const authoritativeDraft = $derived({ scope, values: form.values });
  let acceptedDraft = $state.raw<{
    snapshot: typeof authoritativeDraft;
    values: Record<string, unknown>;
  }>();
  // 仅回显本次写入已确认的 UI 身份；新的 Core 快照使缓存立即失效。
  const renderedValues = $derived(acceptedDraft?.snapshot === authoritativeDraft
    ? acceptedDraft.values : authoritativeDraft.values);
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
  function errorId(field: string): string { return `${instanceId}-${resourceName}-step-${field}-error`; }
  const focusableFieldSelector = [
    'input:not([type="hidden"])', 'textarea', 'select', 'button', '[tabindex]',
  ].join(', ');
  function insideDisabledFieldset(candidate: HTMLElement): boolean {
    for (let parent = candidate.parentElement; parent; parent = parent.parentElement) {
      if (!(parent instanceof HTMLFieldSetElement) || !parent.disabled) continue;
      const legend = Array.from(parent.children).find(child => child instanceof HTMLLegendElement);
      if (!legend?.contains(candidate)) return true;
    }
    return false;
  }
  function focusFirstActionableControl(field: HTMLElement): boolean {
    for (const candidate of field.querySelectorAll<HTMLElement>(focusableFieldSelector)) {
      if (candidate.matches(':disabled, [disabled], input[type="hidden"]')) continue;
      if (candidate.closest('[hidden], [inert], [aria-disabled="true"]')) continue;
      if (insideDisabledFieldset(candidate)) continue;
      candidate.focus();
      if (document.activeElement === candidate) return true;
    }
    return false;
  }
  async function focusInvalid(origin: typeof scope) {
    await tick();
    if (!mounted || scope !== origin || !origin.session.isCurrent() || !element?.isConnected) return;
    // 嵌套数组的子字段键不属于当前步骤的顶层错误。
    for (const field of element.querySelectorAll<HTMLElement>(':scope > [data-svadmin-field]')) {
      const key = field.getAttribute('data-svadmin-field-key');
      if (key && form.errors[key] && focusFirstActionableControl(field)) return;
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
      if (!currentRendered(origin)) return;
      const previous = renderedValues;
      form.setFieldValue(key, withoutArrayFieldMetadata(value));
      if (currentRendered(origin)) {
        acceptedDraft = {
          snapshot: authoritativeDraft,
          values: { ...previous, [key]: value },
        };
      }
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

  // 显式 reset 入口：宿主通过 bind:this 调用，恢复 Core 草稿、步骤导航和本实例
  // 提交提示；不触发导航，也不改变未授权状态。
  export function reset(): void {
    if (!allowed) return;
    submitError = null;
    submission = undefined;
    confirmation = undefined;
    form.reset();
  }

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

<div class="space-y-6">
  {#if permission.isLoading || form.loading}
    <Skeleton class="h-10 w-full" />
  {:else if !allowed || !configurationValid || (!form.ready && form.error)}
    <p role="alert">{i18n.t('common.operationFailed')}</p>
    {#if allowed && configurationValid && form.query.isError}
      <Button type="button" variant="outline" onclick={retry}>
        {i18n.t('common.retry')}
      </Button>
    {/if}
  {:else if form.ready}
  <!-- Step indicators -->
  <div class="space-y-3">
    <div class="flex items-center justify-between text-sm">
      {#each steps as step, i (i)}
        <Button
          variant="ghost"
          type="button"
          class="flex items-center gap-2 transition-colors h-auto py-1 px-2 {i === form.steps.currentStep ? 'text-primary font-semibold' : 'text-muted-foreground'}"
          aria-current={i === form.steps.currentStep ? 'step' : undefined}
          disabled={form.submitting || !!submission}
          onclick={changeStep(i)}
        >
          <span
            class="flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors"
            class:bg-primary={i <= form.steps.currentStep}
            class:text-primary-foreground={i <= form.steps.currentStep}
            class:bg-muted={i > form.steps.currentStep}
            class:text-muted-foreground={i > form.steps.currentStep}
          >
            {#if i < form.steps.currentStep}
              <Check class="h-3.5 w-3.5" />
            {:else}
              {i + 1}
            {/if}
          </span>
          <span class="hidden sm:inline">{step.title}</span>
        </Button>
        {#if i < steps.length - 1}
          <div class="flex-1 mx-2 h-px bg-border" class:bg-primary={i < form.steps.currentStep}></div>
        {/if}
      {/each}
    </div>
    <Progress value={progressValue} class="h-1.5" />
  </div>

  <!-- Step content -->
  <Card.Root>
    <Card.CardHeader>
      <Card.CardTitle>{steps[form.steps.currentStep]?.title ?? ''}</Card.CardTitle>
      <Badge variant="outline" class="w-fit">
        {i18n.t('common.step')} {form.steps.currentStep + 1} / {totalSteps}
      </Badge>
    </Card.CardHeader>
    <Card.CardContent>
      {#key rendered}
        <form bind:this={element} class="space-y-5" novalidate onsubmit={submitEvent} in:fly={{ x: 30, duration: 250 }}>
        {#if submitError || form.error}
          <p role="alert">{submitError ?? i18n.t('common.operationFailed')}</p>
        {/if}
        {#each currentFields as field (field.key)}
          <FieldRenderer
            {field}
            value={renderedValues[field.key]}
            onchange={fieldChange(field.key)}
            invalid={!!form.errors[field.key]}
            {...definedOptions({ errorId: form.errors[field.key] ? errorId(field.key) : undefined })}
          />
          {#if form.errors[field.key]}
            <p id={errorId(field.key)} role="alert" aria-live="polite" class="text-destructive text-[0.8125rem] mt-1">{form.errors[field.key]}</p>
          {/if}
        {/each}

        <div class="flex items-center justify-between pt-4">
          <Button
            type="button"
            variant="outline"
            disabled={form.submitting || !!submission}
            onclick={back}
          >
            <ArrowLeft class="h-4 w-4" data-icon="inline-start" />
            {form.steps.currentStep === 0 ? i18n.t('common.cancel') : i18n.t('common.back')}
          </Button>

          <Button type="submit" disabled={form.submitting || !!submission}>
            {#if form.submitting}
              <Loader2 class="h-4 w-4 animate-spin" data-icon="inline-start" />
            {:else if isLastStep}
              <Save class="h-4 w-4" data-icon="inline-start" />
            {:else}
              <ArrowRight class="h-4 w-4" data-icon="inline-start" />
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

<ConfirmDialog open={confirmOpen} message={i18n.t('common.unsavedChanges')}
  onconfirm={confirmLeave} oncancel={cancelLeave} />
