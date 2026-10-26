<script lang="ts">
  import { bindResourceRendering, type ResourceRendering } from '../rendering/index.js';
  import { definedReactiveOptions } from '@svadmin/core/options';

  import { definedOptions } from '@svadmin/core/options';

  import { captureAdminContext, captureAuthSession, useResourceContract, getContractFormFields, deriveValidator, useNavigation, useCan, useForm, parseQueryKey } from '@svadmin/core';
  import { useQueryClient } from '@tanstack/svelte-query';
  import { slide } from 'svelte/transition';
  import { untrack } from 'svelte';
  import type { FieldDefinition } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';

  import { Button } from './ui/button/index.js';
  import TooltipButton from './TooltipButton.svelte';
  import * as Card from './ui/card/index.js';
  import { Badge } from './ui/badge/index.js';
  import { Save, ArrowLeft, Loader2, AlertCircle } from '@lucide/svelte';
  import FieldRenderer from './FieldRenderer.svelte';
  import type { UploadCancelHandler, UploadHandler } from './file-upload-types.js';
  import * as Alert from './ui/alert/index.js';
  import { Skeleton } from './ui/skeleton/index.js';
  import ConfirmDialog from './ConfirmDialog.svelte';
  import ErrorSummary from './ErrorSummary.svelte';
  import { withoutArrayFieldMetadata } from './fields/array-field-metadata.js';
  import { schemaFormSnapshot } from './json-schema-form-state.js';
  import { cn } from '../utils.js';
  import type { Snippet } from 'svelte';

  const i18n = useTranslation();

  interface Props {
    resourceName: string;
    rendering?: ResourceRendering | undefined;
    id?: string | number;
    mode?: 'create' | 'edit' | 'clone' | 'show';
    columns?: 1 | 2 | 3 | 4;
    showHeader?: boolean;
    fieldRenderer?: Snippet<[{ field: FieldDefinition; value: unknown; onchange: (v: unknown) => void }]>;
    formActions?: Snippet<[{ isLoading: boolean; isDisabled: boolean; onSubmit: () => void }]>;
    headerContent?: Snippet;
    onSuccess?: () => void;
    redirect?: 'list' | false;
    onCancel?: () => void;
    onNavigationGuardReady?: (guard: (fn: () => void) => void) => void;
    /**
     * 可选：当当前表单作用域的真实未保存状态变化时通知宿主。
     * 状态只由 `form.isTainted()` 与上传阻塞派生，不根据 DOM 事件或值比较猜测。
     */
    onDirtyChange?: (dirty: boolean) => void;
    showErrorSummary?: boolean;
    /** 透传给 file 字段的异步上传；成功后字段值只保存 url/uploadId 引用。 */
    upload?: UploadHandler;
    cancelUpload?: UploadCancelHandler;
    /** 宿主显式选择的草稿字段白名单；只包含当前可编辑表单内的字段。 */
    draftFields?: readonly string[];
    /** 仅在宿主显式订阅时输出可分离的字段草稿；不可恢复状态下输出 undefined。 */
    onDraftChange?: (draft: Record<string, unknown> | undefined) => void;
  }

  let {
    resourceName,
    rendering,
    id,
    mode = 'create',
    columns = 1,
    showHeader = true,
    fieldRenderer,
    formActions,
    headerContent,
    onSuccess,
    redirect = 'list',
    onCancel,
    onNavigationGuardReady,
    onDirtyChange,
    showErrorSummary = true,
    upload,
    cancelUpload,
    draftFields,
    onDraftChange,
  }: Props = $props();
  const navigation = useNavigation();
  const context = captureAdminContext();
  const binding = useResourceContract(() => resourceName);
  const activeRendering = $derived(bindResourceRendering(rendering, binding.resource));
  const isReadonly = $derived(mode === 'show');
  const instanceId = $props.id();

  // ─── Resource metadata ────────────────────────────────────────────
  const resource = $derived(context.getResource(resourceName));
  const primaryKey = $derived(resource.primaryKey ?? 'id');
  const contractFields = $derived(getContractFormFields(binding.resource, mode));
  const readPermission = useCan(() => definedOptions({
    resource: resourceName, action: mode === 'edit' ? 'edit' : 'show', id,
    queryOptions: { enabled: mode !== 'create' },
  }));
  const createPermission = useCan(() => ({
    resource: resourceName, action: 'create', queryOptions: { enabled: mode === 'create' || mode === 'clone' },
  }));
  const permissionPending = $derived(mode === 'create' ? createPermission.isLoading
    : readPermission.isLoading || (mode === 'clone' && createPermission.isLoading));
  const permissionError = $derived(mode === 'create' ? createPermission.isError
    : readPermission.isError || (mode === 'clone' && createPermission.isError));
  const allowed = $derived(mode === 'create' ? resource.canCreate !== false && createPermission.allowed
    : mode === 'edit' ? resource.canEdit !== false && readPermission.allowed
    : mode === 'show' ? resource.canShow !== false && readPermission.allowed
    : resource.canCreate !== false && resource.canShow !== false && readPermission.allowed && createPermission.allowed);

  const formFields = $derived(resource.fields.filter(f => {
    if (f.key === primaryKey) return false;
    if (!contractFields.includes(f.key)) return false;
    if (f.showInForm === false) return false;
    if ((mode === 'create' || mode === 'clone') && f.showInCreate === false) return false;
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
      case 'relation': return field.multiple ? [] : null;
      case 'json': return {};
      // 文件/引用的空值不是字符串；未上传时保持 undefined 不进入合同快照。
      case 'file': return undefined;
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
  const form = useForm(definedReactiveOptions({
    get resource() { void activeRendering; return binding.resource; },
    get action() { return mode; },
    get id() { return id; },
    get defaultValues() { return defaults; },
    get enabled() { return allowed; },
    get dataProviderName() { return binding.dataProviderName; },
    get redirect() { return redirect; },
    warnWhenUnsavedChanges: true,
    get validate() { return validator; },
    get onMutationSuccess() {
      const callback = onSuccess;
      return callback ? () => callback() : undefined;
    },
  }));
  const errorEntries = $derived(formFields.flatMap(field => {
    const message = form.errors[field.key];
    return typeof message === 'string' && message.length > 0
      ? [{ fieldKey: field.key, label: field.label || field.key, message }] : [];
  }));

  const authoritativeDraft = $derived.by(() => {
    try {
      return { ok: true, values: form.ready && activeRendering ? activeRendering.draft(mode, form.values) : form.values };
    } catch {
      return { ok: false, values: {} };
    }
  });
  let acceptedDraft = $state.raw<{
    snapshot: typeof authoritativeDraft;
    values: Record<string, unknown>;
  }>();
  // 仅回显本次写入已确认的 UI 身份；新的 Core 快照使缓存立即失效。
  const renderedDraft = $derived(acceptedDraft?.snapshot === authoritativeDraft
    ? { ok: authoritativeDraft.ok, values: acceptedDraft.values }
    : authoritativeDraft);

  // ─── Submission error (non-field, e.g. network error) ─────────────
  let submitError = $state<string | null>(null);
  let formElement = $state.raw<HTMLFormElement>();
  const scope = $derived({
    contract: binding.resource, id, mode, allowed,
    provider: context.providers?.[binding.dataProviderName], meta: binding.meta,
    tenant: context.tenantCacheKey?.__svadminTenant, auth: context.authProvider,
    session: captureAuthSession(context.authProvider),
  });
  let mounted = true;
  const currentScope = (origin: typeof scope) => mounted && scope === origin && origin.session.isCurrent();

  // ─── Host-owned draft contract ────────────────────────────────────
  // 只复制纯 JSON 值；调用方永远拿不到 form.values 的内部引用。
  // 复用既有有界纯 JSON 快照：不读 getter、不执行序列化钩子，并受深度/节点预算保护。
  function collectDraftOutput(): Record<string, unknown> | undefined {
    const fields = draftFields;
    if (!fields || fields.length === 0) return undefined;
    const allowlist = new Set(fields);
    const draft: Record<string, unknown> = {};
    for (const field of formFields) {
      if (!allowlist.has(field.key)) continue;
      if (!Object.prototype.hasOwnProperty.call(form.values, field.key)) continue;
      const value = form.values[field.key];
      if (value === undefined) continue;
      try {
        draft[field.key] = schemaFormSnapshot({ field: value })['field'];
      } catch {
        continue;
      }
    }
    return draft;
  }
  function draftSignature(draft: Record<string, unknown> | undefined): string {
    return draft === undefined ? 'undefined' : JSON.stringify(draft);
  }

  /**
   * 宿主显式恢复入口。候选先整体做纯 JSON 快照，再检查白名单与真实可编辑字段；
   * 全部通过后只调用一次 `form.setValues` 原子写入。业务必填/格式校验留到提交；
   * 提交中、上传阻塞、只读、未授权、换作用域或已卸载时返回 false，异常不外抛。
   */
  export function restoreDraft(candidate: Record<string, unknown>): boolean {
    try {
      if (!mounted || !currentScope(scope) || !form.ready || !allowed || isReadonly
        || form.submitting || uploadBlocked) return false;
      const fields = draftFields;
      if (!fields || fields.length === 0) return false;
      let snapshot: Record<string, unknown>;
      try {
        snapshot = schemaFormSnapshot(candidate);
      } catch {
        return false;
      }
      const allowlist = new Set(fields);
      const editable = new Set(formFields.map(field => field.key));
      const values: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(snapshot)) {
        if (!allowlist.has(key) || !editable.has(key)) return false;
        values[key] = value;
      }
      if (Object.keys(values).length === 0) return false;
      form.setValues(values, { taint: true });
      return true;
    } catch {
      return false;
    }
  }

  let lastDraftScope: typeof scope | undefined;
  let lastDraftCallback: Props['onDraftChange'];
  let lastDraftSignature: string | undefined;
  $effect(() => {
    const origin = scope;
    const fields = draftFields;
    const callback = onDraftChange;
    const ready = form.ready;
    const permitted = allowed;
    const readonly = isReadonly;
    const submitting = form.submitting;
    const renderingOk = renderedDraft.ok;
    if (!fields || fields.length === 0 || !callback) return;
    if (!currentScope(origin)) return;
    const usable = ready && permitted && !readonly && !submitting && renderingOk;
    const output = usable ? collectDraftOutput() : undefined;
    const signature = draftSignature(output);
    if (lastDraftScope !== origin || lastDraftCallback !== callback) {
      lastDraftScope = origin;
      lastDraftCallback = callback;
      lastDraftSignature = undefined;
    }
    if (lastDraftSignature === signature) return;
    lastDraftSignature = signature;
    untrack(() => callback(output));
  });

  let submission: object | undefined;
  interface UploadState { busy: boolean; unresolved: boolean }
  // 按字段记录上传队列：busy 阻止提交并驱动 loading，unresolved 阻止提交。
  let uploadStates = $state<Record<string, UploadState>>({});
  const uploadPending = $derived(Object.values(uploadStates).some(state => state.busy));
  const uploadBlocked = $derived(Object.values(uploadStates).some(state => state.busy || state.unresolved));
  let lastDirty: boolean | undefined;
  let lastDirtyScope: typeof scope | undefined;
  $effect(() => {
    const origin = scope;
    const dirty = form.isTainted() || uploadBlocked;
    if (!currentScope(origin)) return;
    if (lastDirtyScope !== origin) {
      lastDirtyScope = origin;
      lastDirty = undefined;
    }
    if (lastDirty === dirty) return;
    lastDirty = dirty;
    untrack(() => onDirtyChange?.(dirty));
  });
  // 记录/provider/auth 作用域变化时，只重挂载文件字段并丢弃旧回执。
  let resetEpoch = $state(0);
  const fileScopeKey = $derived({ scope, resetEpoch, upload, cancelUpload });
  $effect(() => {
    void fileScopeKey;
    uploadStates = {};
  });
  $effect(() => {
    void scope;
    submission = undefined;
    submitError = null;
    confirmOpen = false;
    pendingNavigation = null;
    uploadStates = {};
  });
  const setUploadState = $derived.by(() => {
    const origin = scope;
    const originFileScope = fileScopeKey;
    return (fieldKey: string, state: UploadState) => {
      if (!currentScope(origin) || fileScopeKey !== originFileScope) return;
      const previous = uploadStates[fieldKey];
      if (previous?.busy === state.busy && previous?.unresolved === state.unresolved) return;
      uploadStates = { ...uploadStates, [fieldKey]: state };
    };
  });
  $effect(() => () => { mounted = false; submission = undefined; });

  function fieldErrorId(fieldKey: string): string {
    return `${instanceId}-${resourceName}-${fieldKey}-error`;
  }

  const focusableFieldSelector = [
    'input:not([type="hidden"])', 'textarea', 'select', 'button', '[tabindex]',
  ].join(', ');
  const richTextFieldSelector = '[contenteditable="true"][role="textbox"]';

  function isActionableControl(element: HTMLElement): boolean {
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      if (!(parent instanceof HTMLFieldSetElement) || !parent.disabled) continue;
      const legend = Array.from(parent.children).find(child => child instanceof HTMLLegendElement);
      if (!legend?.contains(element)) return false;
    }
    return !element.hasAttribute('disabled')
      && !element.matches('input[type="hidden"]')
      && !element.matches(':disabled')
      && !element.closest('[hidden], [inert], [aria-disabled="true"]');
  }

  function focusFirstActionableControl(field: Element, definition?: FieldDefinition): boolean {
    // 仅默认渲染的顶层 richtext 字段优先正文；数组等容器仍按 DOM 顺序，
    // 自定义 fieldRenderer 也不替宿主猜测正文入口。
    if (!fieldRenderer && definition?.type === 'richtext') {
      const richText = field.querySelector<HTMLElement>(richTextFieldSelector);
      if (richText && isActionableControl(richText)) {
        richText.focus();
        if (document.activeElement === richText) return true;
      }
    }
    const candidates = field.querySelectorAll<HTMLElement>(focusableFieldSelector);
    for (const candidate of candidates) {
      if (!isActionableControl(candidate)) continue;
      candidate.focus();
      if (document.activeElement === candidate) return true;
    }
    return false;
  }

  function focusFirstInvalidField(): void {
    if (!formElement) return;
    for (const field of formElement.querySelectorAll<HTMLElement>('[data-svadmin-form-field]')) {
      const key = field.getAttribute('data-svadmin-field-key');
      const error = key ? form.errors[key] : undefined;
      const definition = key ? formFields.find(fieldDefinition => fieldDefinition.key === key) : undefined;
      if (typeof error === 'string' && error.length > 0 && focusFirstActionableControl(field, definition)) return;
    }
  }

  function focusField(fieldKey: string): void {
    const field = formElement?.querySelector<HTMLElement>(
      `[data-svadmin-form-field][data-svadmin-field-key="${CSS.escape(fieldKey)}"]`,
    );
    if (field) focusFirstActionableControl(field, formFields.find(definition => definition.key === fieldKey));
  }

  const handleSubmit = $derived.by(() => {
    const current = scope;
    return async () => {
      if (!currentScope(current) || !allowed || isReadonly || !form.ready || form.submitting
        || uploadBlocked || submission) return;
      const token = {};
      submission = token;
      submitError = null;
      try {
        await form.submit();
      } catch {
        if (submission === token && currentScope(current)) {
          submitError = i18n.t('common.operationFailed');
          queueMicrotask(() => {
            if (currentScope(current)) focusFirstInvalidField();
          });
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
  const fieldChange = $derived.by(() => {
    const origin = scope;
    return (key: string) => (value: unknown) => {
      if (!currentScope(origin) || !form.ready || !allowed || isReadonly) return;
      const previous = renderedDraft.values;
      form.setFieldValue(key, withoutArrayFieldMetadata(value));
      if (currentScope(origin) && authoritativeDraft.ok) {
        acceptedDraft = {
          snapshot: authoritativeDraft,
          values: { ...previous, [key]: value },
        };
      }
    };
  });
  const retry = $derived.by(() => {
    const origin = scope;
    const refetch = form.query.refetch;
    return () => { if (currentScope(origin)) void refetch().catch(() => {}); };
  });
  const queryClient = useQueryClient();
  function refreshPermission() {
    const resource = resourceName;
    void queryClient.invalidateQueries({
      predicate: query => {
        const parsed = parseQueryKey(query.queryKey);
        return parsed?.kind === 'access' && parsed.resource === resource;
      },
    }).catch(() => {});
  }

  // 显式 reset 入口：宿主通过 bind:this 调用，恢复 Core 初始草稿并清理本实例
  // 的提交令牌/提示；不触发导航，也不改变只读或未授权状态。
  export function reset(): void {
    if (!allowed || isReadonly) return;
    submission = undefined;
    submitError = null;
    // reset 后基线不再 tainted，旧的关闭保护与其待执行导航必须一起退休，
    // 否则后续确认会执行 reset 前捕获的导航。
    confirmOpen = false;
    pendingNavigation = null;
    uploadStates = {};
    // reset token 重挂载文件字段：旧 FileUpload 会按 unmount 回收在途上传。
    resetEpoch += 1;
    form.reset();
  }

  const pageTitle = $derived(
    mode === 'create'
      ? `${i18n.t('common.create')}${resource.label}`
      : mode === 'clone'
      ? `${i18n.t('common.clone')} ${resource.label}`
      : mode === 'show'
      ? `${i18n.t('common.detail')}${resource.label}`
      : `${i18n.t('common.edit')}${resource.label}`
  );

  // ─── Unsaved changes guard ────────────────────────────────────────
  let confirmOpen = $state(false);
  let pendingNavigation: (() => void) | null = null;

  const guardNavigate = $derived.by(() => {
    const origin = scope;
    return (fn: () => void) => {
      if (!currentScope(origin)) return;
      if (form.submitting) return;
      if (form.isTainted() || uploadBlocked) {
        pendingNavigation = () => { if (currentScope(origin)) fn(); };
        confirmOpen = true;
      } else {
        fn();
      }
    };
  });
  const back = $derived.by(() => {
    const guard = guardNavigate;
    const name = resourceName;
    const cancel = onCancel;
    return () => guard(() => cancel ? cancel() : navigation.list(name));
  });

  $effect(() => {
    onNavigationGuardReady?.(guardNavigate);
  });

  const confirmNavigate = $derived.by(() => {
    const origin = scope;
    return () => {
      if (!currentScope(origin)) return;
      confirmOpen = false;
      const navigate = pendingNavigation;
      pendingNavigation = null;
      navigate?.();
    };
  });

  const cancelNavigate = $derived.by(() => {
    const origin = scope;
    return () => {
      if (!currentScope(origin)) return;
      confirmOpen = false;
      pendingNavigation = null;
    };
  });
</script>

<div class="svadmin-u-b3542e058833" data-svadmin-rendering-resource={activeRendering?.resource.name} data-svadmin-rendering-kind={activeRendering ? 'form' : undefined}>
  {#if showHeader}
    <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-0c3bc98565dd">
      <TooltipButton
        tooltip={i18n.t('common.back')}
        onclick={back}
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

  {#if form.loading || permissionPending}
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
  {:else if !allowed}
    {#if permissionError}
      <p role="alert">{i18n.t('common.permissionUnavailable')}</p>
      <Button type="button" variant="outline" onclick={refreshPermission}>
        {i18n.t('common.retry')}
      </Button>
    {:else}
      <p role="alert">{i18n.t('common.permissionDenied')}</p>
    {/if}
  {:else if !form.ready && form.error}
    <p role="alert">{i18n.t('common.operationFailed')}</p>
    <Button type="button" variant="outline" onclick={retry}>
      {i18n.t('common.retry')}
    </Button>
  {:else if !renderedDraft.ok}
    <p role="alert">{i18n.t('common.operationFailed')}</p>
  {:else if form.ready}
    <form bind:this={formElement} onsubmit={submitEvent} class="svadmin-u-cf3893e36c22 svadmin-u-b3542e058833" novalidate>
      {#if submitError}
        <div transition:slide={{ duration: 300, axis: 'y' }} class="svadmin-shake">
          <Alert.Root variant="destructive">
            <AlertCircle class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" aria-hidden="true" />
            <Alert.Description>{submitError}</Alert.Description>
          </Alert.Root>
        </div>
      {/if}

      {#if showErrorSummary && errorEntries.length > 0}
        <ErrorSummary
          errors={errorEntries}
          title={i18n.t('common.formErrors')}
          id={`${instanceId}-error-summary`}
          onfocusfield={focusField}
        />
      {/if}

      {#if hasGroups}
        {#each groups as group, _i (_i)}
          <Card.Root class="svadmin-u-6ee2d41e2d2d svadmin-u-438b2237b8d6">
            {#if group.name}
              <Card.Header>
                <Card.Title class="svadmin-u-42536e69e639">{group.name}</Card.Title>
              </Card.Header>
            {/if}
            <Card.Content class="svadmin-u-f0faeb26d656 svadmin-u-7a9aabfcd059 svadmin-u-9fcd8a13827e svadmin-u-050494726fba svadmin-u-9335c39f6eff">
              <div class={gridClass}>
                {#each group.fields as field (field.key)}
                  <div data-svadmin-form-field data-svadmin-field-key={field.key} class={cn(columns > 1 && isFullWidthField(field) && 'svadmin-u-2c955d1b45df', !!form.errors[field.key] && 'svadmin-u-ee1a5af3aa10')}>
                    {#if fieldRenderer}
                      {@render fieldRenderer({ field, value: renderedDraft.values[field.key], onchange: fieldChange(field.key) })}
                    {:else}
                      <FieldRenderer
                        {field}
                        value={renderedDraft.values[field.key]}
                        onchange={fieldChange(field.key)}
                        invalid={!!form.errors[field.key]}
                        {...definedOptions({ "errorId": form.errors[field.key] ? fieldErrorId(field.key) : undefined })}
                        disabled={isReadonly}
                        fileReferenceMode
                        {fileScopeKey}
                        {...definedOptions({ upload, cancelUpload })}
                        onUploadStateChange={(state: UploadState) => setUploadState(field.key, state)}
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
          <Card.Content class="svadmin-u-f0faeb26d656 svadmin-u-52be28846b5f svadmin-u-9fcd8a13827e svadmin-u-7a9aabfcd059 svadmin-u-0a58453f3755 svadmin-u-050494726fba">
              <div class={gridClass} data-svadmin-form-grid data-columns={columns}>
              {#each formFields as field (field.key)}
                <div data-svadmin-form-field data-svadmin-field-key={field.key} class={cn(columns > 1 && isFullWidthField(field) && 'svadmin-u-2c955d1b45df', !!form.errors[field.key] && 'svadmin-u-ee1a5af3aa10')}>
                  {#if fieldRenderer}
                    {@render fieldRenderer({ field, value: renderedDraft.values[field.key], onchange: fieldChange(field.key) })}
                  {:else}
                  <FieldRenderer
                    {field}
                    value={renderedDraft.values[field.key]}
                    onchange={fieldChange(field.key)}
                    invalid={!!form.errors[field.key]}
                      {...definedOptions({ "errorId": form.errors[field.key] ? fieldErrorId(field.key) : undefined })}
                      disabled={isReadonly}
                      fileReferenceMode
                      {fileScopeKey}
                      {...definedOptions({ upload, cancelUpload })}
                      onUploadStateChange={(state: UploadState) => setUploadState(field.key, state)}
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
        {#if formActions && !isReadonly}
          {@render formActions({ isLoading: form.submitting || uploadPending, isDisabled: form.submitting || uploadBlocked, onSubmit: handleSubmit })}
        {:else if !isReadonly}
          <Button type="submit" size="default" disabled={form.submitting || uploadBlocked}>
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
            size="default"
            onclick={back}
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
