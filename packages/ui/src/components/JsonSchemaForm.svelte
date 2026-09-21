<script lang="ts">
  import { assertSchemaFormSchema, isSchemaFormNodeVisible, prepareSchemaFormValue, type SchemaFormSchema } from '@svadmin/core/schema-form';
  import { tick } from 'svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { Button } from './ui/button/index.js';
  import { Loader2, Plus, Trash2 } from '@lucide/svelte';
  import { cn } from '../utils.js';
  import { onDestroy, untrack } from 'svelte';
  import {
    initializeSchemaForm, schemaFormArrayItem,
    schemaFormSnapshot, writeSchemaFormPath,
    type JsonSchemaFormSchema,
  } from './json-schema-form-state.js';
  import { readRecursiveSchemaForm, validateRecursiveSchemaForm, schemaFormPointer } from './enterprise/recursive-schema-form.js';
  import { parseSchemaNumber, type SchemaFormIssue } from './enterprise/json-schema-form.js';
  interface JsonSchema extends JsonSchemaFormSchema {
    properties?: Record<string, JsonSchema>;
    items?: JsonSchema;
    visibleWhen?: SchemaFormSchema['visibleWhen'];
    pattern?: string;
  }

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
    value = $bindable({}),
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
  const prefix = $derived(idPrefix ?? `json-form-${instanceId}`);
  const isZh = $derived((locale ?? i18n.locale).startsWith('zh'));
  const labels = $derived(isZh ? { add: '添加项目', remove: '删除', empty: '暂无项目', failed: '提交未完成，请检查状态后重试。', invalid: '请检查表单输入。' }
    : { add: 'Add item', remove: 'Remove item', empty: 'No items', failed: 'Submission did not complete. Check its status before retrying.', invalid: 'Check the form input.' });
  let isSubmitting = $state(false);
  const model = $derived(readRecursiveSchemaForm(schema));
  // 两个已发布的 schema 子集分别验证；任何一个都不接受时关闭表单。
  const coreSchema = $derived.by(() => {
    try { assertSchemaFormSchema(schema as SchemaFormSchema); return schema as SchemaFormSchema; }
    catch { return undefined; }
  });
  let validationIssues = $state<SchemaFormIssue[]>([]);
  let parseIssues = $state<SchemaFormIssue[]>([]);
  let failure = $state<'invalid' | 'failed' | null>(null);
  let formElement: HTMLFormElement | undefined;
  let destroyed = false;
  let authorityRevision = 0;
  let identity: readonly unknown[] = [];
  let internalValue: Record<string, unknown> | undefined;

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

  const prepared = $derived.by(() => {
    try {
      if (model.issues.length && !coreSchema) return { ok: false as const };
      const seeded = mergeDefaults(schema, value, true);
      return { ok: true as const, value: initializeSchemaForm(schema, seeded as Record<string, unknown>) };
    } catch {
      return { ok: false as const };
    }
  });
  const locked = $derived(disabled || readonly || isSubmitting || !prepared.ok);
  $effect.pre(() => {
    const next = [schema, value, disabled, readonly, onsubmit];
    untrack(() => {
      if (next.some((part, index) => part !== identity[index])) {
        authorityRevision += 1;
        failure = null;
        validationIssues = [];
        if (schema !== identity[0] || value !== internalValue) parseIssues = [];
        internalValue = undefined;
      }
      identity = next;
    });
  });
  onDestroy(() => { destroyed = true; });

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
    ), prepared.ok ? prepared.value : {});
  }

  function writePath(path: string[], nextValue: unknown): boolean {
    if (!editable() || !prepared.ok || pathReadonly(path)) return false;
    try {
      value = writeSchemaFormPath(prepared.value, path, nextValue);
      internalValue = value;
      failure = null;
      validationIssues = [];
      return true;
    } catch { failure = 'invalid'; return false; }
  }

  function enumToken(index: number): string {
    return coreSchema && model.issues.length ? `__json_enum_${index}` : String(index);
  }

  function enumIndex(current: unknown, options: JsonSchema['enum']): number {
    return options?.findIndex((option) => Object.is(option, current)) ?? -1;
  }

  function enumValue(raw: string, options: JsonSchema['enum']): unknown {
    if (!/^(?:__json_enum_)?(0|[1-9]\d*)$/.test(raw)) return undefined;
    const index = Number(raw.replace(/^__json_enum_/, ''));
    return Number.isSafeInteger(index) ? options?.[index] : undefined;
  }
  function addArrayItem(path: string[], itemSchema: JsonSchema): void {
    if (!editable()) return;
    const current = readPath(path);
    const items = Array.isArray(current) ? current : [];
    try { writePath(path, [...items, schemaFormArrayItem(itemSchema)]); }
    catch { failure = 'invalid'; }
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
    if (!editable() || !prepared.ok || !onsubmit) return;
    let payload: Record<string, unknown>;
    try {
      const result = coreSchema ? prepareSchemaFormValue(coreSchema, prepared.value) : undefined;
      const detailedIssues = model.issues.length ? [] : validateRecursiveSchemaForm(model, prepared.value);
      const problems = [...parseIssues, ...(result
        ? result.errors.map(issue => {
          const path = schemaFormPointer(JSON.parse(issue.path) as string[]);
          // 共用子集保留公开错误码；核心校验仍决定哪些字段不可提交。
          return detailedIssues.find(detail => detail.path === path) ?? { path, code: 'invalid-value' as const };
        })
        : detailedIssues)];
      if (problems.length) {
        invalid(problems);
        await tick();
        formElement?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
        return;
      }
      payload = schemaFormSnapshot(result?.data ?? prepared.value);
    } catch { invalid([{ path: '', code: 'invalid-value' }]); return; }
    const currentValue = value, currentSchema = schema, handler = onsubmit, revision = authorityRevision;
    const fingerprint = JSON.stringify(schemaFormSnapshot(prepared.value));
    failure = null;
    isSubmitting = true;
    try {
      await handler(payload);
    } catch (error) {
      if (!destroyed && revision === authorityRevision && !disabled && !readonly && currentValue === value && currentSchema === schema && handler === onsubmit) {
        try {
          if (JSON.stringify(schemaFormSnapshot(prepared.ok ? prepared.value : value)) === fingerprint) {
            failure = 'failed';
            try { onerror?.(error); } catch { /* 错误观察者不改变提交状态。 */ }
          }
        } catch { /* 新草稿不接收旧请求的错误。 */ }
      }
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
  class={cn('svadmin-u-3e7ce58d64fa svadmin-u-a217b4eaa918 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-cd0ad9a56558 svadmin-u-0478c89a150f svadmin-u-cef5b893cf23 svadmin-u-359090c2d529', className)}
>
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
    {@const id = `${prefix}_${path.map(encodeURIComponent).join('/')}`}
    {@const type = nodeType(node)}
    {@const fieldLocked = locked || pathReadonly(path)}
    {@const error = fieldInvalid(path)}
    {@const options = choices(node)}
    {#if coreSchema && !isSchemaFormNodeVisible(node as SchemaFormSchema, prepared.ok ? prepared.value : {})}
      <!-- 隐藏字段保留草稿，但不进入提交数据。 -->
    {:else if type === 'object' || node.properties}
      <fieldset disabled={fieldLocked} class="svadmin-u-da7c36cd8867 svadmin-u-421ac2be5045">
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
      <fieldset disabled={fieldLocked} class="svadmin-u-da7c36cd8867 svadmin-u-421ac2be5045">
        <legend class="svadmin-u-0214b4b355d1 svadmin-u-2689f3958069">{title}</legend>
        {#if error}<p id={`${id}-error`}>{i18n.t('validation.invalidFormat')}</p>{/if}
        {#if node.description}<p class="svadmin-u-d058ca6de60f svadmin-u-bfa603190748">{node.description}</p>{/if}
        {#each items as _, index (index)}
          {@render renderField(node.items ?? { type: 'string' }, [...path, String(index)], `${title} ${index + 1}`)}
          <Button type="button" variant="ghost" size="sm" disabled={fieldLocked || (node.minItems !== undefined && items.length <= node.minItems)} onclick={() => removeArrayItem(path, index)}>
            <Trash2 class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" /> {labels.remove}
          </Button>
        {:else}
          <span class="svadmin-u-bfa603190748">{labels.empty}</span>
        {/each}
        <Button type="button" variant="outline" size="sm" disabled={fieldLocked || (node.maxItems !== undefined && items.length >= node.maxItems)} onclick={() => addArrayItem(path, node.items ?? { type: 'string' })}>
          <Plus class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" /> {labels.add}
        </Button>
      </fieldset>
    {:else}
      <div class="svadmin-u-da7c36cd8867">
        <label for={id} class="svadmin-u-0214b4b355d1 svadmin-u-2689f3958069 svadmin-u-d4108abe6359">
          {title}{#if required}<span class="svadmin-u-811148b13d1e">*</span>{/if}
        </label>
        {#if node.description}<p class="svadmin-u-d058ca6de60f svadmin-u-bfa603190748">{node.description}</p>{/if}
        {#if options}
          <select id={id} name={path.join('.')} disabled={fieldLocked} aria-invalid={error ? 'true' : undefined} aria-describedby={error ? `${id}-error` : undefined} required={required} value={enumIndex(current, options) < 0 ? '' : enumToken(enumIndex(current, options))} onchange={(event) => writePath(path, enumValue(event.currentTarget.value, options))} class="svadmin-u-ed8a5df7b2fb svadmin-u-6da6a3c3f741 svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-e5795dad4d22 svadmin-u-e6f9e383a762 svadmin-u-d5eab218aa34 svadmin-u-359090c2d529">
            <option value="">{i18n.t('common.selectOption')}</option>
            {#each options as option, index (index)}<option value={enumToken(index)}>{String(option)}</option>{/each}
          </select>
        {:else if node.type === 'null'}
          <input id={id} disabled={fieldLocked} type="text" value="null" readonly />
        {:else if type === 'boolean'}
          <input id={id} name={path.join('.')} disabled={fieldLocked} aria-invalid={error ? 'true' : undefined} aria-describedby={error ? `${id}-error` : undefined} type="checkbox" checked={Boolean(current)} onchange={(event) => writePath(path, event.currentTarget.checked)} />
        {:else if type === 'number' || type === 'integer'}
          <input id={id} name={path.join('.')} disabled={fieldLocked} aria-invalid={error ? 'true' : undefined} aria-describedby={error ? `${id}-error` : undefined} type="number" step={type === 'integer' ? 1 : 'any'} min={node.minimum} max={node.maximum} required={required} value={current == null ? '' : String(current)} oninput={(event) => writeNumber(path, event.currentTarget)} class="svadmin-u-ed8a5df7b2fb svadmin-u-6da6a3c3f741 svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-e5795dad4d22 svadmin-u-e6f9e383a762 svadmin-u-d5eab218aa34 svadmin-u-359090c2d529" />
        {:else}
          <input id={id} name={path.join('.')} disabled={fieldLocked} aria-invalid={error ? 'true' : undefined} aria-describedby={error ? `${id}-error` : undefined} type="text" minlength={node.minLength} maxlength={node.maxLength} required={required} value={String(current ?? '')} oninput={(event) => writePath(path, event.currentTarget.value)} class="svadmin-u-ed8a5df7b2fb svadmin-u-6da6a3c3f741 svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-e5795dad4d22 svadmin-u-e6f9e383a762 svadmin-u-d5eab218aa34 svadmin-u-359090c2d529" />
        {/if}
        {#if error}<p id={`${id}-error`}>{i18n.t('validation.invalidFormat')}</p>{/if}
      </div>
    {/if}
  {/snippet}

  <fieldset class="schema-form-fields svadmin-u-3e7ce58d64fa" disabled={locked}>
  {#if prepared.ok}
  <div class="svadmin-u-9c6cdfa2ba3d">
    {#each Object.entries(schema.properties ?? {}) as [key, node] (key)}
      {@render renderField(node, [key], node.title ?? key, schema.required?.includes(key) ?? false)}
    {/each}
  </div>

  {/if}
  <div class="svadmin-u-173fa8f06789 svadmin-u-b950dda299d3 svadmin-u-05faf5c801ff svadmin-u-60fbb7713999 svadmin-u-77c08e015d14">
    <Button type="submit" size="sm" disabled={locked} class="svadmin-u-44ee8ba0a421 svadmin-u-25effcb585ab">
      {#if isSubmitting}<Loader2 class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-afbdd13a380e" />{/if}
      {submitText}
    </Button>
  </div>
  </fieldset>
</form>

<style>
  .schema-form-fields { min-width: 0; margin: 0; padding: 0; border: 0; }
</style>
