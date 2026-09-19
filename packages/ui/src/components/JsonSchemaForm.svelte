<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import { Button } from './ui/button/index.js';
  import { Loader2, Plus, Trash2 } from '@lucide/svelte';
  import { cn } from '../utils.js';

  interface JsonSchema {
    type?: string;
    title?: string;
    description?: string;
    properties?: Record<string, JsonSchema>;
    items?: JsonSchema;
    enum?: Array<string | number | boolean | null>;
    default?: unknown;
    required?: string[];
  }

  interface Props {
    schema: JsonSchema;
    value?: Record<string, unknown>;
    onsubmit?: (data: Record<string, unknown>) => void | Promise<void>;
    submitText?: string;
    /** Use a unique stable prefix when several schema forms share a page. */
    idPrefix?: string;
    class?: string;
  }

  let {
    schema,
    value = $bindable({}),
    onsubmit,
    submitText = 'Submit Form',
    idPrefix = 'json_field',
    class: className = '',
  }: Props = $props();

  const i18n = useTranslation();
  let isSubmitting = $state(false);

  function cloneDefault(node: JsonSchema): unknown {
    if (node.default !== undefined) return structuredClone(node.default);
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

  function mergeDefaults(node: JsonSchema, current: unknown): unknown {
    if (node.type !== 'object' && !node.properties) return current ?? cloneDefault(node);
    const source = current && typeof current === 'object' ? current as Record<string, unknown> : {};
    const result: Record<string, unknown> = { ...source };
    for (const [key, child] of Object.entries(node.properties ?? {})) {
      const next = mergeDefaults(child, result[key]);
      if (next !== undefined) result[key] = next;
      else if (child.type === 'boolean' && node.required?.includes(key)) result[key] = false;
    }
    return result;
  }

  $effect(() => {
    const next = mergeDefaults(schema, value);
    if (JSON.stringify(next) !== JSON.stringify(value)) value = next as Record<string, unknown>;
  });

  function readPath(path: string[]): unknown {
    return path.reduce<unknown>((current, key) => (
      current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined
    ), value);
  }

  function writePath(path: string[], nextValue: unknown): void {
    const next = structuredClone($state.snapshot(value));
    let target: Record<string, unknown> = next;
    for (const key of path.slice(0, -1)) {
      const child = target[key];
      target[key] = child && typeof child === 'object' ? child : {};
      target = target[key] as Record<string, unknown>;
    }
    const lastKey = path[path.length - 1];
    if (lastKey !== undefined) target[lastKey] = nextValue;
    value = next;
  }

  function enumValue(raw: string, options: JsonSchema['enum']): unknown {
    return options?.find((option) => String(option) === raw) ?? raw;
  }

  function addArrayItem(path: string[], itemSchema: JsonSchema): void {
    const current = readPath(path);
    const items = Array.isArray(current) ? current : [];
    writePath(path, [...items, cloneDefault(itemSchema) ?? (itemSchema.type === 'object' ? {} : itemSchema.type === 'boolean' ? false : '')]);
  }

  function removeArrayItem(path: string[], index: number): void {
    const current = readPath(path);
    if (Array.isArray(current)) writePath(path, current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function handleSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    isSubmitting = true;
    try {
      await onsubmit?.(value);
    } finally {
      isSubmitting = false;
    }
  }
</script>

<form
  onsubmit={handleSubmit}
  class={cn('svadmin-u-3e7ce58d64fa svadmin-u-a217b4eaa918 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-cd0ad9a56558 svadmin-u-0478c89a150f svadmin-u-cef5b893cf23 svadmin-u-359090c2d529', className)}
>
  {#if schema.title}
    <div class="svadmin-u-f4cc511ff0c1 svadmin-u-65fdbade2025 svadmin-u-05faf5c801ff">
      <h3 class="svadmin-u-fc7473ca09eb svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{schema.title}</h3>
      {#if schema.description}<p class="svadmin-u-359090c2d529 svadmin-u-bfa603190748 svadmin-u-15e1b1f444fe">{schema.description}</p>{/if}
    </div>
  {/if}

  {#snippet renderField(node: JsonSchema, path: string[], title: string, required = false)}
    {@const current = readPath(path)}
    {@const id = `${idPrefix}_${path.map(encodeURIComponent).join('/')}`}
    {#if node.type === 'object' || node.properties}
      <fieldset class="svadmin-u-da7c36cd8867 svadmin-u-421ac2be5045">
        <legend class="svadmin-u-0214b4b355d1 svadmin-u-2689f3958069">{title}</legend>
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
        {#if node.description}<p class="svadmin-u-d058ca6de60f svadmin-u-bfa603190748">{node.description}</p>{/if}
        {#each items as _, index (index)}
          {@render renderField(node.items ?? { type: 'string' }, [...path, String(index)], `${title} ${index + 1}`)}
          <Button type="button" variant="ghost" size="sm" onclick={() => removeArrayItem(path, index)}>
            <Trash2 class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" /> 删除
          </Button>
        {:else}
          <span class="svadmin-u-bfa603190748">暂无项目</span>
        {/each}
        <Button type="button" variant="outline" size="sm" onclick={() => addArrayItem(path, node.items ?? { type: 'string' })}>
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
          <select id={id} required={required} value={String(current ?? '')} onchange={(event) => writePath(path, enumValue(event.currentTarget.value, node.enum))} class="svadmin-u-ed8a5df7b2fb svadmin-u-6da6a3c3f741 svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-e5795dad4d22 svadmin-u-e6f9e383a762 svadmin-u-d5eab218aa34 svadmin-u-359090c2d529">
            <option value="">{i18n.t('common.selectOption')}</option>
            {#each node.enum as option (String(option))}<option value={String(option)}>{String(option)}</option>{/each}
          </select>
        {:else if node.type === 'boolean'}
          <input id={id} type="checkbox" checked={Boolean(current)} onchange={(event) => writePath(path, event.currentTarget.checked)} />
        {:else if node.type === 'number' || node.type === 'integer'}
          <input id={id} type="number" step={node.type === 'integer' ? 1 : 'any'} required={required} value={current === undefined ? '' : String(current)} oninput={(event) => writePath(path, event.currentTarget.value === '' ? undefined : Number(event.currentTarget.value))} class="svadmin-u-ed8a5df7b2fb svadmin-u-6da6a3c3f741 svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-e5795dad4d22 svadmin-u-e6f9e383a762 svadmin-u-d5eab218aa34 svadmin-u-359090c2d529" />
        {:else}
          <input id={id} type="text" required={required} value={String(current ?? '')} oninput={(event) => writePath(path, event.currentTarget.value)} class="svadmin-u-ed8a5df7b2fb svadmin-u-6da6a3c3f741 svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-e5795dad4d22 svadmin-u-e6f9e383a762 svadmin-u-d5eab218aa34 svadmin-u-359090c2d529" />
        {/if}
      </div>
    {/if}
  {/snippet}

  <div class="svadmin-u-9c6cdfa2ba3d">
    {#each Object.entries(schema.properties ?? {}) as [key, node] (key)}
      {@render renderField(node, [key], node.title ?? key, schema.required?.includes(key) ?? false)}
    {/each}
  </div>

  <div class="svadmin-u-173fa8f06789 svadmin-u-b950dda299d3 svadmin-u-05faf5c801ff svadmin-u-60fbb7713999 svadmin-u-77c08e015d14">
    <Button type="submit" size="sm" disabled={isSubmitting} class="svadmin-u-44ee8ba0a421 svadmin-u-25effcb585ab">
      {#if isSubmitting}<Loader2 class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-afbdd13a380e" />{/if}
      {submitText}
    </Button>
  </div>
</form>
