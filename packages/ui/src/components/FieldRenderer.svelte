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
    'svadmin-u-5a2508227c6a',
    isCompact && 'svadmin-u-da7c36cd8867 svadmin-u-01e043b9ca05 svadmin-u-5e375759a547 svadmin-u-0144d38a6921 svadmin-u-910198b850a8 svadmin-u-220cd47c030c svadmin-u-84a68a4bfa38 svadmin-u-2b201b2c12c7 svadmin-u-334c9da7fe2b svadmin-u-f7194f86de09 svadmin-u-a281d7e98ab9 svadmin-u-6cddb40447d9 svadmin-u-150c3670da1d svadmin-u-f01a063e8052 svadmin-u-3e2aa4ec6454'
  )}
  data-svadmin-field
  data-svadmin-field-key={field.key}
  data-density={density}
>
  <Label for={field.key} id="label-{field.key}" data-svadmin-field-label>
    {field.label}
    {#if field.required}
      <span class="svadmin-u-811148b13d1e">*</span>
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
    <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-1004c0c3954c">
      <input
        id={field.key}
        name={field.key}
        type="color"
        value={strVal || '#000000'}
        oninput={(e) => onchange((e.target as HTMLInputElement).value)}
        class="svadmin-u-426b8b75185b svadmin-u-7e74e5fe798a svadmin-u-34516836730d svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-e5795dad4d22 svadmin-u-e6f9e383a762 svadmin-u-eb6a3cef9686"
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={errorId}
      />
      <Input
        type="text"
        value={strVal}
        oninput={(e) => onchange((e.target as HTMLInputElement).value)}
        placeholder="#000000"
        class="svadmin-u-1d274d2422d8 svadmin-u-0e65706bcccd svadmin-u-fc7473ca09eb"
        {disabled}
      />
      {#if strVal}
        <span
          class="svadmin-u-ed8a5df7b2fb svadmin-u-2bbcfc3b5179 svadmin-u-ac204c108886 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-438b2237b8d6"
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
        class="svadmin-u-5bd7b080992c"
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
      class="svadmin-u-5bd7b080992c"
    />

  {:else if field.type === 'tree-select' || field.type === 'treeselect'}
    <TreeSelect
      options={(field.treeOptions ?? field.options ?? []) as TreeSelectOption[]}
      value={value as string | number | (string | number)[] | undefined}
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
      dataSource={(field.transferData ?? field.options?.map((o: { label: string; value: string | number }) => ({ key: o.value, title: o.label })) ?? []) as TransferItem[]}
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
        class="svadmin-u-60fbb7713999 svadmin-u-426b8b75185b svadmin-u-6da6a3c3f741 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-e5795dad4d22 svadmin-u-e6f9e383a762 svadmin-u-0e17f2bd9074 svadmin-u-03b4dd7f172b svadmin-u-fc7473ca09eb svadmin-u-582e6ef4b245 svadmin-u-9c24ab70af61 svadmin-u-55d048ebfb1c svadmin-u-608dd26cd5ba svadmin-u-80b9d0ae125f svadmin-u-6b22a22a9752 svadmin-u-5f533b3a7de7 svadmin-u-b29d8adbad2e"
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
      class="svadmin-u-6f7e013d6499 svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-e5795dad4d22 svadmin-u-eb6e8b881acd svadmin-u-558f64349245 svadmin-u-92bf82f493b1"
      role="group" 
      aria-labelledby="label-{field.key}"
      aria-describedby={errorId}
      data-invalid={invalid || undefined}
    >
      {#each field.options ?? [] as opt, _i (_i)}
        <label class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-fc7473ca09eb svadmin-u-34516836730d svadmin-u-39f703dbe296 svadmin-u-07389a777c1f svadmin-u-d8e0e382c67b svadmin-u-465609a240a8 svadmin-u-ceb69a6b0e5f">
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
        <p class="svadmin-u-359090c2d529 svadmin-u-bfa603190748">{i18n.t('field.noOptions')}</p>
      {/if}
    </div>
    {#if multiVal.length > 0}
      <div class="svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-44ee8ba0a421 svadmin-u-b6b02c0ebef6">
        {#each multiVal as v, _i (_i)}
          {@const label = field.options?.find((o: { label: string; value: string | number }) => o.value === v)?.label ?? String(v)}
          <Badge variant="secondary" class="svadmin-u-44ee8ba0a421">
            {label}
            <button type="button" onclick={() => toggleMulti(v)} class="svadmin-u-b45ce4b65d53 svadmin-u-36d4469299aa svadmin-u-51e95020d6f2 svadmin-u-8db899b4e072 svadmin-u-ceb69a6b0e5f" aria-label={i18n.t('common.clear')}>×</button>
          </Badge>
        {/each}
      </div>
    {/if}

  {:else if field.type === 'boolean'}
    <input type="hidden" name={field.key} value={String(boolVal)} />
    <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-6b7d6e21ccbd">
      <Switch
        id={field.key}
        checked={boolVal}
        onCheckedChange={(v) => onchange(v)}
        aria-invalid={invalid || undefined}
        aria-describedby={errorId}
        disabled={disabled}
      />
      <span class="svadmin-u-fc7473ca09eb svadmin-u-bfa603190748">{boolVal ? i18n.t('common.yes') : i18n.t('common.no')}</span>
    </div>

  {:else if field.type === 'tags'}
    {#each tagsVal as tag, tagIndex (`${tag}-${tagIndex}`)}
      <input type="hidden" name={`${field.key}[]`} value={tag} />
    {/each}
    <div class="svadmin-u-6f7e013d6499">
      <div class="svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-58284b4ea568">
        {#each tagsVal as tag, i (i)}
          <Badge variant="secondary" class="svadmin-u-44ee8ba0a421">
            {tag}
            <button
              type="button"
              onclick={() => removeTag(i)}
              class="svadmin-u-b45ce4b65d53 svadmin-u-36d4469299aa svadmin-u-51e95020d6f2 svadmin-u-8db899b4e072 svadmin-u-ceb69a6b0e5f"
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
    <div class="svadmin-u-6f7e013d6499">
      {#each imagesVal as url, i (i)}
        <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4">
          <Input
            id={i === 0 ? field.key : undefined}
            type="text"
            value={url}
            oninput={(e) => updateImage(i, (e.target as HTMLInputElement).value)}
            placeholder="https://example.com/image.jpg"
            class="svadmin-u-36e579c0b41c"
            aria-invalid={invalid || undefined}
            aria-describedby={errorId}
            {disabled}
          />
          {#if url}
            <div class="svadmin-u-665f07fe73cc svadmin-u-012fbd121f37"><MediaThumbnail src={url} alt="preview" size="full" fit="cover" showOverlay={false} /></div>
          {/if}
          <TooltipButton tooltip={i18n.t('common.removeImage')} variant="ghost" size="icon" class="svadmin-u-ed8a5df7b2fb svadmin-u-2bbcfc3b5179 svadmin-u-012fbd121f37" onclick={() => removeImage(i)}>
            <X class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
          </TooltipButton>
        </div>
      {/each}
      <Button variant="outline" size="sm" type="button" onclick={addImage}>
        <Plus class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-618162408e7a" /> {i18n.t('field.addImage')}
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
      class="svadmin-u-5bd7b080992c svadmin-u-0e65706bcccd svadmin-u-359090c2d529"
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
