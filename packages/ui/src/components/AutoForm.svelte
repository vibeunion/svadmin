<script lang="ts">
  import { useForm, getResource, deriveValidator, useNavigation } from '@svadmin/core';
  import { slide } from 'svelte/transition';
  import type { FieldDefinition } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';

  import { Button } from './ui/button/index.js';
  import TooltipButton from './TooltipButton.svelte';
  import * as Card from './ui/card/index.js';
  import { Badge } from './ui/badge/index.js';
  import { Save, ArrowLeft, Loader2, AlertCircle } from '@lucide/svelte';
  import FieldRenderer from './FieldRenderer.svelte';
  import * as Alert from './ui/alert/index.js';
  import { Skeleton } from './ui/skeleton/index.js';
  import ConfirmDialog from './ConfirmDialog.svelte';
  import { cn } from '../utils.js';
  import type { Snippet } from 'svelte';

  const i18n = useTranslation();

  interface Props {
    resourceName: string;
    id?: string | number;
    mode?: 'create' | 'edit' | 'clone' | 'show';
    density?: 'compact' | 'comfortable';
    columns?: 1 | 2 | 3 | 4;
    showHeader?: boolean;
    fieldRenderer?: Snippet<[{ field: FieldDefinition; value: unknown; onchange: (v: unknown) => void }]>;
    formActions?: Snippet<[{ isLoading: boolean; onSubmit: () => void }]>;
    headerContent?: Snippet;
    onSuccess?: () => void;
    onNavigationGuardReady?: (guard: (fn: () => void) => void) => void;
  }

  let {
    resourceName,
    id,
    mode = 'create',
    density = 'comfortable',
    columns = 1,
    showHeader = true,
    fieldRenderer,
    formActions,
    headerContent,
    onSuccess,
    onNavigationGuardReady,
  }: Props = $props();
  const navigation = useNavigation();
  const isReadonly = $derived(mode === 'show');
  const isCompact = $derived(density === 'compact');

  // ─── Resource metadata ────────────────────────────────────────────
  const resource = $derived(getResource(resourceName));
  const primaryKey = $derived(resource.primaryKey ?? 'id');

  const formFields = $derived(resource.fields.filter(f => {
    if (f.key === primaryKey) return false;
    if (f.showInForm === false) return false;
    if (mode === 'create' && f.showInCreate === false) return false;
    if (mode === 'edit' && f.showInEdit === false) return false;
    if (mode === 'show' && f.showInShow === false) return false;
    return true;
  }));

  const hasGroups = $derived(formFields.some(f => f.group));
  const groups = $derived((() => {
    if (!hasGroups) return [];
    const order: string[] = [];
    const map = new Map<string, FieldDefinition[]>();
    for (const f of formFields) {
      const g = f.group ?? '';
      if (!map.has(g)) { order.push(g); map.set(g, []); }
      (map.get(g) ?? []).push(f);
    }
    return order.map(g => ({ name: g, fields: map.get(g) ?? [] }));
  })());

  const gridClass = $derived(
    columns === 4
      ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'
      : columns === 3
        ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
        : columns === 2
          ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
          : 'space-y-5'
  );

  function isFullWidthField(field: FieldDefinition): boolean {
    return (
      field.type === 'textarea' ||
      field.type === 'richtext' ||
      field.type === 'json' ||
      field.type === 'array' ||
      field.type === 'images'
    );
  }

  // ─── Default values from field metadata ───────────────────────────
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
    for (const f of formFields) d[f.key] = f.defaultValue ?? getDefaultForType(f);
    return d;
  })());

  const validator = $derived(deriveValidator(formFields, { translate: i18n.t }));

  // ─── useForm: single source of truth for values, errors, tainted ──
  const form = useForm({
    get resource() { return resourceName; },
    get action() { return mode; },
    get id() { return id; },
    get defaultValues() { return defaults; },
    redirect: 'list',
    warnWhenUnsavedChanges: true,
    get validate() { return validator; },
  });

  // ─── Submission error (non-field, e.g. network error) ─────────────
  let submitError = $state<string | null>(null);
  let formElement = $state.raw<HTMLFormElement>();

  function fieldErrorId(fieldKey: string): string {
    return `${resourceName}-${fieldKey}-error`;
  }

  function focusFirstInvalidField(): void {
    const firstInvalid = formElement?.querySelector<HTMLElement>('[aria-invalid="true"]');
    firstInvalid?.focus();
  }

  async function handleSubmit() {
    submitError = null;
    try {
      await form.submit();
      if (Object.keys(form.errors).length > 0) {
        queueMicrotask(focusFirstInvalidField);
        return;
      }
      onSuccess?.();
    } catch (e) {
      submitError = e instanceof Error ? e.message : i18n.t('common.operationFailed');
    }
  }

  const pageTitle = $derived(
    mode === 'create'
      ? `${i18n.t('common.create')}${resource.label}`
      : mode === 'show'
      ? `${i18n.t('common.detail')}${resource.label}`
      : `${i18n.t('common.edit')}${resource.label}`
  );

  // ─── Unsaved changes guard ────────────────────────────────────────
  let confirmOpen = $state(false);
  let pendingNavigation: (() => void) | null = null;

  function guardNavigate(fn: () => void) {
    if (form.isTainted()) {
      pendingNavigation = fn;
      confirmOpen = true;
    } else {
      fn();
    }
  }

  $effect(() => {
    onNavigationGuardReady?.(guardNavigate);
  });

  function confirmNavigate() {
    confirmOpen = false;
    pendingNavigation?.();
    pendingNavigation = null;
  }

  function cancelNavigate() {
    confirmOpen = false;
    pendingNavigation = null;
  }
</script>

<div class={isCompact ? 'space-y-4' : 'space-y-6'}>
  {#if showHeader}
    <div class="flex items-center gap-4">
      <TooltipButton
        tooltip={i18n.t('common.back')}
        onclick={() => guardNavigate(() => navigation.list(resourceName))}
      >
        <ArrowLeft class="h-5 w-5" />
      </TooltipButton>
      <h1 class="text-xl font-semibold text-foreground">{pageTitle}</h1>
      {#if headerContent}
        {@render headerContent()}
      {/if}
      {#if form.isTainted()}
        <Badge variant="outline" class="border-warning/30 bg-warning/10 text-warning-foreground">{i18n.t('common.unsaved')}</Badge>
      {/if}
    </div>
  {/if}

  {#if form.loading}
    <div class="max-w-4xl space-y-6">
      <div class="rounded-lg shadow-sm ring-1 ring-border/10 p-6 space-y-5">
        {#each Array(4) as _, _i (_i)}
          <div class="space-y-2">
            <Skeleton class="h-4 w-24" />
            <Skeleton class="h-10 w-full" />
          </div>
        {/each}
      </div>
    </div>
  {:else}
    <form bind:this={formElement} onsubmit={(e: Event) => { e.preventDefault(); handleSubmit(); }} class="max-w-4xl space-y-6" novalidate>
      {#if submitError}
        <div transition:slide={{ duration: 300, axis: 'y' }} class="svadmin-shake">
          <Alert.Root variant="destructive">
            <AlertCircle class="h-4 w-4" />
            <Alert.Description>{submitError}</Alert.Description>
          </Alert.Root>
        </div>
      {/if}

      {#if hasGroups}
        {#each groups as group, _i (_i)}
          <Card.Root class="border-border/40 shadow-sm">
            {#if group.name}
              <Card.Header class={isCompact ? 'px-4 py-3' : ''}>
                <Card.Title class="text-lg">{group.name}</Card.Title>
              </Card.Header>
            {/if}
            <Card.Content class={isCompact ? 'px-4 pb-4 pt-0' : 'px-4 sm:px-6 pb-4 sm:pb-6 pt-0'}>
              <div class={gridClass}>
                {#each group.fields as field (field.key)}
                  <div class={cn(columns > 1 && isFullWidthField(field) && 'col-span-full', !!form.errors[field.key] && 'border-destructive')}>
                    {#if fieldRenderer}
                      {@render fieldRenderer({ field, value: form.values[field.key], onchange: (val: unknown) => form.setFieldValue(field.key, val) })}
                    {:else}
                      <FieldRenderer
                        {field}
                        value={form.values[field.key]}
                        onchange={(val: unknown) => form.setFieldValue(field.key, val)}
                        {density}
                        invalid={!!form.errors[field.key]}
                        errorId={form.errors[field.key] ? fieldErrorId(field.key) : undefined}
                        disabled={isReadonly}
                      />
                    {/if}
                    {#if form.errors[field.key]}
                      <p id={fieldErrorId(field.key)} class="text-destructive text-[0.8125rem] mt-1" role="alert" aria-live="polite">{form.errors[field.key]}</p>
                    {/if}
                  </div>
                {/each}
              </div>
            </Card.Content>
          </Card.Root>
        {/each}
      {:else}
        <Card.Root class="border-border/40 shadow-sm">
          <Card.Content class={isCompact ? 'p-4' : 'px-4 pt-5 pb-4 sm:px-6 sm:pt-6 sm:pb-6'}>
              <div class={gridClass} data-svadmin-form-grid data-columns={columns} data-density={density}>
              {#each formFields as field (field.key)}
                <div class={cn(columns > 1 && isFullWidthField(field) && 'col-span-full', !!form.errors[field.key] && 'border-destructive')}>
                  {#if fieldRenderer}
                    {@render fieldRenderer({ field, value: form.values[field.key], onchange: (val: unknown) => form.setFieldValue(field.key, val) })}
                  {:else}
                  <FieldRenderer
                    {field}
                    value={form.values[field.key]}
                    onchange={(val: unknown) => form.setFieldValue(field.key, val)}
                    {density}
                    invalid={!!form.errors[field.key]}
                      errorId={form.errors[field.key] ? fieldErrorId(field.key) : undefined}
                      disabled={isReadonly}
                    />
                  {/if}
                  {#if form.errors[field.key]}
                    <p id={fieldErrorId(field.key)} class="text-destructive text-[0.8125rem] mt-1" role="alert" aria-live="polite">{form.errors[field.key]}</p>
                  {/if}
                </div>
              {/each}
            </div>
          </Card.Content>
        </Card.Root>
      {/if}

      <div class="flex items-center gap-3">
        {#if formActions}
          {@render formActions({ isLoading: form.submitting, onSubmit: handleSubmit })}
        {:else if !isReadonly}
          <Button type="submit" size={isCompact ? 'sm' : 'default'} disabled={form.submitting}>
            {#if form.submitting}
              <Loader2 class="h-4 w-4 animate-spin" data-icon="inline-start" />
            {:else}
              <Save class="h-4 w-4" data-icon="inline-start" />
            {/if}
            {i18n.t('common.save')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size={isCompact ? 'sm' : 'default'}
            onclick={() => guardNavigate(() => navigation.list(resourceName))}
          >
            {i18n.t('common.cancel')}
          </Button>
        {/if}
      </div>
    </form>
  {/if}
</div>

<ConfirmDialog
  open={confirmOpen}
  message={i18n.t('common.unsavedChanges')}
  confirmText={i18n.t('common.confirm')}
  onconfirm={confirmNavigate}
  oncancel={cancelNavigate}
/>
