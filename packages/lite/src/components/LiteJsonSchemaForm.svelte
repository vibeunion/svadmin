<script lang="ts">
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
    action?: string;
    method?: 'get' | 'post' | 'dialog' | 'GET' | 'POST' | 'DIALOG' | null;
    submitText?: string;
  }

  let {
    schema,
    value = $bindable({}),
    action = '',
    method = 'POST',
    submitText = 'Submit Form',
  }: Props = $props();

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
    if (node.type === 'array') {
      if (!Array.isArray(current)) return cloneDefault(node);
      return current.map(item => node.items ? mergeDefaults(node.items, item) : item);
    }
    if (node.type !== 'object' && !node.properties) return current ?? cloneDefault(node);
    const source = current && typeof current === 'object' && !Array.isArray(current)
      ? current as Record<string, unknown>
      : {};
    const result: Record<string, unknown> = { ...source };
    for (const [key, child] of Object.entries(node.properties ?? {})) {
      const next = mergeDefaults(child, result[key]);
      if (next !== undefined) result[key] = next;
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
    const next = structuredClone(value);
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
    return options?.find(option => String(option) === raw) ?? raw;
  }

  function addArrayItem(path: string[], itemSchema: JsonSchema): void {
    const current = readPath(path);
    const items = Array.isArray(current) ? current : [];
    writePath(path, [...items, cloneDefault(itemSchema) ?? (itemSchema.type === 'object' ? {} : '')]);
  }

  function removeArrayItem(path: string[], index: number): void {
    const current = readPath(path);
    if (Array.isArray(current)) writePath(path, current.filter((_, itemIndex) => itemIndex !== index));
  }
</script>

<div class="lite-schema-form-card">
  {#if schema.title}<div class="lite-schema-form-header"><strong>{schema.title}</strong></div>{/if}
  {#if schema.description}<p class="lite-schema-description">{schema.description}</p>{/if}

  <form {action} {method} class="lite-schema-form">
    {#snippet renderField(node: JsonSchema, path: string[], title: string, required = false)}
      {@const current = readPath(path)}
      {@const id = `lite_json_${path.join('_')}`}
      {#if node.type === 'object' || node.properties}
        <fieldset class="lite-schema-fieldset">
          <legend>{title}</legend>
          {#if node.description}<p class="lite-schema-description">{node.description}</p>{/if}
          {#each Object.entries(node.properties ?? {}) as [key, child] (key)}
            {@render renderField(child, [...path, key], child.title ?? key, node.required?.includes(key) ?? false)}
          {/each}
        </fieldset>
      {:else if node.type === 'array'}
        {@const items = Array.isArray(current) ? current : []}
        <fieldset class="lite-schema-fieldset">
          <legend>{title}</legend>
          {#if node.description}<p class="lite-schema-description">{node.description}</p>{/if}
          {#each items as _, index (index)}
            {@render renderField(node.items ?? { type: 'string' }, [...path, String(index)], `${title} ${index + 1}`)}
            <button type="button" class="lite-btn lite-btn-sm" onclick={() => removeArrayItem(path, index)}>Remove</button>
          {:else}
            <span class="lite-hint">No items</span>
          {/each}
          <button type="button" class="lite-btn lite-btn-sm" onclick={() => addArrayItem(path, node.items ?? { type: 'string' })}>Add item</button>
        </fieldset>
      {:else}
        <div class="lite-schema-field">
          <label for={id} class="lite-label">{title}{#if required}<span aria-hidden="true">*</span>{/if}</label>
          {#if node.description}<p class="lite-schema-description">{node.description}</p>{/if}
          {#if node.enum}
            <select id={id} required={required} value={String(current ?? '')} onchange={(event) => writePath(path, enumValue(event.currentTarget.value, node.enum))} class="lite-select">
              <option value="">Select an option</option>
              {#each node.enum as option (String(option))}<option value={String(option)}>{String(option)}</option>{/each}
            </select>
          {:else if node.type === 'boolean'}
            <input id={id} type="checkbox" checked={Boolean(current)} onchange={(event) => writePath(path, event.currentTarget.checked)} />
          {:else if node.type === 'number' || node.type === 'integer'}
            <input id={id} type="number" required={required} value={current === undefined ? '' : String(current)} oninput={(event) => writePath(path, event.currentTarget.value === '' ? undefined : Number(event.currentTarget.value))} class="lite-input" />
          {:else}
            <input id={id} type="text" required={required} value={String(current ?? '')} oninput={(event) => writePath(path, event.currentTarget.value)} class="lite-input" />
          {/if}
        </div>
      {/if}
    {/snippet}

    {#each Object.entries(schema.properties ?? {}) as [key, node] (key)}
      {@render renderField(node, [key], node.title ?? key, schema.required?.includes(key) ?? false)}
    {/each}
    <div class="lite-schema-footer">
      <button type="submit" class="lite-btn lite-btn-primary lite-btn-sm">{submitText}</button>
    </div>
  </form>
</div>

<style>
  .lite-schema-form-card { background: #fff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 16px; margin-bottom: 16px; }
  .lite-schema-form-header { padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; margin-bottom: 12px; font-size: 14px; }
  .lite-schema-fieldset { border: 1px solid #e2e8f0; border-radius: 4px; padding: 12px; margin: 0 0 12px; }
  .lite-schema-field { margin-bottom: 12px; }
  .lite-schema-fieldset > .lite-schema-field:last-child { margin-bottom: 0; }
  .lite-schema-footer { display: flex; justify-content: flex-end; padding-top: 12px; border-top: 1px solid #e2e8f0; }
  .lite-label { display: block; font-size: 12px; color: #475569; margin-bottom: 4px; }
  .lite-schema-description, .lite-hint { font-size: 12px; color: #64748b; }
  .lite-input, .lite-select { width: 100%; }
  .lite-btn { margin-right: 6px; }
</style>
