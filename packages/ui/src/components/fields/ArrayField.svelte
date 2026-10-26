<script lang="ts">
  import type { FieldDefinition } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import { Button } from '../ui/button/index.js';
  import { ArrowDown, ArrowUp, Plus, Trash2 } from '@lucide/svelte';
  import TooltipButton from '../TooltipButton.svelte';
  import FieldRenderer from '../FieldRenderer.svelte';
  import type { UploadCancelHandler, UploadHandler } from '../file-upload-types.js';
  import { arrayFieldRowKey as editedRowKey, arrayFieldOrderKey as outputOrderKey } from './array-field-metadata.js';

  const i18n = useTranslation();

  interface Props {
    field: FieldDefinition;
    value: unknown;
    onchange: (val: unknown) => void;
    disabled?: boolean;
    labelledby?: string;
    describedby?: string;
    invalid?: boolean;
    nativeSubmit?: boolean;
    upload?: UploadHandler;
    cancelUpload?: UploadCancelHandler;
    onUploadStateChange?: (state: { busy: boolean; unresolved: boolean }) => void;
    fileReferenceMode?: boolean;
    fileScopeKey?: string | number | object;
  }

  let {
    field, value, onchange, disabled = false, labelledby, describedby, invalid = false,
    nativeSubmit = true, upload, cancelUpload, onUploadStateChange, fileReferenceMode = false,
    fileScopeKey,
  }: Props = $props();

  const instanceId = $props.id();
  const headingId = `${instanceId}-heading`;
  const arrayVal = $derived<Record<string, unknown>[]>(Array.isArray(value) ? value : []);
  const subFields = $derived(field.subFields || []);
  let previousItems: Record<string, unknown>[] = [];
  let previousKeys: number[] = [];
  const pendingEdits = new Set<number>();
  let pendingItems: Record<string, unknown>[] = [];
  let pendingKeys: number[] = [];
  const childUploadStates = new Map<string, { busy: boolean; unresolved: boolean }>();
  let outputSequence = 0;
  let nextKey = 0;
  function rememberOutput(items: Record<string, unknown>[], keys: number[]) {
    Object.defineProperty(items, outputOrderKey, { value: ++outputSequence });
    pendingItems = [...items];
    pendingKeys = [...keys];
  }
  const rows = $derived.by(() => {
    const acceptedOutput = Reflect.get(arrayVal, outputOrderKey) === outputSequence
      && pendingItems.length === arrayVal.length
      && arrayVal.every((item, index) => Object.is(item, pendingItems[index]));
    if (acceptedOutput) {
      const nextRows = arrayVal.map((item, index) => ({ item, key: pendingKeys[index] ?? ++nextKey }));
      previousItems = [...arrayVal];
      previousKeys = nextRows.map(row => row.key);
      pendingItems = [];
      pendingKeys = [];
      pendingEdits.clear();
      return nextRows;
    }
    const used = new Set<number>();
    // 先保留显式编辑行，避免同一对象出现在多行时被未编辑的行抢走身份。
    const matches = arrayVal.map(item => {
      const key: unknown = Reflect.get(item, editedRowKey);
      if (typeof key !== 'number' || !pendingEdits.has(key)) return -1;
      const index = previousKeys.indexOf(key);
      if (index < 0 || used.has(index)) return -1;
      used.add(index);
      return index;
    });
    arrayVal.forEach((item, position) => {
      if (matches[position] !== -1) return;
      const index = previousItems.findIndex((previous, i) => previous === item && !used.has(i));
      if (index >= 0) used.add(index);
      matches[position] = index;
    });
    const nextRows = arrayVal.map((item, index) => {
      const match = matches[index] ?? -1;
      const key = match >= 0 ? previousKeys[match] : undefined;
      if (key !== undefined) pendingEdits.delete(key);
      return { item, key: key ?? ++nextKey };
    });
    previousItems = [...arrayVal];
    previousKeys = nextRows.map(row => row.key);
    pendingItems = [];
    pendingKeys = [];
    pendingEdits.clear();
    return nextRows;
  });

  function getDefaultForType(type: string): unknown {
    switch (type) {
      case 'text': case 'textarea': case 'richtext': case 'image': return '';
      case 'number': return 0;
      case 'boolean': return false;
      case 'tags': case 'images': case 'multiselect': case 'array': return [];
      case 'json': return {};
      default: return '';
    }
  }

  function handleAdd() {
    if (disabled) return;
    const newItem: Record<string, unknown> = {};
    for (const f of subFields) {
      newItem[f.key] = f.defaultValue ?? getDefaultForType(f.type);
    }
    const next = [...arrayVal, newItem];
    rememberOutput(next, [...rows.map(row => row.key), ++nextKey]);
    onchange(next);
  }

  function reportChildUploadState(
    key: string,
    state: { busy: boolean; unresolved: boolean },
  ): void {
    if (!state.busy && !state.unresolved) childUploadStates.delete(key);
    else childUploadStates.set(key, state);
    const states = [...childUploadStates.values()];
    onUploadStateChange?.({
      busy: states.some(value => value.busy),
      unresolved: states.some(value => value.unresolved),
    });
  }

  function handleRemove(index: number) {
    if (disabled) return;
    const next = arrayVal.filter((_, i) => i !== index);
    rememberOutput(next, rows.filter((_, i) => i !== index).map(row => row.key));
    onchange(next);
  }

  function handleMove(index: number, direction: -1 | 1) {
    if (disabled || index < 0 || index >= arrayVal.length) return;
    const target = index + direction;
    if (target < 0 || target >= arrayVal.length) return;
    const next = [...arrayVal];
    const moved = next.splice(index, 1);
    next.splice(target, 0, ...moved);
    const nextKeys = rows.map(row => row.key);
    const movedKey = nextKeys.splice(index, 1);
    nextKeys.splice(target, 0, ...movedKey);
    rememberOutput(next, nextKeys);
    onchange(next);
  }

  function handleChange(index: number, key: string, val: unknown) {
    if (disabled) return;
    const next = [...arrayVal];
    const edited = { ...next[index], [key]: val };
    const rowKey = rows[index]?.key;
    if (rowKey !== undefined) {
      Object.defineProperty(edited, editedRowKey, { value: rowKey });
      pendingEdits.add(rowKey);
    }
    next[index] = edited;
    rememberOutput(next, rows.map(row => row.key));
    onchange(next);
  }
</script>

<div
  role="group"
  aria-labelledby={labelledby ?? headingId}
  aria-describedby={describedby}
  aria-disabled={disabled || undefined}
  data-invalid={invalid || undefined}
  class="svadmin-u-3e7ce58d64fa svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-a29b7a649c77 svadmin-u-8e63407b5ceb"
>
  <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc">
    <div id={headingId} class="svadmin-u-fc7473ca09eb svadmin-u-2689f3958069 svadmin-u-d4108abe6359">
      {field.label}
      {#if field.required}
        <span class="svadmin-u-811148b13d1e">*</span>
      {/if}
    </div>
    <Button
      variant="outline"
      size="sm"
      type="button"
      disabled={disabled}
      {...(describedby === undefined ? {} : { 'aria-describedby': describedby })}
      {...(invalid ? { 'aria-invalid': true } : {})}
      onclick={handleAdd}
    >
      <Plus class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-618162408e7a" /> {i18n.t('common.add') || 'Add'}
    </Button>
  </div>
  
  <div class="svadmin-u-3e7ce58d64fa svadmin-u-f46b61a9b310">
    {#each rows as row, i (row.key)}
      {@const item = row.item}
      <div role="group" aria-label={`${field.label} ${i + 1}`} class="svadmin-u-d89972fe17d6 svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-cd0ad9a56558 svadmin-u-8e63407b5ceb svadmin-u-30c1d058f0db svadmin-u-438b2237b8d6">
        <div style="display: flex; justify-content: flex-end; gap: 4px;">
          <TooltipButton
            disabled={disabled || i === 0}
            tooltip={i18n.t('common.moveUp') || 'Move up'}
            variant="ghost"
            size="icon"
            aria-label={i18n.t('common.moveUp') || 'Move up'}
            class="svadmin-u-ed8a5df7b2fb svadmin-u-2bbcfc3b5179"
            onclick={() => handleMove(i, -1)}
          >
            <ArrowUp class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
          </TooltipButton>
          <TooltipButton
            disabled={disabled || i === arrayVal.length - 1}
            tooltip={i18n.t('common.moveDown') || 'Move down'}
            variant="ghost"
            size="icon"
            aria-label={i18n.t('common.moveDown') || 'Move down'}
            class="svadmin-u-ed8a5df7b2fb svadmin-u-2bbcfc3b5179"
            onclick={() => handleMove(i, 1)}
          >
            <ArrowDown class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
          </TooltipButton>
          <TooltipButton disabled={disabled} tooltip={i18n.t('common.remove') || 'Remove'} variant="ghost" size="icon" class="svadmin-u-ed8a5df7b2fb svadmin-u-2bbcfc3b5179 svadmin-u-bfa603190748 svadmin-u-51e95020d6f2 svadmin-u-ceb69a6b0e5f" onclick={() => handleRemove(i)}>
            <Trash2 class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
          </TooltipButton>
        </div>
        <div class="svadmin-u-f3c543ad5fe9 svadmin-u-b39e60c339f4">
          {#each subFields as subField (subField.key)}
            <FieldRenderer
              field={subField}
              value={item[subField.key]}
              disabled={disabled}
              {nativeSubmit}
              {fileReferenceMode}
              {...(fileScopeKey === undefined ? {} : { fileScopeKey })}
              {...(upload === undefined ? {} : { upload })}
              {...(cancelUpload === undefined ? {} : { cancelUpload })}
              {...(onUploadStateChange === undefined
                ? {}
                : { onUploadStateChange: (state: { busy: boolean; unresolved: boolean }) =>
                  reportChildUploadState(`${row.key}:${subField.key}`, state) })}
              onchange={(val) => handleChange(i, subField.key, val)}
            />
          {/each}
        </div>
      </div>
    {/each}
    {#if arrayVal.length === 0}
      <div class="svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-940911bf310c svadmin-u-fc7473ca09eb svadmin-u-bfa603190748 svadmin-u-8a25a995eb8e svadmin-u-421ac2be5045">
        <span>{i18n.t('common.noData') || 'No items added yet.'}</span>
      </div>
    {/if}
  </div>
</div>
