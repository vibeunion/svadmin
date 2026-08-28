<script lang="ts" module>
/* eslint-disable no-import-assign */
  export type { FieldDefinition } from '@svadmin/core';
</script>

<script lang="ts">
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
  import TreeSelect, { type TreeSelectOption } from './TreeSelect.svelte';
  import Cascader, { type CascaderOption } from './Cascader.svelte';
  import Transfer, { type TransferItem } from './Transfer.svelte';
  import ArrayField from './fields/ArrayField.svelte';
  import MediaThumbnail from './content/MediaThumbnail.svelte';
  import { Plus, X } from '@lucide/svelte';
  import type { Snippet } from 'svelte';
  import { getRichTextEditor } from '../editor-config.svelte.js';
  import { cn } from '../utils.js';

  const i18n = useTranslation();

  let { field, value, onchange, disabled, invalid = false, errorId, density = 'comfortable', children } = $props<{
    field: FieldDefinition;
    value: unknown;
    onchange: (val: unknown) => void;
    disabled?: boolean;
    invalid?: boolean;
    errorId?: string;
    density?: 'compact' | 'comfortable';
    children?: Snippet;
  }>();

  const isCompact = $derived(density === 'compact');

  // Typed accessors
  const strVal = $derived((value as string) ?? '');
  const numVal = $derived(value as number | null | undefined);
  const boolVal = $derived((value as boolean) ?? false);
  const tagsVal = $derived((value as string[]) ?? []);
  const multiVal = $derived((value as (string | number)[]) ?? []);
  const imagesVal = $derived((value as string[]) ?? []);
  let jsonEditText = $state('');
  let jsonEditing = false;

  $effect(() => {
    if (jsonEditing) return;
    jsonEditText = typeof value === 'string' ? String(value) : JSON.stringify(value, null, 2);
  });

  function handleTagKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const input = e.target as HTMLInputElement;
      const tag = input.value.trim();
      if (tag) {
        onchange([...tagsVal, tag]);
        input.value = '';
      }
    }
  }

  function removeTag(index: number) {
    onchange(tagsVal.filter((_: string, i: number) => i !== index));
  }

  // Multiselect toggle
  function toggleMulti(optValue: string | number) {
    if (multiVal.includes(optValue)) {
      onchange(multiVal.filter((v: string | number) => v !== optValue));
    } else {
      onchange([...multiVal, optValue]);
    }
  }

  // Images management
  function addImage() {
    onchange([...imagesVal, '']);
  }

  function updateImage(index: number, url: string) {
    const next = [...imagesVal];
    next[index] = url;
    onchange(next);
  }

  function removeImage(index: number) {
    onchange(imagesVal.filter((_: string, i: number) => i !== index));
  }
</script>

<div
  class={cn(
    'space-y-1.5',
    isCompact && 'space-y-1 [&_[data-slot=input]]:h-8 [&_[data-slot=input]]:px-2.5 [&_[data-slot=input]]:py-1 [&_[data-slot=input]]:text-xs [&_[data-slot=select]]:h-8 [&_[data-slot=select]]:px-2.5 [&_[data-slot=select]]:py-1 [&_[data-slot=select]]:text-xs [&_[data-slot=textarea]]:min-h-16 [&_[data-slot=textarea]]:px-2.5 [&_[data-slot=textarea]]:py-1.5 [&_[data-slot=textarea]]:text-xs [&_[data-slot=button]]:h-8 [&_[data-slot=button]]:text-xs'
  )}
  data-svadmin-field
  data-svadmin-field-key={field.key}
  data-density={density}
>
  <Label for={field.key} id="label-{field.key}" data-svadmin-field-label>
    {field.label}
    {#if field.required}
      <span class="text-destructive">*</span>
    {/if}
  </Label>

  {#if children}
    {@render children()}

  {:else if field.type === 'array'}
    <input type="hidden" name={field.key} value={JSON.stringify(Array.isArray(value) ? value : [])} />
    <ArrayField {field} {value} {onchange} />

  {:else if field.type === 'text' || field.type === 'image'}
    <Input
      id={field.key}
      name={field.key}
      type="text"
      value={strVal}
      oninput={(e) => onchange((e.target as HTMLInputElement).value)}
      required={field.required}
      aria-invalid={invalid || undefined}
      aria-describedby={errorId}
      {disabled}
      placeholder={i18n.t('field.enterValue', { label: field.label })}
    />

  {:else if field.type === 'email'}
    <Input
      id={field.key}
      name={field.key}
      type="email"
      value={strVal}
      oninput={(e) => onchange((e.target as HTMLInputElement).value)}
      required={field.required}
      aria-invalid={invalid || undefined}
      aria-describedby={errorId}
      {disabled}
      placeholder="name@example.com"
    />

  {:else if field.type === 'url'}
    <Input
      id={field.key}
      name={field.key}
      type="url"
      value={strVal}
      oninput={(e) => onchange((e.target as HTMLInputElement).value)}
      required={field.required}
      aria-invalid={invalid || undefined}
      aria-describedby={errorId}
      {disabled}
      placeholder="https://"
    />

  {:else if field.type === 'phone'}
    <Input
      id={field.key}
      name={field.key}
      type="tel"
      value={strVal}
      oninput={(e) => onchange((e.target as HTMLInputElement).value)}
      required={field.required}
      aria-invalid={invalid || undefined}
      aria-describedby={errorId}
      {disabled}
      placeholder="+1 (555) 000-0000"
    />

  {:else if field.type === 'color'}
    <div class="flex items-center gap-3">
      <input
        id={field.key}
        name={field.key}
        type="color"
        value={strVal || '#000000'}
        oninput={(e) => onchange((e.target as HTMLInputElement).value)}
        class="h-10 w-14 cursor-pointer rounded-md border border-input bg-background p-1"
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={errorId}
      />
      <Input
        type="text"
        value={strVal}
        oninput={(e) => onchange((e.target as HTMLInputElement).value)}
        placeholder="#000000"
        class="max-w-32 font-mono text-sm"
        {disabled}
      />
      {#if strVal}
        <span
          class="h-8 w-8 rounded-full border border-border shadow-sm"
          style="background-color: {strVal}"
        ></span>
      {/if}
    </div>

  {:else if field.type === 'number'}
    <Input
      id={field.key}
      name={field.key}
      type="number"
      value={numVal == null ? '' : String(numVal)}
      oninput={(e) => {
        const v = (e.target as HTMLInputElement).value;
        onchange(v === '' ? null : Number(v));
      }}
      required={field.required}
      aria-invalid={invalid || undefined}
      aria-describedby={errorId}
      {disabled}
    />

  {:else if field.type === 'richtext'}
    {@const EditorComp = getRichTextEditor()}
    {#if EditorComp}
      <input type="hidden" name={field.key} value={strVal} />
      <EditorComp
        id={field.key}
        value={strVal}
        placeholder={i18n.t('field.enterValue', { label: field.label })}
        preset="full"
        onchange={(html: string) => onchange(html)}
        aria-invalid={invalid || undefined}
        aria-describedby={errorId}
        {disabled}
      />
    {:else}
      <Textarea
        id={field.key}
        name={field.key}
        value={strVal}
        oninput={(e) => onchange((e.target as HTMLTextAreaElement).value)}
        required={field.required}
        aria-invalid={invalid || undefined}
        aria-describedby={errorId}
        {disabled}
        rows={10}
        placeholder={i18n.t('field.enterValue', { label: field.label })}
        class="resize-y"
      />
    {/if}

  {:else if field.type === 'textarea'}
    <Textarea
      id={field.key}
      name={field.key}
      value={strVal}
      oninput={(e) => onchange((e.target as HTMLTextAreaElement).value)}
      required={field.required}
      aria-invalid={invalid || undefined}
      aria-describedby={errorId}
      {disabled}
      rows={4}
      placeholder={i18n.t('field.enterValue', { label: field.label })}
      class="resize-y"
    />

  {:else if field.type === 'tree-select' || field.type === 'treeselect'}
    <TreeSelect
      options={(field.treeOptions ?? field.options ?? []) as TreeSelectOption[]}
      value={value as any}
      multiple={field.multiple}
      disabled={disabled}
      placeholder={i18n.t('field.selectPlaceholder')}
      onchange={(v) => onchange(v)}
    />

  {:else if field.type === 'cascader'}
    <Cascader
      options={(field.cascaderOptions ?? field.options ?? []) as CascaderOption[]}
      value={value as (string | number)[]}
      separator={field.separator}
      changeOnSelect={field.changeOnSelect}
      disabled={disabled}
      placeholder={i18n.t('field.selectPlaceholder')}
      onchange={(v) => onchange(v)}
    />

  {:else if field.type === 'transfer'}
    <Transfer
      dataSource={(field.transferData ?? field.options?.map(o => ({ key: o.value, title: o.label })) ?? []) as TransferItem[]}
      targetKeys={(value as (string | number)[]) ?? []}
      disabled={disabled}
      onchange={(next) => onchange(next)}
    />

  {:else if field.type === 'relation' && field.resource}
    <input type="hidden" name={field.key} value={value == null ? '' : String(value)} />
    <ComboboxField
      id={field.key}
      resource={field.resource}
      value={value as string | number | null}
      onchange={(v) => onchange(v)}
      optionLabel={field.optionLabel ?? 'title'}
      optionValue={field.optionValue ?? 'id'}
      placeholder={i18n.t('field.selectPlaceholder')}
      aria-invalid={invalid || undefined}
      aria-describedby={errorId}
      {disabled}
    />

  {:else if field.type === 'select'}
    {#if (field.options?.length ?? 0) > 8}
      <select
        id={field.key}
        name={field.key}
        data-slot="select"
        class="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        value={strVal}
        onchange={(e) => onchange((e.target as HTMLSelectElement).value)}
        required={field.required}
        aria-invalid={invalid || undefined}
        aria-describedby={errorId}
        disabled={disabled}
      >
        <option value="">{i18n.t('field.selectPlaceholder')}</option>
        {#each field.options ?? [] as opt, _i (_i)}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
    {:else}
      <Select
        id={field.key}
        name={field.key}
        value={strVal}
        onchange={(e) => onchange((e.target as HTMLSelectElement).value)}
        required={field.required}
        aria-invalid={invalid || undefined}
        aria-describedby={errorId}
        {disabled}
        placeholder={i18n.t('field.selectPlaceholder')}
      >
        {#each field.options ?? [] as opt, _i (_i)}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </Select>
    {/if}

  {:else if field.type === 'multiselect'}
    {#each multiVal as selectedValue, selectedIndex (`${selectedValue}-${selectedIndex}`)}
      <input type="hidden" name={`${field.key}[]`} value={String(selectedValue)} />
    {/each}
    <div 
      class="space-y-2 rounded-lg border border-input p-3 max-h-48 overflow-y-auto"
      role="group" 
      aria-labelledby="label-{field.key}"
      aria-describedby={errorId}
      data-invalid={invalid || undefined}
    >
      {#each field.options ?? [] as opt, _i (_i)}
        <label class="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 transition-colors">
          <Checkbox
            id={`${field.key}-${opt.value}`}
            checked={multiVal.includes(opt.value)}
            onCheckedChange={() => toggleMulti(opt.value)}
            aria-invalid={invalid || undefined}
            aria-describedby={errorId}
            disabled={disabled}
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
            <button type="button" onclick={() => toggleMulti(v)} class="ml-0.5 rounded-sm hover:text-destructive hover:bg-destructive/10 transition-colors" aria-label={i18n.t('common.clear')}>×</button>
          </Badge>
        {/each}
      </div>
    {/if}

  {:else if field.type === 'boolean'}
    <input type="hidden" name={field.key} value={String(boolVal)} />
    <div class="flex items-center gap-2 pt-1">
      <Switch
        id={field.key}
        checked={boolVal}
        onCheckedChange={(v) => onchange(v)}
        aria-invalid={invalid || undefined}
        aria-describedby={errorId}
        disabled={disabled}
      />
      <span class="text-sm text-muted-foreground">{boolVal ? i18n.t('common.yes') : i18n.t('common.no')}</span>
    </div>

  {:else if field.type === 'tags'}
    {#each tagsVal as tag, tagIndex (`${tag}-${tagIndex}`)}
      <input type="hidden" name={`${field.key}[]`} value={tag} />
    {/each}
    <div class="space-y-2">
      <div class="flex flex-wrap gap-1.5">
        {#each tagsVal as tag, i (i)}
          <Badge variant="secondary" class="gap-1">
            {tag}
            <button
              type="button"
              onclick={() => removeTag(i)}
              class="ml-0.5 rounded-sm hover:text-destructive hover:bg-destructive/10 transition-colors"
              aria-label={i18n.t('common.clear')}
            >×</button>
          </Badge>
        {/each}
      </div>
      <Input
        id={field.key}
        type="text"
        placeholder={i18n.t('field.tagsPlaceholder')}
        onkeydown={handleTagKeydown}
        aria-invalid={invalid || undefined}
        aria-describedby={errorId}
        {disabled}
      />
    </div>

  {:else if field.type === 'date'}
    <Input
      id={field.key}
      name={field.key}
      type="date"
      value={strVal}
      oninput={(e) => onchange((e.target as HTMLInputElement).value)}
      required={field.required}
      aria-invalid={invalid || undefined}
      aria-describedby={errorId}
      {disabled}
    />

  {:else if field.type === 'images'}
    {#each imagesVal as url, imageIndex (imageIndex)}
      <input type="hidden" name={`${field.key}[]`} value={url} />
    {/each}
    <div class="space-y-2">
      {#each imagesVal as url, i (i)}
        <div class="flex items-center gap-2">
          <Input
            id={i === 0 ? field.key : undefined}
            type="text"
            value={url}
            oninput={(e) => updateImage(i, (e.target as HTMLInputElement).value)}
            placeholder="https://example.com/image.jpg"
            class="flex-1"
            aria-invalid={invalid || undefined}
            aria-describedby={errorId}
            {disabled}
          />
          {#if url}
            <div class="size-9 shrink-0"><MediaThumbnail src={url} alt="preview" size="full" fit="cover" showOverlay={false} /></div>
          {/if}
          <TooltipButton tooltip={i18n.t('common.removeImage')} variant="ghost" size="icon" class="h-8 w-8 shrink-0" onclick={() => removeImage(i)}>
            <X class="h-3.5 w-3.5" />
          </TooltipButton>
        </div>
      {/each}
      <Button variant="outline" size="sm" type="button" onclick={addImage}>
        <Plus class="h-3.5 w-3.5 mr-1" /> {i18n.t('field.addImage')}
      </Button>
    </div>

  {:else if field.type === 'json'}
    <Textarea
      id={field.key}
      name={field.key}
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
      aria-describedby={errorId}
      rows={6}
      class="resize-y font-mono text-xs"
    />

  {:else}
    <Input
      id={field.key}
      name={field.key}
      type="text"
      value={strVal}
      oninput={(e) => onchange((e.target as HTMLInputElement).value)}
      aria-invalid={invalid || undefined}
      aria-describedby={errorId}
      {disabled}
    />
  {/if}
</div>
