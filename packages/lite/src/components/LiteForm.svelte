<script lang="ts">
  /**
   * LiteForm — Server-rendered form driven by FieldDefinitions.
   * Uses a native <form> with method="POST" for no-JavaScript submission.
   * Uses the generated TypeBox schema for server-side validation.
   */
  import type { FieldDefinition, ResourceDefinition } from '@svadmin/core';
  import { t } from '@svadmin/core/i18n';
  import { fieldToInputType, fieldToPlaceholder } from '../schema-generator';
  import { isExplicitBooleanTrue } from '../value-normalization';
  import LiteArrayField from './LiteArrayField.svelte';

  interface Props {
    fields: FieldDefinition[];
    /** Resource definition (used for primaryKey) */
    resource?: ResourceDefinition;
    /** Existing values (for edit mode) */
    values?: Record<string, unknown>;
    /** Validation errors from server */
    errors?: Record<string, string[]>;
    /** 'create' or 'edit' */
    mode?: 'create' | 'edit';
    /** Form action URL */
    action?: string;
    /** Submit button label */
    submitLabel?: string;
    /** Cancel URL */
    cancelUrl?: string;
  }

  let {
    fields,
    resource,
    values = {},
    errors = {},
    mode = 'create',
    action = '',
    submitLabel,
    cancelUrl,
  }: Props = $props();

  const formFields = $derived(
    fields.filter(f => {
      if (f.key === (resource?.primaryKey ?? 'id')) return false;
      if (f.showInForm === false) return false;
      if (mode === 'create' && f.showInCreate === false) return false;
      if (mode === 'edit' && f.showInEdit === false) return false;
      return true;
    })
  );

  function hasExistingUpload(value: unknown): boolean {
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.some(hasExistingUpload);
    return typeof File !== 'undefined'
      && value instanceof File
      && value.size > 0
      && value.name !== '';
  }

  function fieldValue(field: FieldDefinition): unknown {
    const value = Object.prototype.hasOwnProperty.call(values, field.key)
      ? values[field.key]
      : field.defaultValue;
    if (field.type === 'relation' && typeof value === 'object' && value !== null) {
      return (value as Record<string, unknown>)[field.optionValue ?? 'id'];
    }
    return value;
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
    return String(value ?? '');
  }

</script>

<form method="POST" action={action || undefined} class="lite-card" enctype="multipart/form-data">
  {#if mode === 'edit'}
    {@const pk = resource?.primaryKey ?? 'id'}
    {#if values[pk] != null}
      <input type="hidden" name="_id" value={String(values[pk])} />
    {/if}
  {/if}

  {#each formFields as field, _i (_i)}
    {@const inputType = fieldToInputType(field)}
    {@const placeholder = fieldToPlaceholder(field)}
    {@const value = fieldValue(field)}
    {@const fieldErrors = errors[field.key]}
    {@const hasError = fieldErrors && fieldErrors.length > 0}

    <div class="lite-form-group">
      {#if field.type === 'array'}
        <LiteArrayField
          {field}
          {mode}
          values={Array.isArray(value)
            ? value.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
            : []}
        />
      {:else if inputType === 'checkbox'}
        <div class="lite-checkbox-group">
          <input
            type="checkbox"
            name={field.key}
            id={field.key}
            checked={isExplicitBooleanTrue(value)}
          />
          <label for={field.key}>{field.label}</label>
        </div>
      {:else}
        <label for={field.key}>
          {field.label}
          {#if field.required}<span class="required">*</span>{/if}
        </label>

        {#if inputType === 'textarea'}
          <textarea
            name={field.key}
            id={field.key}
            class="lite-input {hasError ? 'lite-input-error' : ''}"
            placeholder={placeholder}
            required={field.required}
          >{textareaValue(field, value)}</textarea>
        {:else if inputType === 'select'}
          <select
            name={field.key}
            id={field.key}
            class="lite-select {hasError ? 'lite-input-error' : ''}"
            required={field.required}
            value={field.type === 'multiselect' ? undefined : String(value ?? '')}
            {...field.type === 'multiselect' ? { multiple: true } : {}}
          >
            {#if field.type !== 'multiselect'}
              <option value="">-- {t('common.select') || 'Select'} --</option>
            {/if}
            {#if field.options}
              {#each field.options as opt, _i (_i)}
                <option
                  value={String(opt.value)}
                  selected={field.type === 'multiselect'
                    ? Array.isArray(value) && value.map(String).includes(String(opt.value))
                    : undefined}
                >
                  {opt.label}
                </option>
              {/each}
            {/if}
          </select>
        {:else if inputType === 'file'}
          <input
            type="file"
            name={field.key}
            id={field.key}
            class="lite-input {hasError ? 'lite-input-error' : ''}"
            required={field.required && (mode === 'create' || !hasExistingUpload(value))}
            multiple={field.type === 'images'}
          />
        {:else}
          <input
            type={inputType}
            name={field.key}
            id={field.key}
            value={String(value ?? '')}
            class="lite-input {hasError ? 'lite-input-error' : ''}"
            placeholder={placeholder}
            {... field.required ? { required: true } : {}}
          />
        {/if}

      {/if}

      {#if hasError}
        {#each fieldErrors as err (err)}
          <div class="lite-error-text">{err}</div>
        {/each}
      {/if}
    </div>
  {/each}

  <div style="display:flex;align-items:center;margin-top:20px;">
    <button type="submit" class="lite-btn lite-btn-primary">{submitLabel || t('common.save') || 'Save'}</button>
    {#if cancelUrl}
      <a href={cancelUrl} class="lite-btn" style="margin-left:8px;">{t('common.cancel') || 'Cancel'}</a>
    {/if}
  </div>
</form>
