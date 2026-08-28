<script lang="ts">
  import type { FieldDefinition } from '@svadmin/core';
  import { t } from '@svadmin/core/i18n';

  export interface TreeSelectOption {
    value: string | number;
    label: string;
    children?: TreeSelectOption[];
    disabled?: boolean;
  }

  interface Props {
    field?: FieldDefinition;
    name?: string;
    label?: string;
    value?: string | number | (string | number)[];
    options?: TreeSelectOption[];
    multiple?: boolean;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    error?: string[];
    mode?: 'show' | 'edit' | 'create';
  }

  let {
    field,
    name = field?.key ?? 'treeSelect',
    label = field?.label,
    value,
    options = [],
    multiple = false,
    placeholder,
    disabled = false,
    required = field?.required ?? false,
    error = [],
    mode = 'show',
  }: Props = $props();

  const hasError = $derived(error.length > 0);

  interface FlatTreeOption {
    value: string | number;
    label: string;
    level: number;
    disabled?: boolean;
  }

  function flattenTree(nodes: TreeSelectOption[], level = 0): FlatTreeOption[] {
    const list: FlatTreeOption[] = [];
    for (const node of nodes) {
      list.push({
        value: node.value,
        label: node.label,
        level,
        disabled: node.disabled,
      });
      if (node.children && node.children.length > 0) {
        list.push(...flattenTree(node.children, level + 1));
      }
    }
    return list;
  }

  const flattenedOptions = $derived(flattenTree(options));

  function getIndentPrefix(level: number): string {
    if (level === 0) return '';
    return '　'.repeat(level) + '├─ ';
  }

  function formatDisplay(v: unknown): string {
    if (v == null || v === '') return '—';
    const values = Array.isArray(v) ? v.map(String) : [String(v)];
    const labels = values.map((val) => {
      const match = flattenedOptions.find((o) => String(o.value) === val);
      return match ? match.label : val;
    });
    return labels.join(', ');
  }

  const selectedValues = $derived(
    Array.isArray(value) ? value.map(String) : value != null ? [String(value)] : []
  );
</script>

{#if mode === 'show'}
  <span class="lite-badge">{formatDisplay(value)}</span>
{:else}
  <div class="lite-form-group">
    {#if label}
      <label class="lite-label" for={name}>
        {label}
        {#if required}<span class="required">*</span>{/if}
      </label>
    {/if}
    {#if multiple}
      <select
        id={name}
        name="{name}[]"
        multiple
        class="lite-select lite-select-multiple {hasError ? 'lite-input-error' : ''}"
        {disabled}
        {required}
        size={Math.min(8, Math.max(4, flattenedOptions.length + 1))}
      >
        {#each flattenedOptions as opt (opt.value)}
          <option
            value={String(opt.value)}
            disabled={opt.disabled}
            selected={selectedValues.includes(String(opt.value))}
          >
            {getIndentPrefix(opt.level)}{opt.label}
          </option>
        {/each}
      </select>
    {:else}
      <select
        id={name}
        {name}
        class="lite-select {hasError ? 'lite-input-error' : ''}"
        {disabled}
        {required}
      >
        <option value="">-- {placeholder || t('common.select') || 'Select'} --</option>
        {#each flattenedOptions as opt (opt.value)}
          <option
            value={String(opt.value)}
            disabled={opt.disabled}
            selected={selectedValues.includes(String(opt.value))}
          >
            {getIndentPrefix(opt.level)}{opt.label}
          </option>
        {/each}
      </select>
    {/if}
    {#if hasError}
      {#each error as err, i (i)}
        <div class="lite-error-text">{err}</div>
      {/each}
    {/if}
  </div>
{/if}
