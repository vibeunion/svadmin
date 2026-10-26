<script lang="ts">
  import type { FieldDefinition } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import { definedOptions } from '@svadmin/core/options';
  import { onDestroy } from 'svelte';
  import { X } from '@lucide/svelte';
  import FileUpload from './FileUpload.svelte';
  import type {
    UploadCancelHandler, UploadHandler, UploadItem,
  } from './file-upload-types.js';
  import { Button } from './ui/button/index.js';
  import {
    mergeUploadReferences, normalizeUploadReferences, uploadReferenceFor,
    uploadReferenceKey, uploadReferenceLabel, type UploadReference,
  } from './file-upload-reference.js';

  interface UploadState {
    busy: boolean;
    unresolved: boolean;
  }

  interface Props {
    id?: string;
    field: FieldDefinition;
    value: unknown;
    onchange: (value: unknown) => void;
    disabled?: boolean;
    invalid?: boolean;
    describedby?: string;
    upload?: UploadHandler;
    cancelUpload?: UploadCancelHandler;
    onUploadStateChange?: (state: UploadState) => void;
  }

  let {
    id, field, value, onchange, disabled = false, invalid = false,
    describedby, upload, cancelUpload, onUploadStateChange,
  }: Props = $props();

  const i18n = useTranslation();
  const UPLOADING = new Set<UploadItem['status']>(['queued', 'uploading']);
  let baseline = $state<UploadReference[]>([]);
  let uploaded = $state<UploadReference[]>([]);
  let lastEmitted = '';
  let busy = $state(false);
  let unresolved = $state(false);
  let missingReference = $state(false);

  // 外部 value 更新基线；本组件自己的写入由队列结算，避免重复回显。
  $effect(() => {
    const next = normalizeUploadReferences(value);
    const key = JSON.stringify(next.map(uploadReferenceKey));
    if (key === lastEmitted) return;
    baseline = next;
    lastEmitted = key;
  });

  // 单值字段成功上传后替代旧基线；多值字段始终保留原引用。
  const displayedBaseline = $derived(
    field.multiple || uploaded.length === 0 ? baseline : [],
  );
  const merged = $derived.by(() => field.multiple
    ? mergeUploadReferences(baseline, uploaded)
    : uploaded.length > 0 ? [uploaded[uploaded.length - 1] as UploadReference] : baseline.slice(0, 1));

  function report(): void {
    onUploadStateChange?.({ busy, unresolved });
  }

  function emit(next: UploadReference[]): void {
    const key = JSON.stringify(next.map(uploadReferenceKey));
    if (key === lastEmitted) return;
    lastEmitted = key;
    onchange(field.multiple ? next : next[0] ?? null);
  }

  function handleItems(items: UploadItem[]): void {
    const successful = items.flatMap(item => {
      const reference = uploadReferenceFor(item);
      return reference === undefined ? [] : [reference];
    });
    missingReference = items.some(item =>
      item.status === 'success' && uploadReferenceFor(item) === undefined);
    busy = items.some(item => UPLOADING.has(item.status));
    unresolved = missingReference || items.some(item =>
      item.status === 'error' || item.status === 'cancelled');
    if (!field.multiple) {
      // 成功替换退休旧引用；下一次上传未成功时保留最近一次成功引用。
      if (successful.length > 0) baseline = [];
      else if (uploaded.length > 0) baseline = items.length > 0 ? uploaded.slice(-1) : [];
    }
    uploaded = successful;
    // 缺少有效标识的成功结果不写入表单；移除该项后会重新结算剩余成功项。
    if (!missingReference) emit(merged);
    report();
  }

  function removeBaseline(index: number): void {
    if (disabled) return;
    baseline = baseline.filter((_reference, current) => current !== index);
    emit(merged);
  }

  onDestroy(() => {
    if (!busy && !unresolved) return;
    busy = false;
    unresolved = false;
    report();
  });
</script>

{#if displayedBaseline.length > 0}
  <ul class="svadmin-upload-reference-list" aria-label={field.label}>
    {#each displayedBaseline as reference, index (uploadReferenceKey(reference) + index)}
      {@const label = uploadReferenceLabel(reference)}
      <li class="svadmin-upload-reference">
        <span class="svadmin-upload-reference-text">{label}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`${i18n.t('common.remove')} ${label}`}
          aria-describedby={describedby}
          aria-invalid={invalid || undefined}
          {disabled}
          onclick={() => removeBaseline(index)}
        >
          <X aria-hidden="true" />
        </Button>
      </li>
    {/each}
  </ul>
{/if}

{#if upload}
  <FileUpload
    {...definedOptions({ id })}
    name={field.key}
    {...definedOptions({ multiple: field.multiple })}
    {...definedOptions({ required: field.required && baseline.length === 0 && uploaded.length === 0 })}
    {disabled}
    ariaLabel={field.label}
    {invalid}
    {...definedOptions({ describedby })}
    {...definedOptions({ accept: field.accept, maxSize: field.maxSize })}
    {upload}
    {...definedOptions({ cancelUpload })}
    onChange={handleItems}
  />
{:else}
  <!-- AutoForm 的托管字段没有上传回调时不接受 File，避免 File 进入 JSON 快照。 -->
  <FileUpload
    {...definedOptions({ id, multiple: field.multiple })}
    disabled
    ariaLabel={field.label}
    {invalid}
    {...definedOptions({ describedby })}
  />
  <p role="alert">{i18n.t('common.operationFailed')}</p>
{/if}

{#if missingReference}
  <p role="alert">{i18n.t('common.operationFailed')}</p>
{/if}

<style>
  .svadmin-upload-reference-list { display: grid; gap: 4px; margin: 0 0 8px; padding: 0; list-style: none; }
  .svadmin-upload-reference { display: flex; align-items: center; gap: 8px; min-width: 0; padding: 4px 8px; border: 1px solid var(--border); border-radius: 6px; }
  .svadmin-upload-reference-text { overflow: hidden; flex: 1; color: var(--foreground); text-overflow: ellipsis; white-space: nowrap; }
</style>
