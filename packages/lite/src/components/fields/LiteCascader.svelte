<script lang="ts">
  import type { FieldDefinition } from '@svadmin/core';
  import { t } from '@svadmin/core/i18n';

  export interface CascaderOption {
    value: string | number;
    label: string;
    children?: CascaderOption[];
    disabled?: boolean;
    isLeaf?: boolean;
  }

  interface Props {
    field?: FieldDefinition;
    name?: string;
    label?: string;
    value?: (string | number)[];
    options?: CascaderOption[];
    separator?: string;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    error?: string[];
    mode?: 'show' | 'edit' | 'create';
  }

  let {
    field,
    name = field?.key ?? 'cascader',
    label = field?.label,
    value = [],
    options = [],
    separator = ' / ',
    placeholder,
    disabled = false,
    required = field?.required ?? false,
    error = [],
    mode = 'show',
  }: Props = $props();

  const hasError = $derived(error.length > 0);

  interface FlatPathOption {
    pathValue: string;
    pathLabels: string[];
    disabled?: boolean;
  }

  function generatePaths(
    nodes: CascaderOption[],
    currentValues: (string | number)[] = [],
    currentLabels: string[] = []
  ): FlatPathOption[] {
    const paths: FlatPathOption[] = [];
    for (const node of nodes) {
      const nextValues = [...currentValues, node.value];
      const nextLabels = [...currentLabels, node.label];

      if (node.children && node.children.length > 0) {
        paths.push(...generatePaths(node.children, nextValues, nextLabels));
      } else {
        paths.push({
          pathValue: nextValues.join('/'),
          pathLabels: nextLabels,
          disabled: node.disabled,
        });
      }
    }
    return paths;
  }

  const allPaths = $derived(generatePaths(options));
  const currentPathString = $derived(Array.isArray(value) ? value.join('/') : String(value ?? ''));

  function formatDisplay(v: (string | number)[]): string {
    if (!v || v.length === 0) return '—';
    const str = v.join('/');
    const matched = allPaths.find((p) => p.pathValue === str);
    if (matched) return matched.pathLabels.join(separator);
    return v.join(separator);
  }
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
    <select
      id={name}
      {name}
      class="lite-select {hasError ? 'lite-input-error' : ''}"
      {disabled}
      {required}
      value={currentPathString}
    >
      <option value="">-- {placeholder || t('common.select') || 'Select Path'} --</option>
      {#each allPaths as p (p.pathValue)}
        <option
          value={p.pathValue}
          disabled={p.disabled}
          selected={p.pathValue === currentPathString}
        >
          {p.pathLabels.join(separator)}
        </option>
      {/each}
    </select>
    {#if hasError}
      {#each error as err, i (i)}
        <div class="lite-error-text">{err}</div>
      {/each}
    {/if}
  </div>
{/if}
