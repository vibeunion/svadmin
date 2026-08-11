<script lang="ts">
  import type { FieldDefinition } from '@svadmin/core';
  import { fieldToInputType, fieldToPlaceholder } from '../schema-generator';
  import { isExplicitBooleanTrue } from '../value-normalization';

  interface Props {
    subFields: FieldDefinition[];
    item: Record<string, unknown>;
    namePrefix: string;
    index: number | string;
    /** Empty optional-array placeholder that remains server-submittable without JS. */
    isDraft?: boolean;
    mode?: 'create' | 'edit';
  }

  let { subFields, item, namePrefix, index, isDraft = false, mode = 'create' }: Props = $props();

  function fieldName(key: string): string {
    return `${namePrefix}[${index}][${key}]`;
  }

  function fieldId(key: string): string {
    return `${namePrefix}_${index}_${key}`;
  }

  function displayValue(value: unknown): string {
    if (value == null) return '';
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return '';
      }
    }
    return String(value);
  }

  function retainedUploadReferences(value: unknown): string[] {
    if (typeof value === 'string') return value.trim() ? [value] : [];
    if (Array.isArray(value)) return value.flatMap(retainedUploadReferences);
    return [];
  }

  function controlValue(field: FieldDefinition, value: unknown): unknown {
    const resolvedValue = value === undefined ? field.defaultValue : value;
    if (field.type === 'relation' && typeof resolvedValue === 'object' && resolvedValue !== null) {
      return (resolvedValue as Record<string, unknown>)[field.optionValue ?? 'id'];
    }
    return resolvedValue;
  }

  function textareaValue(field: FieldDefinition, value: unknown): string {
    if (field.type === 'images' && Array.isArray(value)) return value.map(String).join('\n');
    if (field.type === 'json' && typeof value !== 'string' && value != null) {
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return String(value);
      }
    }
    return displayValue(value);
  }
</script>

<div
  class="lite-array-item"
  data-lite-array-item
  data-lite-array-draft={isDraft ? '' : undefined}
>
  <input type="hidden" name={fieldName('_present')} value="1" />
  <div class="lite-array-item-header">
    <span class="lite-array-item-number">#{typeof index === 'number' ? index + 1 : ''}</span>
    {#if !isDraft}
      <button
        type="submit"
        name={fieldName('_delete')}
        value="1"
        formnovalidate
        class="lite-btn lite-btn-sm lite-array-remove-nojs"
      >
        Remove item
      </button>
    {/if}
    <button type="button" class="lite-btn lite-btn-sm lite-array-remove" data-lite-array-remove hidden>
      Remove
    </button>
  </div>

  {#each subFields as sub (sub.key)}
    {@const value = controlValue(sub, item[sub.key])}
    <div class="lite-array-subfield">
      <label for={fieldId(sub.key)}>
        {sub.label}
        {#if sub.required}<span class="required">*</span>{/if}
      </label>
      {#if sub.type === 'textarea' || sub.type === 'richtext' || sub.type === 'markdown' || sub.type === 'images' || sub.type === 'json'}
        <textarea
          id={fieldId(sub.key)}
          name={fieldName(sub.key)}
          class="lite-input"
          rows="3"
          required={sub.required && !isDraft}
          placeholder={fieldToPlaceholder(sub)}
        >{textareaValue(sub, value)}</textarea>
      {:else if sub.type === 'boolean'}
        <div class="lite-checkbox-group">
          <input
            id={fieldId(sub.key)}
            name={fieldName(sub.key)}
            type="checkbox"
            value="1"
            checked={isExplicitBooleanTrue(value)}
          />
          <label for={fieldId(sub.key)}>{sub.label}</label>
        </div>
      {:else if (sub.type === 'select' || sub.type === 'multiselect' || sub.type === 'relation') && sub.options}
        <select
          id={fieldId(sub.key)}
          name={fieldName(sub.key)}
          class="lite-select"
          required={sub.required && !isDraft}
          multiple={sub.type === 'multiselect'}
          value={sub.type === 'multiselect' ? undefined : String(value ?? '')}
        >
          {#if sub.type !== 'multiselect'}
            <option value="">-- Select --</option>
          {/if}
          {#each sub.options as opt (opt.value)}
            <option
              value={String(opt.value)}
              selected={sub.type === 'multiselect'
                ? Array.isArray(value) && value.map(String).includes(String(opt.value))
                : undefined}
            >
              {opt.label}
            </option>
          {/each}
        </select>
      {:else if sub.type === 'file'}
        {#if mode === 'edit'}
          {#each retainedUploadReferences(item[sub.key]) as reference, referenceIndex (`${reference}:${referenceIndex}`)}
            <input type="hidden" name={fieldName(sub.key)} value={reference} />
          {/each}
        {/if}
        <input
          id={fieldId(sub.key)}
          name={fieldName(sub.key)}
          type="file"
          class="lite-input"
          required={sub.required
            && !isDraft
            && (mode === 'create' || retainedUploadReferences(item[sub.key]).length === 0)}
        />
      {:else}
        <input
          id={fieldId(sub.key)}
          name={fieldName(sub.key)}
          type={fieldToInputType(sub)}
          value={displayValue(value)}
          class="lite-input"
          required={sub.required && !isDraft}
          placeholder={fieldToPlaceholder(sub)}
        />
      {/if}
    </div>
  {/each}
</div>
