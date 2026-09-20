<script lang="ts">
  import { assertSchemaFormSchema, isSchemaFormNodeVisible, prepareSchemaFormValue, type SchemaFormSchema as JsonSchema } from '@svadmin/core/schema-form';
  import { tick } from 'svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { Button } from './ui/button/index.js';
  import { Loader2, Plus, Trash2 } from '@lucide/svelte';
  import { cn } from '../utils.js';
  import { onDestroy, untrack } from 'svelte';
  import {
    initializeSchemaForm, schemaFormArrayItem, schemaFormEnumIndex,
    schemaFormEnumValue, schemaFormSnapshot, writeSchemaFormPath,
    type JsonSchemaFormSchema,
  } from './json-schema-form-state.js';

  interface Props {
    schema: JsonSchema;
    value?: Record<string, unknown>;
    onsubmit?: (data: Record<string, unknown>) => void | Promise<void>;
    submitText?: string;
    disabled?: boolean;
    readonly?: boolean;
    /** 只决定此实例文案；不修改全局语言。 */
    locale?: string;
    onerror?: (error: unknown) => void;
    onvalidationerror?: (issues: SchemaFormIssue[]) => void;
    /** Use a unique stable prefix when several schema forms share a page. */
    idPrefix?: string;
    class?: string;
  }

  let {
    schema,
    value = $bindable(undefined),
    onsubmit,
    submitText = 'Submit Form',
    disabled = false,
    readonly = false,
    locale,
    onerror,
    onvalidationerror,
    idPrefix,
    class: className = '',
  }: Props = $props();

  const i18n = useTranslation();
  const instanceId = $props.id();
  let isSubmitting = $state(false);
  let errors = $state<Record<string, string>>({});
  let submitFailed = $state(false);

  function cloneDefault(node: JsonSchema): unknown {
    if (node.default !== undefined) return structuredClone($state.snapshot(node.default));
    if (node.type === 'null') return null;
    if (node.type === 'object' || node.properties) {
      return Object.fromEntries(
        Object.entries(node.properties ?? {})
          .map(([key, child]) => [key, cloneDefault(child)])
          .filter(([, child]) => child !== undefined),
      );
    }
    if (node.type === 'array') return [];
    return undefined;
  }

  function mergeDefaults(node: JsonSchema, current: unknown, present: boolean, budget = { nodes: 0 }): unknown {
    if (++budget.nodes > 1000) throw new Error('Schema form data limit exceeded.');
    const candidate = present ? current : cloneDefault(node);
    if (candidate === null || (present && candidate === undefined)) return candidate;
    if (node.type === 'array') {
      if (Array.isArray(candidate) && candidate.length > 1000 - budget.nodes) throw new Error('Schema form data limit exceeded.');
      return Array.isArray(candidate)
        ? candidate.map(item => mergeDefaults(node.items ?? { type: 'string' }, item, true, budget))
        : candidate;
    }
    if (node.type !== 'object' && !node.properties) return candidate;
    if (candidate !== undefined && (typeof candidate !== 'object' || Array.isArray(candidate))) return candidate;
    const source = (candidate ?? {}) as Record<string, unknown>;
    const result: Record<string, unknown> = { ...source };
    for (const [key, child] of Object.entries(node.properties ?? {})) {
      const own = Object.hasOwn(source, key);
      const next = mergeDefaults(child, own ? source[key] : undefined, own, budget);
      if (next !== undefined || own) Object.defineProperty(result, key, { value: next, enumerable: true, configurable: true, writable: true });
    }
    return result;
  }

  const resolved = $derived.by(() => {
    try {
      assertSchemaFormSchema(schema);
      const next = mergeDefaults(schema, value, value !== undefined);
      return { invalid: false, data: next && typeof next === 'object' && !Array.isArray(next) ? next as Record<string, unknown> : {} };
    } catch {
      return { invalid: true, data: {} as Record<string, unknown> };
    }
  });
  const resolvedValue = $derived(resolved.data);

  function editable(): boolean {
    return !destroyed && !disabled && !readonly && !isSubmitting && prepared.ok
      && !formElement?.closest('fieldset[disabled]');
  }
  function nodeType(node: JsonSchema): string | undefined {
    return Array.isArray(node.type) ? node.type.find(type => type !== 'null') : node.type;
  }
  function choices(node: JsonSchema): JsonSchema['enum'] {
    return node.enum ?? (Object.hasOwn(node, 'const') ? [node.const ?? null] : undefined);
  }
  function pathReadonly(path: readonly string[]): boolean {
    let node: JsonSchema | undefined = schema;
    if (node.readOnly) return true;
    for (const key of path) {
      node = node && (nodeType(node) === 'array' ? node.items : node.properties?.[key]);
      if (node?.readOnly) return true;
    }
    return false;
  }
  function invalid(issues: SchemaFormIssue[]): void {
    failure = 'invalid';
    validationIssues = issues;
    try { onvalidationerror?.(issues); } catch { /* Observers do not authorize submission. */ }
  }
  function fieldInvalid(path: readonly string[]): boolean {
    return [...validationIssues, ...parseIssues].some(issue => issue.path === schemaFormPointer(path));
  }
  function writeNumber(path: string[], input: HTMLInputElement): void {
    if (!editable() || pathReadonly(path)) return;
    const pointer = schemaFormPointer(path);
    parseIssues = parseIssues.filter(issue => issue.path !== pointer);
    try {
      if (input.validity.badInput) throw new Error('Invalid numeric input');
      writePath(path, parseSchemaNumber(input.value));
    } catch {
      parseIssues = [...parseIssues, { path: pointer, code: 'invalid-value' }];
      invalid(parseIssues);
    }
  }
  function readPath(path: string[]): unknown {
    return path.reduce<unknown>((current, key) => (
      current && typeof current === 'object' && Object.hasOwn(current, key) ? (current as Record<string, unknown>)[key] : undefined
    ), resolvedValue);
  }

  function writePath(path: string[], nextValue: unknown): void {
    errors = {};
    submitFailed = false;
    const next = structuredClone($state.snapshot(resolvedValue));
    let target: Record<string, unknown> = next;
    for (const key of path.slice(0, -1)) {
      const child = Object.hasOwn(target, key) ? target[key] : undefined;
      const container = child && typeof child === 'object' ? child : {};
      Object.defineProperty(target, key, { value: container, enumerable: true, configurable: true, writable: true });
      target = container as Record<string, unknown>;
    }
    const lastKey = path[path.length - 1];
    if (lastKey !== undefined) Object.defineProperty(target, lastKey, { value: nextValue, enumerable: true, configurable: true, writable: true });
    value = next;
  }

  function enumToken(index: number): string {
    return `__json_enum_${index}`;
  }

  function enumIndex(current: unknown, options: JsonSchema['enum']): number {
    return options?.findIndex((option) => Object.is(option, current)) ?? -1;
  }

  function enumValue(raw: string, options: JsonSchema['enum']): unknown {
    if (!/^__json_enum_(0|[1-9]\d*)$/.test(raw)) return undefined;
    const index = Number(raw.slice('__json_enum_'.length));
    return Number.isSafeInteger(index) ? options?.[index] : undefined;
  }
  function addArrayItem(path: string[], itemSchema: JsonSchema): void {
    if (!editable()) return;
    const current = readPath(path);
    const items = Array.isArray(current) ? current : [];
    const item = cloneDefault(itemSchema);
    writePath(path, [...items, item === undefined ? (itemSchema.type === 'object' ? {} : '') : item]);
  }
  function removeArrayItem(path: string[], index: number): void {
    if (!editable()) return;
    const current = readPath(path);
    if (!Array.isArray(current) || !Number.isSafeInteger(index) || index < 0 || index >= current.length) return;
    const prefix = schemaFormPointer(path) + '/';
    const nextIssues = parseIssues.flatMap(issue => {
      if (!issue.path.startsWith(prefix)) return [issue];
      const tail = issue.path.slice(prefix.length);
      const separator = tail.indexOf('/');
      const segment = separator < 0 ? tail : tail.slice(0, separator);
      if (!/^(0|[1-9][0-9]*)$/u.test(segment)) return [issue];
      const itemIndex = Number(segment);
      if (itemIndex === index) return [];
      if (itemIndex < index) return [issue];
      return [{ ...issue, path: prefix + String(itemIndex - 1) + (separator < 0 ? '' : tail.slice(separator)) }];
    });
    // Retire only the removed item's error and shift surviving descendants with their
    // array item. A rejected readonly/disabled write must not clear any error.
    if (writePath(path, current.filter((_, itemIndex) => itemIndex !== index))) parseIssues = nextIssues;
  }
  async function handleSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (isSubmitting || resolved.invalid) return;
    isSubmitting = true;
    submitFailed = false;
    try {
      const submitted = structuredClone($state.snapshot(resolvedValue));
      const prepared = prepareSchemaFormValue(schema, submitted);
      errors = Object.fromEntries(prepared.errors.map(error => [error.path, error.code]));
      if (prepared.errors.length > 0) {
        const form = event.currentTarget;
        await tick();
        if (form instanceof HTMLFormElement) form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
        return;
      }
      value = structuredClone(submitted);
      await onsubmit?.(prepared.data);
    } catch {
      submitFailed = true;
    } finally {
      if (!destroyed) isSubmitting = false;
    }
  }

</script>

<form
  novalidate
  data-testid="json-schema-form"
  bind:this={formElement}
  aria-busy={isSubmitting}
  onsubmit={handleSubmit}
  novalidate
  class={cn('svadmin-u-3e7ce58d64fa svadmin-u-a217b4eaa918 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-cd0ad9a56558 svadmin-u-0478c89a150f svadmin-u-cef5b893cf23 svadmin-u-359090c2d529', className)}
>
  {#if resolved.invalid || submitFailed || Object.keys(errors).length > 0}
    <p role="alert">{i18n.t(resolved.invalid || submitFailed ? 'common.operationFailed' : 'validation.invalidFormat')}</p>
  {/if}
  {#if schema.title}
    <div class="svadmin-u-f4cc511ff0c1 svadmin-u-65fdbade2025 svadmin-u-05faf5c801ff">
      <h3 class="svadmin-u-fc7473ca09eb svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{schema.title}</h3>
      {#if schema.description}<p class="svadmin-u-359090c2d529 svadmin-u-bfa603190748 svadmin-u-15e1b1f444fe">{schema.description}</p>{/if}
    </div>
  {/if}

  {#if !prepared.ok || failure}
    <p role="alert" data-testid="schema-form-errors">{labels[!prepared.ok ? 'invalid' : failure ?? 'invalid']}</p>
  {/if}

  {#snippet renderField(node: JsonSchema, path: string[], title: string, required = false)}
    {@const current = readPath(path)}
    {@const id = `${instanceId}-${encodeURIComponent(JSON.stringify(path))}`}
    {@const error = errors[JSON.stringify(path)]}
    {#if !isSchemaFormNodeVisible(node, resolvedValue)}
      <!-- 隐藏字段保留草稿，但不进入提交数据。 -->
    {:else if node.type === 'object' || node.properties}
      <fieldset class="svadmin-u-da7c36cd8867 svadmin-u-421ac2be5045">
        <legend class="svadmin-u-0214b4b355d1 svadmin-u-2689f3958069">{title}</legend>
        {#if error}<p id={`${id}-error`}>{i18n.t('validation.invalidFormat')}</p>{/if}
        {#if node.description}<p class="svadmin-u-d058ca6de60f svadmin-u-bfa603190748">{node.description}</p>{/if}
        <div class="svadmin-u-9c6cdfa2ba3d">
          {#each Object.entries(node.properties ?? {}) as [key, child] (key)}
            {@render renderField(child, [...path, key], child.title ?? key, node.required?.includes(key) ?? false)}
          {/each}
        </div>
      </fieldset>
    {:else if type === 'array'}
      {@const items = Array.isArray(current) ? current : []}
      <fieldset class="svadmin-u-da7c36cd8867 svadmin-u-421ac2be5045">
        <legend class="svadmin-u-0214b4b355d1 svadmin-u-2689f3958069">{title}</legend>
        {#if error}<p id={`${id}-error`}>{i18n.t('validation.invalidFormat')}</p>{/if}
        {#if node.description}<p class="svadmin-u-d058ca6de60f svadmin-u-bfa603190748">{node.description}</p>{/if}
        {#each items as _, index (index)}
          {@render renderField(node.items ?? { type: 'string' }, [...path, String(index)], `${title} ${index + 1}`)}
          <Button type="button" variant="ghost" size="sm" disabled={node.minItems !== undefined && items.length <= node.minItems} onclick={() => removeArrayItem(path, index)}>
            <Trash2 class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" /> 删除
          </Button>
        {:else}
          <span class="svadmin-u-bfa603190748">{labels.empty}</span>
        {/each}
        <Button type="button" variant="outline" size="sm" disabled={node.maxItems !== undefined && items.length >= node.maxItems} onclick={() => addArrayItem(path, node.items ?? { type: 'string' })}>
          <Plus class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" /> 添加项目
        </Button>
      </fieldset>
    {:else}
      <div class="svadmin-u-da7c36cd8867">
        <label for={id} class="svadmin-u-0214b4b355d1 svadmin-u-2689f3958069 svadmin-u-d4108abe6359">
          {title}{#if required}<span class="svadmin-u-811148b13d1e">*</span>{/if}
        </label>
        {#if node.description}<p class="svadmin-u-d058ca6de60f svadmin-u-bfa603190748">{node.description}</p>{/if}
        {#if node.enum}
          <select id={id} aria-invalid={error ? 'true' : undefined} aria-describedby={error ? `${id}-error` : undefined} required={required} value={enumIndex(current, node.enum) < 0 ? '' : enumToken(enumIndex(current, node.enum))} onchange={(event) => writePath(path, enumValue(event.currentTarget.value, node.enum))} class="svadmin-u-ed8a5df7b2fb svadmin-u-6da6a3c3f741 svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-e5795dad4d22 svadmin-u-e6f9e383a762 svadmin-u-d5eab218aa34 svadmin-u-359090c2d529">
            <option value="">{i18n.t('common.selectOption')}</option>
            {#each node.enum as option, index (index)}<option value={enumToken(index)}>{String(option)}</option>{/each}
          </select>
        {:else if node.type === 'null'}
          <input id={id} type="text" value="null" readonly />
        {:else if node.type === 'boolean'}
          <input id={id} aria-invalid={error ? 'true' : undefined} aria-describedby={error ? `${id}-error` : undefined} type="checkbox" checked={Boolean(current)} onchange={(event) => writePath(path, event.currentTarget.checked)} />
        {:else if node.type === 'number' || node.type === 'integer'}
          <input id={id} aria-invalid={error ? 'true' : undefined} aria-describedby={error ? `${id}-error` : undefined} type="number" step={node.type === 'integer' ? 1 : 'any'} min={node.minimum} max={node.maximum} required={required} value={current == null ? '' : String(current)} oninput={(event) => writePath(path, event.currentTarget.value === '' ? undefined : Number(event.currentTarget.value))} class="svadmin-u-ed8a5df7b2fb svadmin-u-6da6a3c3f741 svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-e5795dad4d22 svadmin-u-e6f9e383a762 svadmin-u-d5eab218aa34 svadmin-u-359090c2d529" />
        {:else}
          <input id={id} aria-invalid={error ? 'true' : undefined} aria-describedby={error ? `${id}-error` : undefined} type="text" minlength={node.minLength} maxlength={node.maxLength} required={required} value={String(current ?? '')} oninput={(event) => writePath(path, event.currentTarget.value)} class="svadmin-u-ed8a5df7b2fb svadmin-u-6da6a3c3f741 svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-e5795dad4d22 svadmin-u-e6f9e383a762 svadmin-u-d5eab218aa34 svadmin-u-359090c2d529" />
        {/if}
        {#if error}<p id={`${id}-error`}>{i18n.t('validation.invalidFormat')}</p>{/if}
      </div>
    {/if}
  {/snippet}

  <fieldset class="schema-form-fields svadmin-u-3e7ce58d64fa" disabled={locked}>
  {#if prepared.ok}
  <div class="svadmin-u-9c6cdfa2ba3d">
    {#each Object.entries(resolved.invalid ? {} : schema.properties ?? {}) as [key, node] (key)}
      {@render renderField(node, [key], node.title ?? key, schema.required?.includes(key) ?? false)}
    {/each}
  </div>

  {/if}
  <div class="svadmin-u-173fa8f06789 svadmin-u-b950dda299d3 svadmin-u-05faf5c801ff svadmin-u-60fbb7713999 svadmin-u-77c08e015d14">
    <Button type="submit" size="sm" disabled={isSubmitting || resolved.invalid} class="svadmin-u-44ee8ba0a421 svadmin-u-25effcb585ab">
      {#if isSubmitting}<Loader2 class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-afbdd13a380e" />{/if}
      {submitText}
    </Button>
  </div>
  </fieldset>
</form>

<style>
  .schema-form-fields { min-width: 0; margin: 0; padding: 0; border: 0; }
</style>
