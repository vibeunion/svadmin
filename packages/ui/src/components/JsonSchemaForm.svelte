<script lang="ts">
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

  type JsonSchema = JsonSchemaFormSchema;

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
    idPrefix,
    class: className = '',
  }: Props = $props();

  const i18n = useTranslation();
  const instanceId = $props.id();
  const prefix = $derived(idPrefix ?? `json-form-${instanceId}`);
  const isZh = $derived((locale ?? i18n.locale).startsWith('zh'));
  const labels = $derived(isZh ? {
    add: '添加项目', remove: '删除', empty: '暂无项目',
    failed: '提交未完成，请检查状态后重试。', invalid: '请检查表单输入。',
  } : {
    add: 'Add item', remove: 'Remove item', empty: 'No items',
    failed: 'Submission did not complete. Check its status before retrying.', invalid: 'Check the form input.',
  });
  let isSubmitting = $state(false);
  let failure = $state<'invalid' | 'failed' | null>(null);
  let formElement: HTMLFormElement | undefined;
  let destroyed = false;
  let authorityRevision = 0;
  let identity: readonly unknown[] = [];
  const prepared = $derived.by(() => {
    try { return { ok: true as const, value: initializeSchemaForm(schema, value) }; }
    catch { return { ok: false as const }; }
  });
  // 按键是否存在初始化，不能每次输入都用 ?? 把清空的默认值补回来。
  $effect.pre(() => {
    if (prepared.ok && prepared.value !== value) value = prepared.value;
  });
  $effect.pre(() => {
    const next = [schema, value, disabled, readonly, onsubmit];
    untrack(() => {
      if (next.some((part, index) => part !== identity[index])) {
        authorityRevision += 1;
        failure = null;
      }
      identity = next;
    });
  });
  onDestroy(() => { destroyed = true; });

  function editable(): boolean {
    return !destroyed && !disabled && !readonly && !isSubmitting && prepared.ok
      && !formElement?.closest('fieldset[disabled]');
  }
  function readPath(path: string[]): unknown {
    return path.reduce<unknown>((current, key) => (
      current && typeof current === 'object' && Object.hasOwn(current, key)
        ? (current as Record<string, unknown>)[key] : undefined
    ), prepared.ok ? prepared.value : {});
  }
  function writePath(path: string[], nextValue: unknown): void {
    if (!editable() || !prepared.ok) return;
    try { value = writeSchemaFormPath(prepared.value, path, nextValue); failure = null; }
    catch { failure = 'invalid'; }
  }
  function choose(path: string[], raw: string, choices: JsonSchema['enum']): void {
    if (!editable()) return;
    try { writePath(path, schemaFormEnumValue(choices ?? [], raw)); }
    catch { failure = 'invalid'; }
  }
  function addArrayItem(path: string[], itemSchema: JsonSchema): void {
    if (!editable()) return;
    const current = readPath(path);
    try { writePath(path, [...(Array.isArray(current) ? current : []), schemaFormArrayItem(itemSchema)]); }
    catch { failure = 'invalid'; }
  }
  function removeArrayItem(path: string[], index: number): void {
    if (!editable()) return;
    const current = readPath(path);
    if (Array.isArray(current)) writePath(path, current.filter((_, itemIndex) => itemIndex !== index));
  }
  async function handleSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    // 同步置锁，防止同一帧的双击/重入 submit；遵循宿主 fieldset 的预览禁用状态；权限仍需服务端校验。
    if (!editable() || !prepared.ok || !onsubmit) return;
    if (formElement && !formElement.checkValidity()) { failure = 'invalid'; return; }
    let payload: Record<string, unknown>;
    try { payload = schemaFormSnapshot(prepared.value); }
    catch { failure = 'invalid'; return; }
    const currentValue = value, currentSchema = schema, handler = onsubmit, revision = authorityRevision;
    const fingerprint = JSON.stringify(payload);
    failure = null;
    isSubmitting = true;
    try {
      await handler(payload);
    } catch (error) {
      // 回调只能拿到副本；被替换/卸载实例的失败不能污染新的表单上下文。
      if (!destroyed && revision === authorityRevision && !disabled && !readonly && currentValue === value && currentSchema === schema && handler === onsubmit) {
        try {
          if (JSON.stringify(schemaFormSnapshot(prepared.ok ? prepared.value : value)) === fingerprint) {
            failure = 'failed';
            try { onerror?.(error); } catch { /* 错误观察者不改变提交状态。 */ }
          }
        } catch { /* 新上下文不再是可比较的 JSON 草稿，不发布旧错误。 */ }
      }
    } finally {
      if (!destroyed) isSubmitting = false;
    }
  }

</script>

<form
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
    <p role="alert">{labels[!prepared.ok ? 'invalid' : failure ?? 'invalid']}</p>
  {/if}

  {#snippet renderField(node: JsonSchema, path: string[], title: string, required = false)}
    {@const current = readPath(path)}
    {@const id = `${prefix}_${path.map(encodeURIComponent).join('/')}`}
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
          {@render renderField(node.items ?? { type: 'string' }, [...path, String(index)], `${title} ${index + 1}`, true)}
          <Button type="button" variant="ghost" size="sm" onclick={() => removeArrayItem(path, index)}>
            <Trash2 class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" /> {labels.remove}
          </Button>
        {:else}
          <span class="svadmin-u-bfa603190748">{labels.empty}</span>
        {/each}
        <Button type="button" variant="outline" size="sm" onclick={() => addArrayItem(path, node.items ?? { type: 'string' })}>
          <Plus class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" /> {labels.add}
        </Button>
      </fieldset>
    {:else}
      <div class="svadmin-u-da7c36cd8867">
        <label for={id} class="svadmin-u-0214b4b355d1 svadmin-u-2689f3958069 svadmin-u-d4108abe6359">
          {title}{#if required}<span class="svadmin-u-811148b13d1e">*</span>{/if}
        </label>
        {#if node.description}<p class="svadmin-u-d058ca6de60f svadmin-u-bfa603190748">{node.description}</p>{/if}
        {#if node.enum}
          <select id={id} required={required} value={schemaFormEnumIndex(node.enum, current)} onchange={(event) => choose(path, event.currentTarget.value, node.enum)} class="svadmin-u-ed8a5df7b2fb svadmin-u-6da6a3c3f741 svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-e5795dad4d22 svadmin-u-e6f9e383a762 svadmin-u-d5eab218aa34 svadmin-u-359090c2d529">
            <option value="">{i18n.t('common.selectOption')}</option>
            {#each node.enum as option, optionIndex (optionIndex)}<option value={String(optionIndex)}>{String(option)}</option>{/each}
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

  <fieldset class="schema-form-fields svadmin-u-3e7ce58d64fa" disabled={disabled || readonly || isSubmitting || !prepared.ok}>
  {#if prepared.ok}
  <div class="svadmin-u-9c6cdfa2ba3d">
    {#each Object.entries(schema.properties ?? {}) as [key, node] (key)}
      {@render renderField(node, [key], node.title ?? key, schema.required?.includes(key) ?? false)}
    {/each}
  </div>

  <div class="svadmin-u-173fa8f06789 svadmin-u-b950dda299d3 svadmin-u-05faf5c801ff svadmin-u-60fbb7713999 svadmin-u-77c08e015d14">
    <Button type="submit" size="sm" disabled={disabled || readonly || isSubmitting || !prepared.ok} class="svadmin-u-44ee8ba0a421 svadmin-u-25effcb585ab">
      {#if isSubmitting}<Loader2 class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-afbdd13a380e" />{/if}
      {submitText}
    </Button>
  </div>
  {/if}
  </fieldset>
</form>

<style>
  .schema-form-fields { min-width: 0; margin: 0; padding: 0; border: 0; }
</style>
