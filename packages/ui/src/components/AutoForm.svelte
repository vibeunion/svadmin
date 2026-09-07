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
      ? 'svadmin-u-f3c543ad5fe9 svadmin-u-d7c8339810d3 svadmin-u-e4d6f343b9ff svadmin-u-4558bce6d8c0 svadmin-u-0c3bc98565dd'
      : columns === 3
        ? 'svadmin-u-f3c543ad5fe9 svadmin-u-d7c8339810d3 svadmin-u-e4d6f343b9ff svadmin-u-19d9b25e8fae svadmin-u-0c3bc98565dd'
        : columns === 2
          ? 'svadmin-u-f3c543ad5fe9 svadmin-u-d7c8339810d3 svadmin-u-e4d6f343b9ff svadmin-u-0c3bc98565dd'
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

<div class={isCompact ? 'svadmin-u-3e7ce58d64fa' : 'svadmin-u-b3542e058833'}>
  {#if showHeader}
    <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-0c3bc98565dd">
      <TooltipButton
        tooltip={i18n.t('common.back')}
        onclick={() => guardNavigate(() => navigation.list(resourceName))}
      >
        <ArrowLeft class="svadmin-u-cd0d9c512cdc svadmin-u-72470489ff4e" aria-hidden="true" />
      </TooltipButton>
      <h1 class="svadmin-u-d5c9b0001e7e svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{pageTitle}</h1>
      {#if headerContent}
        {@render headerContent()}
      {/if}
      {#if form.isTainted()}
        <Badge variant="outline" role="status" aria-live="polite" class="svadmin-u-2f960aa0c478 svadmin-u-283481e780bb svadmin-u-3a4ff758c2ab">{i18n.t('common.unsaved')}</Badge>
      {/if}
    </div>
  {/if}

  {#if form.loading}
    <div class="svadmin-u-cf3893e36c22 svadmin-u-b3542e058833">
      <div class="svadmin-u-5f22e64f2282 svadmin-u-438b2237b8d6 svadmin-u-3daca9af0861 svadmin-u-a10fdd7667ee svadmin-u-0478c89a150f svadmin-u-b43b4c086d9a">
        {#each Array(4) as _, _i (_i)}
          <div class="svadmin-u-6f7e013d6499">
            <Skeleton class="svadmin-u-11e59c6d5f6b svadmin-u-69da7e4ff95d" />
            <Skeleton class="svadmin-u-426b8b75185b svadmin-u-6da6a3c3f741" />
          </div>
        {/each}
      </div>
    </div>
  {:else}
    <form bind:this={formElement} onsubmit={(e: Event) => { e.preventDefault(); handleSubmit(); }} class="svadmin-u-cf3893e36c22 svadmin-u-b3542e058833" novalidate>
      {#if submitError}
        <div transition:slide={{ duration: 300, axis: 'y' }} class="svadmin-shake">
          <Alert.Root variant="destructive">
            <AlertCircle class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" aria-hidden="true" />
            <Alert.Description>{submitError}</Alert.Description>
          </Alert.Root>
        </div>
      {/if}

      {#if hasGroups}
        {#each groups as group, _i (_i)}
          <Card.Root class="svadmin-u-6ee2d41e2d2d svadmin-u-438b2237b8d6">
            {#if group.name}
              <Card.Header class={isCompact ? 'svadmin-u-f0faeb26d656 svadmin-u-1b2d54a3fd12' : ''}>
                <Card.Title class="svadmin-u-42536e69e639">{group.name}</Card.Title>
              </Card.Header>
            {/if}
            <Card.Content class={isCompact ? 'svadmin-u-f0faeb26d656 svadmin-u-9fcd8a13827e svadmin-u-9335c39f6eff' : 'svadmin-u-f0faeb26d656 svadmin-u-7a9aabfcd059 svadmin-u-9fcd8a13827e svadmin-u-050494726fba svadmin-u-9335c39f6eff'}>
              <div class={gridClass}>
                {#each group.fields as field (field.key)}
                  <div class={cn(columns > 1 && isFullWidthField(field) && 'svadmin-u-2c955d1b45df', !!form.errors[field.key] && 'svadmin-u-ee1a5af3aa10')}>
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
                      <p id={fieldErrorId(field.key)} class="svadmin-u-811148b13d1e svadmin-u-1d5904e7e755 svadmin-u-b6b02c0ebef6" role="alert" aria-live="polite">{form.errors[field.key]}</p>
                    {/if}
                  </div>
                {/each}
              </div>
            </Card.Content>
          </Card.Root>
        {/each}
      {:else}
        <Card.Root class="svadmin-u-6ee2d41e2d2d svadmin-u-438b2237b8d6">
          <Card.Content class={isCompact ? 'svadmin-u-8e63407b5ceb' : 'svadmin-u-f0faeb26d656 svadmin-u-52be28846b5f svadmin-u-9fcd8a13827e svadmin-u-7a9aabfcd059 svadmin-u-0a58453f3755 svadmin-u-050494726fba'}>
              <div class={gridClass} data-svadmin-form-grid data-columns={columns} data-density={density}>
              {#each formFields as field (field.key)}
                <div class={cn(columns > 1 && isFullWidthField(field) && 'svadmin-u-2c955d1b45df', !!form.errors[field.key] && 'svadmin-u-ee1a5af3aa10')}>
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
                    <p id={fieldErrorId(field.key)} class="svadmin-u-811148b13d1e svadmin-u-1d5904e7e755 svadmin-u-b6b02c0ebef6" role="alert" aria-live="polite">{form.errors[field.key]}</p>
                  {/if}
                </div>
              {/each}
            </div>
          </Card.Content>
        </Card.Root>
      {/if}

      <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-1004c0c3954c">
        {#if formActions}
          {@render formActions({ isLoading: form.submitting, onSubmit: handleSubmit })}
        {:else if !isReadonly}
          <Button type="submit" size={isCompact ? 'sm' : 'default'} disabled={form.submitting}>
            {#if form.submitting}
              <Loader2 class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-afbdd13a380e" data-icon="inline-start" aria-hidden="true" />
            {:else}
              <Save class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" data-icon="inline-start" aria-hidden="true" />
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
