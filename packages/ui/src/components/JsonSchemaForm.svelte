<script lang="ts">
  import { assertSchemaFormSchema, isSchemaFormNodeVisible, prepareSchemaFormValue, type SchemaFormSchema as JsonSchema } from '@svadmin/core/schema-form';
  import { tick } from 'svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { Button } from './ui/button/index.js';
  import { Loader2, Plus, Trash2 } from '@lucide/svelte';
  import { cn } from '../utils.js';

  interface Props {
    schema: JsonSchema;
    value?: Record<string, unknown>;
    onsubmit?: (data: Record<string, unknown>) => void | Promise<void>;
    submitText?: string;
    class?: string;
  }

  let {
    schema,
    value = $bindable(undefined),
    onsubmit,
    submitText = 'Submit Form',
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
    const current = readPath(path);
    const items = Array.isArray(current) ? current : [];
    const item = cloneDefault(itemSchema);
    writePath(path, [...items, item === undefined ? (itemSchema.type === 'object' ? {} : '') : item]);
  }

  function removeArrayItem(path: string[], index: number): void {
    const current = readPath(path);
    if (Array.isArray(current)) writePath(path, current.filter((_, itemIndex) => itemIndex !== index));
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
      isSubmitting = false;
    }
  }
</script>

<form
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
    {:else if node.type === 'array'}
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
          <span class="svadmin-u-bfa603190748">暂无项目</span>
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

  <div class="svadmin-u-9c6cdfa2ba3d">
    {#each Object.entries(resolved.invalid ? {} : schema.properties ?? {}) as [key, node] (key)}
      {@render renderField(node, [key], node.title ?? key, schema.required?.includes(key) ?? false)}
    {/each}
  </div>

  <div class="svadmin-u-173fa8f06789 svadmin-u-b950dda299d3 svadmin-u-05faf5c801ff svadmin-u-60fbb7713999 svadmin-u-77c08e015d14">
    <Button type="submit" size="sm" disabled={isSubmitting || resolved.invalid} class="svadmin-u-44ee8ba0a421 svadmin-u-25effcb585ab">
      {#if isSubmitting}<Loader2 class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-afbdd13a380e" />{/if}
      {submitText}
    </Button>
  </div>
</form>
