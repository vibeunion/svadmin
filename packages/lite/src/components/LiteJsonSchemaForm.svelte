<script lang="ts">
  import { assertSchemaFormSchema, isSchemaFormNodeVisible, type SchemaFormSchema as JsonSchema } from '@svadmin/core/schema-form';
  import { useTranslation } from '@svadmin/core/i18n';
  import { encodeSchemaFormArrayAction, schemaFormActionName, schemaFormFieldName } from '../schema-form-data';

  interface Props {
    schema: JsonSchema;
    value?: Record<string, unknown>;
    action?: string;
    method?: 'get' | 'post' | 'dialog' | 'GET' | 'POST' | 'DIALOG' | null;
    submitText?: string;
  }

  let {
    schema,
    value = $bindable(undefined),
    action = '',
    method = 'POST',
    submitText = 'Submit Form',
  }: Props = $props();
  const instanceId = $props.id();
  const i18n = useTranslation();

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

  function fieldName(path: string[]): string {
    return schemaFormFieldName(path);
  }

  function enumToken(index: number): string {
    return `__json_enum_${index}`;
  }

  function enumIndex(current: unknown, options: JsonSchema['enum']): number {
    return options?.findIndex(option => Object.is(option, current)) ?? -1;
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
</script>

<div class="lite-schema-form-card">
  {#if schema.title}<div class="lite-schema-form-header"><strong>{schema.title}</strong></div>{/if}
  {#if schema.description}<p class="lite-schema-description">{schema.description}</p>{/if}

  <form {action} {method} class="lite-schema-form">
    {#if resolved.invalid}<p role="alert">{i18n.t('common.operationFailed')}</p>{/if}
    {#snippet renderField(node: JsonSchema, path: string[], title: string, required = false)}
      {@const current = readPath(path)}
      {@const id = `${instanceId}-${encodeURIComponent(JSON.stringify(path))}`}
      {#if !isSchemaFormNodeVisible(node, resolvedValue)}
        <!-- 隐藏字段不进入原生表单传输。 -->
      {:else if node.type === 'object' || node.properties}
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
          <input type="hidden" name={`length:${JSON.stringify(path)}`} value={items.length} />
          <legend>{title}</legend>
          {#if node.description}<p class="lite-schema-description">{node.description}</p>{/if}
          {#each items as _, index (index)}
            {@render renderField(node.items ?? { type: 'string' }, [...path, String(index)], `${title} ${index + 1}`)}
            <button
              type={action ? 'submit' : 'button'}
              formnovalidate
              name={action ? schemaFormActionName : undefined}
              value={action ? encodeSchemaFormArrayAction({ type: 'remove', path, index }) : undefined}
              class="lite-btn lite-btn-sm"
              disabled={node.minItems !== undefined && items.length <= node.minItems}
              onclick={action ? (event) => { event.preventDefault(); removeArrayItem(path, index); } : () => removeArrayItem(path, index)}
            >Remove</button>
          {:else}
            <span class="lite-hint">No items</span>
          {/each}
          <button
            type={action ? 'submit' : 'button'}
            formnovalidate
            name={action ? schemaFormActionName : undefined}
            value={action ? encodeSchemaFormArrayAction({ type: 'add', path }) : undefined}
            class="lite-btn lite-btn-sm"
            disabled={node.maxItems !== undefined && items.length >= node.maxItems}
            onclick={action ? (event) => { event.preventDefault(); addArrayItem(path, node.items ?? { type: 'string' }); } : () => addArrayItem(path, node.items ?? { type: 'string' })}
          >Add item</button>
        </fieldset>
      {:else}
        <div class="lite-schema-field">
          <label for={id} class="lite-label">{title}{#if required}<span aria-hidden="true">*</span>{/if}</label>
          {#if node.description}<p class="lite-schema-description">{node.description}</p>{/if}
          {#if node.enum}
            <select id={id} name={fieldName(path)} required={required} value={enumIndex(current, node.enum) < 0 ? '' : enumToken(enumIndex(current, node.enum))} onchange={(event) => writePath(path, enumValue(event.currentTarget.value, node.enum))} class="lite-select">
              <option value="">Select an option</option>
              {#each node.enum as option, index (index)}<option value={enumToken(index)}>{String(option)}</option>{/each}
            </select>
          {:else if node.type === 'null'}
            <input id={id} name={fieldName(path)} value="null" readonly />
          {:else if node.type === 'boolean'}
            <input type="hidden" name={fieldName(path)} value="false" />
            <input id={id} type="checkbox" name={fieldName(path)} value="true" checked={Boolean(current)} onchange={(event) => writePath(path, event.currentTarget.checked)} />
          {:else if node.type === 'number' || node.type === 'integer'}
            <input id={id} name={fieldName(path)} type="number" step={node.type === 'integer' ? 1 : 'any'} min={node.minimum} max={node.maximum} required={required} value={current == null ? '' : String(current)} oninput={(event) => writePath(path, event.currentTarget.value === '' ? undefined : Number(event.currentTarget.value))} class="lite-input" />
          {:else}
            <input id={id} name={fieldName(path)} type="text" minlength={node.minLength} maxlength={node.maxLength} pattern={node.pattern} required={required} value={String(current ?? '')} oninput={(event) => writePath(path, event.currentTarget.value)} class="lite-input" />
          {/if}
        </div>
      {/if}
    {/snippet}

    {#each Object.entries(resolved.invalid ? {} : schema.properties ?? {}) as [key, node] (key)}
      {@render renderField(node, [key], node.title ?? key, schema.required?.includes(key) ?? false)}
    {/each}
    <div class="lite-schema-footer">
      <button type="submit" disabled={resolved.invalid} class="lite-btn lite-btn-primary lite-btn-sm">{submitText}</button>
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
