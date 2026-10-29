<script lang="ts" module>
/* eslint-disable no-import-assign */
  export type { FieldDefinition } from '@svadmin/core';
</script>

<script lang="ts">
  import { definedOptions } from '@svadmin/core/options';

  import type { FieldDefinition } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import { Input } from './ui/input/index.js';
  import { Textarea } from './ui/textarea/index.js';
  import { Switch } from './ui/switch/index.js';
  import { Badge } from './ui/badge/index.js';
  import { Label } from './ui/label/index.js';
  import { Select } from './ui/select/index.js';
  import { Checkbox } from './ui/checkbox/index.js';
  import { Button } from './ui/button/index.js';
  import TooltipButton from './TooltipButton.svelte';
  import ComboboxField from './ComboboxField.svelte';
  import NumberInput from './NumberInput.svelte';
  import MoneyInput from './MoneyInput.svelte';
  import PercentInput from './PercentInput.svelte';
  import DateTimeInput from './DateTimeInput.svelte';
  import DateRangeInput, { type DateRangeInputValue } from './DateRangeInput.svelte';
  import FileUpload from './FileUpload.svelte';
  import type { UploadCancelHandler, UploadHandler } from './file-upload-types.js';
  import FileUploadField from './FileUploadField.svelte';
  import ColorPicker from './ColorPicker.svelte';
  import Rate from './Rate.svelte';
  import TagsInput from './TagsInput.svelte';
  import TreeSelect, { type TreeSelectOption } from './TreeSelect.svelte';
  import Cascader, { type CascaderOption } from './Cascader.svelte';
  import Transfer, { type TransferItem } from './Transfer.svelte';
  import ArrayField from './fields/ArrayField.svelte';
  import MediaThumbnail from './content/MediaThumbnail.svelte';
  import { Plus, X } from '@lucide/svelte';
  import type { Snippet } from 'svelte';
  import { getRichTextEditor } from '../editor-config.svelte.js';
  import { numericInputValue } from '../numeric-input.js';
  import type { NumericInputLocale } from './numeric-format.js';

  type FieldOption = NonNullable<FieldDefinition['options']>[number];
  const i18n = useTranslation();

  let {
    field, value, onchange, disabled, invalid = false, errorId, id, children, nativeSubmit = true,
    upload, cancelUpload, onUploadStateChange, fileReferenceMode = false, fileScopeKey,
  } = $props<{
    field: FieldDefinition;
    value: unknown;
    onchange: (val: unknown) => void;
    disabled?: boolean;
    invalid?: boolean;
    errorId?: string | undefined;
    id?: string;
    children?: Snippet;
    /** 嵌套数组的可序列化值由外层 JSON 提交；原始文件保留原生通道。 */
    nativeSubmit?: boolean;
    /** 开启异步上传后，字段值只保存可序列化引用，不再接收 File。 */
    upload?: UploadHandler;
    cancelUpload?: UploadCancelHandler;
    onUploadStateChange?: (state: { busy: boolean; unresolved: boolean }) => void;
    /** AutoForm 的 JSON 文件模式；独立 FieldRenderer 默认保留原生 multipart。 */
    fileReferenceMode?: boolean;
    /** 记录/上传作用域或 reset 变化时只重挂载文件字段。 */
    fileScopeKey?: string | number | object;
  }>();

  const instanceId = $props.id();
  const controlId = $derived(id ?? (children ? field.key : `${instanceId}-control`));
  const labelId = $derived(children ? `label-${controlId}` : `${instanceId}-label`);
  const labelTarget = $derived(!children && field.type === 'daterange' ? `${controlId}-start` : controlId);
  const descriptionId = $derived(`${instanceId}-description`);
  const describedBy = $derived([field.description ? descriptionId : undefined, errorId].filter(Boolean).join(' ') || undefined);
  const nativeFieldName = $derived(nativeSubmit ? field.key : undefined);
  const nativeArrayName = $derived(nativeSubmit ? `${field.key}[]` : undefined);

  // Typed accessors
  const strVal = $derived((value as string) ?? '');
  const numVal = $derived(numericInputValue(value));
  // FieldDefinition.locale is intentionally a runtime string. Pass it through so
  // NumericInput can render an explicit unsupported-locale state instead of
  // silently switching the field back to the default number path.
  const numericLocale = $derived(field.locale as NumericInputLocale | undefined);
  const boolVal = $derived((value as boolean) ?? false);
  const tagsVal = $derived((value as string[]) ?? []);
  const multiVal = $derived((value as (string | number)[]) ?? []);
  const selectToken = $derived.by(() => {
    const index = field.options?.findIndex((option: FieldOption) => option.value === value) ?? -1;
    return index < 0 ? '' : `option:${index}`;
  });
  const imagesVal = $derived((value as string[]) ?? []);
  let jsonEditText = $state('');
  let jsonEditing = false;

  $effect(() => {
    if (jsonEditing) return;
    jsonEditText = typeof value === 'string' ? String(value) : JSON.stringify(value, null, 2);
  });

  function changeSelect(event: Event) {
    if (disabled || !(event.currentTarget instanceof HTMLSelectElement)) return;
    const token = event.currentTarget.value;
    if (token === '') {
      onchange(null);
      return;
    }
    const option = field.options?.find((_option: FieldOption, index: number) => token === `option:${index}`);
    if (option && !option.disabled) onchange(option.value);
  }

  // 禁用值保留回显，但不能从复选框或标签删除入口修改。
  function toggleMulti(optValue: string | number) {
    if (disabled || field.options?.find((option: FieldOption) => option.value === optValue)?.disabled) return;
    if (multiVal.includes(optValue)) {
      onchange(multiVal.filter((v: string | number) => v !== optValue));
    } else {
      onchange([...multiVal, optValue]);
    }
  }

  // Images management：禁用态保留回显，但所有入口都不能改值。
  function addImage() {
    if (disabled) return;
    onchange([...imagesVal, '']);
  }

  function updateImage(index: number, url: string) {
    if (disabled) return;
    const next = [...imagesVal];
    next[index] = url;
    onchange(next);
  }

  function removeImage(index: number) {
    if (disabled) return;
    onchange(imagesVal.filter((_: string, i: number) => i !== index));
  }
</script>

<div
  class="space-y-1.5"
  data-svadmin-field
  data-svadmin-field-key={field.key}
>
  <Label {...definedOptions({ for: !children && (['array', 'transfer'].includes(field.type) || field.type === 'richtext' && getRichTextEditor()) ? undefined : labelTarget })} id={labelId} data-svadmin-field-label>
    {field.label}
    {#if field.required}
      <span class="text-destructive" data-svadmin-required>*</span>
    {/if}
  </Label>
  {#if field.description}
    <p id={descriptionId} data-svadmin-field-description class="text-xs text-muted-foreground">{field.description}</p>
  {/if}

  {#if children}
    {@render children()}

  {:else if field.type === 'array'}
    {#if nativeSubmit}
      <input type="hidden" name={field.key} value={JSON.stringify(Array.isArray(value) ? value : [])} {disabled} />
    {/if}
    <ArrayField
      {field}
      {value}
      {onchange}
      {...definedOptions({ disabled })}
      labelledby={labelId}
      {...definedOptions({ describedby: describedBy })}
      invalid={invalid}
      nativeSubmit={false}
      {fileReferenceMode}
      {...definedOptions({ upload, cancelUpload, onUploadStateChange, fileScopeKey })}
    />

  {:else if field.type === 'text' || field.type === 'image'}
    <Input
      id={controlId}
      name={nativeFieldName}
      type="text"
      value={strVal}
      oninput={(e) => onchange((e.target as HTMLInputElement).value)}
      required={field.required}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      {disabled}
      placeholder={i18n.t('field.enterValue', { label: field.label })}
    />

  {:else if field.type === 'email'}
    <Input
      id={controlId}
      name={nativeFieldName}
      type="email"
      value={strVal}
      oninput={(e) => onchange((e.target as HTMLInputElement).value)}
      required={field.required}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      {disabled}
      placeholder="name@example.com"
    />

  {:else if field.type === 'url'}
    <Input
      id={controlId}
      name={nativeFieldName}
      type="url"
      value={strVal}
      oninput={(e) => onchange((e.target as HTMLInputElement).value)}
      required={field.required}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      {disabled}
      placeholder="https://"
    />

  {:else if field.type === 'phone'}
    <Input
      id={controlId}
      name={nativeFieldName}
      type="tel"
      value={strVal}
      oninput={(e) => onchange((e.target as HTMLInputElement).value)}
      required={field.required}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      {disabled}
      placeholder="+1 (555) 000-0000"
    />

  {:else if field.type === 'color'}
    <ColorPicker
      id={controlId}
      value={strVal}
      onchange={onchange}
      required={field.required}
      invalid={invalid}
      ariaLabel={field.label}
      {disabled}
      {...definedOptions({ name: nativeFieldName, describedby: describedBy })}
    />

  {:else if field.type === 'number'}
    <NumberInput
      id={controlId}
      name={nativeFieldName}
      value={numVal}
      min={field.min}
      max={field.max}
      step={field.step}
      precision={field.precision}
      locale={numericLocale}
      onchange={onchange}
      required={field.required}
      invalid={invalid}
      describedby={describedBy}
      {disabled}
    />

  {:else if field.type === 'currency'}
    <MoneyInput
      id={controlId}
      name={nativeFieldName}
      value={numVal}
      currency={field.currency ?? 'USD'}
      min={field.min}
      max={field.max}
      step={field.step}
      precision={field.precision ?? 2}
      locale={numericLocale}
      onchange={onchange}
      required={field.required}
      invalid={invalid}
      describedby={describedBy}
      {disabled}
    />

  {:else if field.type === 'percent'}
    <PercentInput
      id={controlId}
      name={nativeFieldName}
      value={numVal}
      scale={field.scale ?? '100'}
      min={field.min}
      max={field.max}
      step={field.step}
      precision={field.precision ?? 1}
      locale={numericLocale}
      onchange={onchange}
      required={field.required}
      invalid={invalid}
      describedby={describedBy}
      {disabled}
    />

  {:else if field.type === 'richtext'}
    {@const EditorComp = getRichTextEditor()}
    {#if EditorComp}
      <input type="hidden" name={nativeFieldName} value={strVal} {disabled} />
      <EditorComp
        id={controlId}
        value={strVal}
        placeholder={i18n.t('field.enterValue', { label: field.label })}
        preset="full"
        onchange={(html: string) => { if (!disabled) onchange(html); }}
        aria-labelledby={labelId}
        aria-required={field.required || undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        {disabled}
      />
    {:else}
      <Textarea
        id={controlId}
        name={nativeFieldName}
        value={strVal}
        oninput={(e) => onchange((e.target as HTMLTextAreaElement).value)}
        required={field.required}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        {disabled}
        rows={10}
        placeholder={i18n.t('field.enterValue', { label: field.label })}
        class="resize-y"
      />
    {/if}

  {:else if field.type === 'textarea'}
    <Textarea
      id={controlId}
      name={nativeFieldName}
      value={strVal}
      oninput={(e) => onchange((e.target as HTMLTextAreaElement).value)}
      required={field.required}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      {disabled}
      rows={4}
      placeholder={i18n.t('field.enterValue', { label: field.label })}
      class="resize-y"
    />

  {:else if field.type === 'tree-select' || field.type === 'treeselect'}
    {#if field.multiple}
      {#each multiVal as selectedValue, _i (selectedValue)}
        <input type="hidden" name={nativeArrayName} value={String(selectedValue)} {disabled} />
      {/each}
    {:else}
      <input type="hidden" name={nativeFieldName} value={value == null ? '' : String(value)} {disabled} />
    {/if}
    <TreeSelect
      id={controlId}
      ariaLabel={field.label}
      {...definedOptions({ describedby: describedBy })}
      invalid={invalid}
      options={(field.treeOptions ?? field.options ?? []) as TreeSelectOption[]}
      {...definedOptions({ "value": value as string | number | (string | number)[] | undefined })}
      multiple={field.multiple}
      disabled={disabled}
      placeholder={i18n.t('field.selectPlaceholder')}
      onchange={(v) => onchange(v)}
    />

  {:else if field.type === 'cascader'}
    <input type="hidden" name={nativeFieldName} value={JSON.stringify(Array.isArray(value) ? value : [])} {disabled} />
    <Cascader
      id={controlId}
      ariaLabel={field.label}
      {...definedOptions({ describedby: describedBy })}
      invalid={invalid}
      options={(field.cascaderOptions ?? field.options ?? []) as CascaderOption[]}
      value={value as (string | number)[]}
      separator={field.separator}
      changeOnSelect={field.changeOnSelect}
      disabled={disabled}
      placeholder={i18n.t('field.selectPlaceholder')}
      onchange={(v) => onchange(v)}
    />

  {:else if field.type === 'transfer'}
    {#each multiVal as selectedValue, _i (selectedValue)}
      <input type="hidden" name={nativeArrayName} value={String(selectedValue)} {disabled} />
    {/each}
    <Transfer
      id={controlId}
      labelledby={labelId}
      {...definedOptions({ describedby: describedBy })}
      invalid={invalid}
      dataSource={(field.transferData ?? field.options?.map((o: { label: string; value: string | number }) => ({ key: o.value, title: o.label })) ?? []) as TransferItem[]}
      targetKeys={(value as (string | number)[]) ?? []}
      disabled={disabled}
      onchange={(next) => onchange(next)}
    />

  {:else if field.type === 'relation' && field.resource}
    {#if field.multiple}
      {#each multiVal as selectedValue, _i (selectedValue)}
        <input type="hidden" name={nativeFieldName} value={String(selectedValue)} {disabled} />
      {/each}
    {:else}
      <input type="hidden" name={nativeFieldName} value={value == null ? '' : String(value)} {disabled} />
    {/if}
    <ComboboxField
      id={controlId}
      resource={field.resource}
      value={field.multiple ? multiVal : value as string | number | null}
      onchange={(v) => onchange(v)}
      optionLabel={field.optionLabel ?? 'title'}
      optionValue={field.optionValue ?? 'id'}
      multiple={field.multiple}
      placeholder={i18n.t('field.selectPlaceholder')}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      {disabled}
    />

  {:else if field.type === 'select'}
    <input type="hidden" name={nativeFieldName} value={value == null ? '' : String(value)} {disabled} />
    {#if (field.options?.length ?? 0) > 8}
      <select
        id={controlId}
        data-slot="select"
        class="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        value={selectToken}
        onchange={changeSelect}
        required={field.required}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        disabled={disabled}
      >
        <option value="">{i18n.t('field.selectPlaceholder')}</option>
        {#each field.options ?? [] as opt, _i (_i)}
          <option value={`option:${_i}`} disabled={opt.disabled}>{opt.label}</option>
        {/each}
      </select>
    {:else}
      <Select
        id={controlId}
        value={selectToken}
        onchange={changeSelect}
        required={field.required}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        {disabled}
      >
        <option value="">{i18n.t('field.selectPlaceholder')}</option>
        {#each field.options ?? [] as opt, _i (_i)}
          <option value={`option:${_i}`} disabled={opt.disabled}>{opt.label}</option>
        {/each}
      </Select>
    {/if}

  {:else if field.type === 'multiselect'}
    {#each multiVal as selectedValue, selectedIndex (`${selectedValue}-${selectedIndex}`)}
      <input type="hidden" name={nativeArrayName} value={String(selectedValue)} {disabled} />
    {/each}
    <div 
      class="space-y-2 rounded-lg border border-input p-3 max-h-48 overflow-y-auto"
      role="group" 
      aria-labelledby={labelId}
      aria-describedby={describedBy}
      data-invalid={invalid || undefined}
    >
      {#each field.options ?? [] as opt, _i (_i)}
        <label class="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 transition-colors">
          <Checkbox
            id={`${controlId}-option-${_i}`}
            checked={multiVal.includes(opt.value)}
            onCheckedChange={() => toggleMulti(opt.value)}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            disabled={disabled || opt.disabled}
          />
          {opt.label}
        </label>
      {/each}
      {#if !(field.options?.length)}
        <p class="text-xs text-muted-foreground">{i18n.t('field.noOptions')}</p>
      {/if}
    </div>
    {#if multiVal.length > 0}
      <div class="flex flex-wrap gap-1 mt-1">
        {#each multiVal as v, _i (_i)}
          {@const label = field.options?.find((o: { label: string; value: string | number }) => o.value === v)?.label ?? String(v)}
          <Badge variant="secondary" class="gap-1">
            {label}
            <button type="button" disabled={disabled || field.options?.find((option: FieldOption) => option.value === v)?.disabled} onclick={() => toggleMulti(v)} class="ml-0.5 rounded-sm hover:text-destructive hover:bg-destructive/10 transition-colors" aria-label={i18n.t('common.clear')}>×</button>
          </Badge>
        {/each}
      </div>
    {/if}

  {:else if field.type === 'boolean'}
    <input type="hidden" name={nativeFieldName} value={String(boolVal)} {disabled} />
    <div class="flex items-center gap-2 pt-1">
      <Switch
        id={controlId}
        checked={boolVal}
        onCheckedChange={(v) => onchange(v)}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        disabled={disabled}
      />
      <span class="text-sm text-muted-foreground">{boolVal ? i18n.t('common.yes') : i18n.t('common.no')}</span>
    </div>

  {:else if field.type === 'tags'}
    <TagsInput
      value={tagsVal}
      onchange={onchange}
      placeholder={i18n.t('field.tagsPlaceholder')}
      required={field.required}
      invalid={invalid}
      ariaLabel={field.label}
      {disabled}
      {...definedOptions({ name: nativeArrayName, describedby: describedBy })}
    />

  {:else if field.type === 'date' || field.type === 'time' || field.type === 'datetime'}
    <DateTimeInput
      id={controlId}
      name={nativeFieldName}
      mode={field.type}
      min={field.dateInput?.min}
      max={field.dateInput?.max}
      step={field.dateInput?.step}
      disabledDate={field.dateInput?.disabledDate}
      valueMode={field.dateInput?.valueMode}
      timeZone={field.dateInput?.timeZone}
      disambiguation={field.dateInput?.disambiguation}
      value={strVal || null}
      onchange={(next) => onchange(next)}
      required={field.required}
      invalid={invalid}
      describedby={describedBy}
      {disabled}
    />

  {:else if field.type === 'daterange'}
    <DateRangeInput
      startId={`${controlId}-start`}
      mode={field.dateInput?.rangeMode ?? 'date'}
      valueMode={field.dateInput?.valueMode}
      timeZone={field.dateInput?.timeZone}
      disambiguation={field.dateInput?.disambiguation}
      min={field.dateInput?.min}
      max={field.dateInput?.max}
      step={field.dateInput?.step}
      disabledDate={field.dateInput?.disabledDate}
      presets={field.dateInput?.presets}
      endId={`${controlId}-end`}
      startAriaLabel={`${field.label} ${i18n.t('common.startDate')}`}
      endAriaLabel={`${field.label} ${i18n.t('common.endDate')}`}
      value={value as DateRangeInputValue | null}
      onchange={(next) => onchange(next)}
      required={field.required}
      invalid={invalid}
      {disabled}
      {...definedOptions({
        startName: nativeSubmit ? `${field.key}.start` : undefined,
        endName: nativeSubmit ? `${field.key}.end` : undefined,
        describedby: describedBy,
      })}
    />

  {:else if field.type === 'rate' || field.type === 'rating'}
    <Rate
      name={nativeFieldName}
      value={numVal ?? 0}
      onchange={onchange}
      required={field.required}
      invalid={invalid}
      ariaLabel={field.label}
      {disabled}
      {...definedOptions({ describedby: describedBy })}
    />

  {:else if field.type === 'file'}
    {#if fileReferenceMode || upload}
      <!-- AutoForm 显式 JSON 文件模式：只写入可序列化引用。 -->
      {#key fileScopeKey}
        <FileUploadField
          id={controlId}
          {field}
          {value}
          {onchange}
          {invalid}
          {...definedOptions({ describedby: describedBy })}
          {...definedOptions({ disabled, upload, cancelUpload, onUploadStateChange })}
        />
      {/key}
    {:else}
      <!-- 独立 FieldRenderer 保留原生 multipart 字段名与 File 值。 -->
      <FileUpload
        id={controlId}
        name={field.key}
        multiple={field.multiple}
        required={field.required && !value}
        disabled={disabled}
        ariaLabel={field.label}
        invalid={invalid}
        {...definedOptions({ describedby: describedBy })}
        accept={field.accept}
        maxSize={field.maxSize}
        onChange={(items) => onchange(field.multiple ? items.map(item => item.file) : items[0]?.file ?? null)}
      />
    {/if}

  {:else if field.type === 'images'}
    {#each imagesVal as url, imageIndex (imageIndex)}
      <input type="hidden" name={nativeArrayName} value={url} {disabled} />
    {/each}
    <div class="space-y-2">
      {#each imagesVal as url, i (i)}
        <div class="flex items-center gap-2">
          <Input
            id={i === 0 ? controlId : undefined}
            type="text"
            value={url}
            oninput={(e) => updateImage(i, (e.target as HTMLInputElement).value)}
            placeholder="https://example.com/image.jpg"
            class="flex-1"
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            {disabled}
          />
          {#if url}
            <div class="size-9 shrink-0"><MediaThumbnail src={url} alt="preview" size="full" fit="cover" showOverlay={false} /></div>
          {/if}
          <TooltipButton
            tooltip={i18n.t('common.removeImage')}
            variant="ghost"
            size="icon"
            class="h-8 w-8 shrink-0"
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            {disabled}
            onclick={() => removeImage(i)}
          >
            <X class="h-3.5 w-3.5" />
          </TooltipButton>
        </div>
      {/each}
      <Button
        variant="outline"
        size="sm"
        type="button"
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        {disabled}
        onclick={addImage}
      >
        <Plus class="h-3.5 w-3.5 mr-1" /> {i18n.t('field.addImage')}
      </Button>
    </div>

  {:else if field.type === 'json'}
    <Textarea
      id={controlId}
      name={nativeFieldName}
      value={jsonEditText}
      onfocus={() => { jsonEditing = true; }}
      onblur={() => {
        jsonEditing = false;
        jsonEditText = typeof value === 'string' ? String(value) : JSON.stringify(value, null, 2);
      }}
      oninput={(e) => {
        const raw = (e.target as HTMLTextAreaElement).value;
        jsonEditText = raw;
        try {
          onchange(JSON.parse(raw));
        } catch {
          // keep raw text until valid JSON
        }
      }}
      {disabled}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      rows={6}
      class="resize-y font-mono text-xs"
    />

  {:else}
    <Input
      id={controlId}
      name={nativeFieldName}
      type="text"
      value={strVal}
      oninput={(e) => onchange((e.target as HTMLInputElement).value)}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      {disabled}
    />
  {/if}
</div>
