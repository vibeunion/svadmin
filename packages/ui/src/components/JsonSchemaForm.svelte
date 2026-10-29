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
  import {
    readRecursiveSchemaForm, validateRecursiveSchemaForm, schemaFormPointer,
    pruneRecursiveSchemaFormValue, selectRecursiveOneOfBranch, switchRecursiveOneOfBranch,
    type RecursiveSchemaFormNode,
  } from './enterprise/recursive-schema-form.js';
  import { resolveSchemaFormReferences, type SchemaFormReferenceDocuments } from './enterprise/schema-form-references.js';
  import { parseSchemaNumber, type JsonScalar, type SchemaFormIssue } from './enterprise/json-schema-form.js';
  interface JsonSchema extends JsonSchemaFormSchema {
    properties?: Record<string, JsonSchema>;
    items?: JsonSchema;
    oneOf?: JsonSchema[];
    discriminator?: { propertyName: string };
    $defs?: Record<string, JsonSchema>;
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
    /** Schema 配置本身不可用时调用；与值校验 onvalidationerror 分离。 */
    onschemaerror?: (issues: SchemaFormIssue[]) => void;
    /** 宿主已取得的普通 Schema 文档；键必须与 `$ref` 的 URI 精确匹配。 */
    referenceDocuments?: SchemaFormReferenceDocuments;
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
    onschemaerror,
    referenceDocuments = {},
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
  // 引用只展开一次；递归编译、默认值、渲染、条件显示、只读与提交共用同一结果。
  const resolution = $derived(resolveSchemaFormReferences(schema, referenceDocuments));
  const resolvedSchema = $derived(resolution.schema);
  const model = $derived(readRecursiveSchemaForm(resolvedSchema));
  // 两个已发布的 schema 子集分别验证；任何一个都不接受时关闭表单。
  const coreSchema = $derived.by(() => {
    if (!resolvedSchema) return undefined;
    try { assertSchemaFormSchema(resolvedSchema as SchemaFormSchema); return resolvedSchema as SchemaFormSchema; }
    catch { return undefined; }
  });
  const configurationIssues = $derived(resolution.issues.length
    ? resolution.issues
    : model.issues.length && !coreSchema ? model.issues : []);
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

  /** Resolve a branch only when the data already carries one unique explicit discriminator value. */
  function selectOneOfSchema(node: JsonSchema, current: unknown): JsonSchema | undefined {
    const propertyName = node.discriminator?.propertyName;
    if (!propertyName || !node.oneOf?.length) return undefined;
    const value = recordValue(current, propertyName);
    if (value === undefined) return undefined;
    const matched = node.oneOf.filter(branch => {
      const selector = branch?.properties?.[propertyName];
      const values = selector ? choices(selector) : undefined;
      return values?.some(choice => Object.is(choice, value)) ?? false;
    });
    return matched.length === 1 ? matched[0] : undefined;
  }

  function mergeDefaults(node: JsonSchema, current: unknown, present: boolean, budget = { nodes: 0 }): unknown {
    if (++budget.nodes > 1000) throw new Error('Schema form data limit exceeded.');
    const candidate = present ? current : cloneDefault(node);
    if (candidate === null || (present && candidate === undefined)) return candidate;
    // 只对已显式携带 discriminator 的分支补默认值；未选择或歧义时绝不猜测分支。
    if (node.oneOf && node.discriminator) {
      const branch = selectOneOfSchema(node, candidate);
      if (!branch) return candidate;
      return mergeDefaults(branch, candidate, true, budget);
    }
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
      if (configurationIssues.length || !resolvedSchema) return { ok: false as const };
      const seeded = mergeDefaults(resolvedSchema as JsonSchema, value, true);
      return { ok: true as const, value: initializeSchemaForm(resolvedSchema as JsonSchema, seeded as Record<string, unknown>) };
    } catch {
      return { ok: false as const };
    }
  });
  const locked = $derived(disabled || readonly || isSubmitting || !prepared.ok);
  let reportedConfiguration = '';
  let reportedSchema: JsonSchema | undefined;
  $effect.pre(() => {
    const issues = configurationIssues;
    if (!issues.length) {
      reportedConfiguration = '';
      reportedSchema = schema;
      return;
    }
    const fingerprint = issues.map(issue => `${issue.code}@${issue.path}`).join('|');
    if (schema === reportedSchema && fingerprint === reportedConfiguration) return;
    reportedConfiguration = fingerprint;
    reportedSchema = schema;
    untrack(() => {
      try { onschemaerror?.(issues.map(issue => ({ ...issue }))); }
      catch { /* 配置观察者不参与可用性判定。 */ }
    });
  });
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
  function childValue(current: unknown, key: string): unknown {
    if (Array.isArray(current)) {
      if (!/^(0|[1-9]\d*)$/u.test(key)) return undefined;
      // 数组索引必须按自身数据属性读取；recordValue 对数组刻意返回 undefined。
      const descriptor = Object.getOwnPropertyDescriptor(current, key);
      return descriptor !== undefined && 'value' in descriptor ? descriptor.value : undefined;
    }
    return recordValue(current, key);
  }
  function pathReadonly(path: readonly string[]): boolean {
    let node: JsonSchema | undefined = resolvedSchema;
    let current: unknown = prepared.ok ? prepared.value : value;
    if (!node) return false;
    // 每层先检查自身 readOnly，再按 discriminator 解析分支，避免根 oneOf 丢弃自身约束。
    if (node.readOnly) return true;
    const rootBranch = selectOneOfSchema(node, current);
    if (rootBranch) {
      node = rootBranch;
      if (node.readOnly) return true;
    }
    for (const key of path) {
      if (!node) return false;
      const branch = selectOneOfSchema(node, current);
      if (branch) {
        node = branch;
        if (node.readOnly) return true;
      }
      node = nodeType(node) === 'array' ? node.items : node.properties?.[key];
      current = childValue(current, key);
      if (node?.readOnly) return true;
    }
    if (!node) return false;
    const selected = selectOneOfSchema(node, current);
    return selected?.readOnly === true;
  }
  /** discriminator 属性若声明 readOnly，只锁定分支选择器，不冻结同分支的其他可编辑字段。 */
  function discriminatorLocked(path: readonly string[]): boolean {
    let node: JsonSchema | undefined = resolvedSchema;
    let current: unknown = prepared.ok ? prepared.value : value;
    for (const key of path) {
      if (!node) return false;
      const branch = selectOneOfSchema(node, current);
      if (branch) node = branch;
      node = nodeType(node) === 'array' ? node.items : node.properties?.[key];
      current = childValue(current, key);
    }
    if (!node) return false;
    const propertyName = node.discriminator?.propertyName;
    if (!propertyName) return false;
    const selected = selectOneOfSchema(node, current);
    // 未选中分支时，只有所有候选分支都只读才保护选择器，避免误冻结其他可编辑配置。
    const branches = selected ? [selected] : node.oneOf ?? [];
    return branches.length > 0 && branches.every(branch => branch.properties?.[propertyName]?.readOnly === true);
  }
  function invalid(issues: SchemaFormIssue[]): void {
    failure = 'invalid';
    validationIssues = issues;
    try { onvalidationerror?.(issues); } catch { /* Observers do not authorize submission. */ }
  }
  function fieldInvalid(path: readonly string[]): boolean {
    return [...validationIssues, ...parseIssues].some(issue => issue.path === schemaFormPointer(path));
  }
  function isVisibleIssuePath(pointer: string): boolean {
    if (!coreSchema || !prepared.ok || !pointer.startsWith('/')) return true;
    const path = pointer.slice(1).split('/').map(segment => segment.replaceAll('~1', '/').replaceAll('~0', '~'));
    let node: JsonSchema | undefined = resolvedSchema;
    for (const segment of path) {
      if (!node) return true;
      const kind = nodeType(node);
      node = kind === 'array' ? node.items : node.properties?.[segment];
      if (!node) return true;
      if (!isSchemaFormNodeVisible(node as SchemaFormSchema, prepared.value)) return false;
    }
    return true;
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
  function recordValue(current: unknown, key: string): unknown {
    if (current === null || typeof current !== 'object' || Array.isArray(current) || !Object.hasOwn(current, key)) return undefined;
    const descriptor = Object.getOwnPropertyDescriptor(current, key);
    return descriptor !== undefined && 'value' in descriptor ? descriptor.value : undefined;
  }
  function oneOfOptionIndex(choices: readonly JsonScalar[][], current: unknown): string {
    for (const [branch, values] of choices.entries()) {
      const valueIndex = values.findIndex(value => Object.is(value, current));
      if (valueIndex >= 0) return `${branch}:${valueIndex}`;
    }
    return '';
  }

  function writePath(path: string[], nextValue: unknown): boolean {
    if (!editable() || !prepared.ok || pathReadonly(path)) return false;
    try {
      value = path.length ? writeSchemaFormPath(prepared.value, path, nextValue) : schemaFormSnapshot(nextValue);
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
      // 分支切换后只提交当前 discriminator 对应分支；旧分支字段不会随草稿误提交。
      const submittedValue = pruneRecursiveSchemaFormValue(model, prepared.value);
      const result = coreSchema ? prepareSchemaFormValue(coreSchema, submittedValue) : undefined;
      const detailedIssues = model.issues.length ? [] : validateRecursiveSchemaForm(model, submittedValue);
      // 隐藏字段暂不参与校验，但保留解析错误，重新显示时仍需修正。
      const activeParseIssues = parseIssues.filter(issue => isVisibleIssuePath(issue.path));
      const problems = [...activeParseIssues, ...(result
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
      payload = schemaFormSnapshot(result?.data ?? submittedValue);
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
  class={cn('space-y-4 rounded-xl border border-border bg-card p-6 shadow-xs text-xs', className)}
>
  {#if resolvedSchema?.title}
    <div class="pb-2 border-b border-border/60">
      <h3 class="text-sm font-semibold text-foreground">{resolvedSchema.title}</h3>
      {#if resolvedSchema.description}<p class="text-xs text-muted-foreground mt-0.5">{resolvedSchema.description}</p>{/if}
    </div>
  {/if}

  {#if !prepared.ok || failure}
    <p role="alert" data-testid="schema-form-errors">{labels[!prepared.ok ? 'invalid' : failure ?? 'invalid']}</p>
  {/if}

  {#snippet renderField(node: JsonSchema, compiled: RecursiveSchemaFormNode | undefined, path: string[], title: string, required = false)}
    {@const current = readPath(path)}
    {@const id = `${prefix}_${path.map(encodeURIComponent).join('/')}`}
    {@const type = nodeType(node)}
    {@const fieldLocked = locked || pathReadonly(path)}
    {@const error = fieldInvalid(path)}
    {@const options = choices(node)}
    {@const descriptionId = node.description ? `${id}:description` : undefined}
    {@const errorId = error ? `${id}:error` : undefined}
    {@const oneOf = compiled?.kind === 'oneOf' ? compiled : undefined}
    {@const oneOfSelection = oneOf ? selectRecursiveOneOfBranch(oneOf, current) : 'oneOf-unselected'}
    {@const branchIndex = typeof oneOfSelection === 'number' ? oneOfSelection : -1}
    {@const branchSchema = oneOf && branchIndex >= 0 ? node.oneOf?.[branchIndex] : undefined}
    {@const branchCompiled = oneOf && branchIndex >= 0 ? oneOf.branches[branchIndex] : undefined}
    {@const oneOfValue = oneOf ? recordValue(current, oneOf.propertyName) : undefined}
    {@const selectorId = `${id}:branch`}
    {@const selectorLocked = fieldLocked || discriminatorLocked(path)}
    {@const selectionError = oneOf ? validationIssues.some(issue => issue.path === schemaFormPointer([...path, oneOf.propertyName]) || issue.path === schemaFormPointer([...path, 'oneOf'])) : false}
    {#if coreSchema && !isSchemaFormNodeVisible(node as SchemaFormSchema, prepared.ok ? prepared.value : {})}
      <!-- 隐藏字段保留草稿，但不进入提交数据。 -->
    {:else if oneOf}
      <fieldset disabled={fieldLocked} aria-describedby={[descriptionId, selectionError ? `${selectorId}:error` : undefined].filter(Boolean).join(' ') || undefined} class="space-y-1 rounded-md">
        <legend class="block font-medium">{title}</legend>
        {#if node.description}<p id={descriptionId} class="text-[11px] text-muted-foreground">{node.description}</p>{/if}
        <div class="space-y-1">
          <label for={selectorId} class="block font-medium text-foreground">
            {oneOf.propertyName}{#if required}<span class="text-destructive">*</span>{/if}
          </label>
          <select id={selectorId} disabled={selectorLocked} aria-invalid={selectionError ? 'true' : undefined} aria-describedby={selectionError ? `${selectorId}:error` : undefined} value={oneOfOptionIndex(oneOf.values, oneOfValue)} onchange={(event) => {
            if (selectorLocked || !editable()) return;
            const token = event.currentTarget.value;
            if (!/^(0|[1-9]\d*):(0|[1-9]\d*)$/u.test(token)) return;
            const [branchToken, valueToken] = token.split(':');
            const branch = Number(branchToken), valueIndex = Number(valueToken);
            const selected = oneOf.values[branch]?.[valueIndex];
            const next = switchRecursiveOneOfBranch(oneOf, current ?? {}, branch, selected);
            const branchSchema = next ? node.oneOf?.[branch] : undefined;
            // 显式切换后才按目标分支播种默认值，绝不在未选择时猜测分支。
            const seeded = branchSchema
              ? mergeDefaults(branchSchema as JsonSchema, next, true) as Record<string, unknown>
              : next;
            if (next) writePath(path, seeded as Record<string, unknown>);
          }} class="h-8 w-full rounded-md border border-input bg-background px-2 text-xs">
            <option value="">{i18n.t('common.selectOption')}</option>
            {#each oneOf.values as branchValues, branch (branch)}
              {#each branchValues as value, valueIndex (valueIndex)}
                <option value={`${branch}:${valueIndex}`}>{String(value)}</option>
              {/each}
            {/each}
          </select>
          {#if selectionError}<p id={`${selectorId}:error`}>{i18n.t('validation.invalidFormat')}</p>{/if}
        </div>
        {#if branchSchema && branchCompiled}
          {#if branchCompiled.kind === 'object'}
            <fieldset disabled={fieldLocked} class="space-y-1 rounded-md">
              <legend class="block font-medium">{branchSchema.title ?? title}</legend>
              {#if branchSchema.description}<p class="text-[11px] text-muted-foreground">{branchSchema.description}</p>{/if}
              <div class="space-y-3.5">
                {#each Object.entries(branchSchema.properties ?? {}) as [key, child] (key)}
                  {#if key !== oneOf.propertyName}
                    {@render renderField(child, branchCompiled.properties[key], [...path, key], child.title ?? key, branchSchema.required?.includes(key) ?? false)}
                  {/if}
                {/each}
              </div>
            </fieldset>
          {:else}
            {@render renderField(branchSchema, branchCompiled, path, title, required)}
          {/if}
        {/if}
      </fieldset>
    {:else if type === 'object' || node.properties}
      <fieldset disabled={fieldLocked} aria-describedby={[descriptionId, errorId].filter(Boolean).join(' ') || undefined} class="space-y-1 rounded-md">
        <legend class="block font-medium">{title}</legend>
        {#if error}<p id={errorId}>{i18n.t('validation.invalidFormat')}</p>{/if}
        {#if node.description}<p id={descriptionId} class="text-[11px] text-muted-foreground">{node.description}</p>{/if}
        <div class="space-y-3.5">
          {#each Object.entries(node.properties ?? {}) as [key, child] (key)}
            {@render renderField(child, compiled?.kind === 'object' ? compiled.properties[key] : undefined, [...path, key], child.title ?? key, node.required?.includes(key) ?? false)}
          {/each}
        </div>
      </fieldset>
    {:else if type === 'array'}
      {@const items = Array.isArray(current) ? current : []}
      <fieldset disabled={fieldLocked} aria-describedby={[descriptionId, errorId].filter(Boolean).join(' ') || undefined} class="space-y-1 rounded-md">
        <legend class="block font-medium">{title}</legend>
        {#if error}<p id={errorId}>{i18n.t('validation.invalidFormat')}</p>{/if}
        {#if node.description}<p id={descriptionId} class="text-[11px] text-muted-foreground">{node.description}</p>{/if}
        {#each items as _, index (index)}
          {@render renderField(node.items ?? { type: 'string' }, compiled?.kind === 'array' ? compiled.item : undefined, [...path, String(index)], `${title} ${index + 1}`)}
          <Button type="button" variant="ghost" size="sm" disabled={fieldLocked || (node.minItems !== undefined && items.length <= node.minItems)} onclick={() => removeArrayItem(path, index)}>
            <Trash2 class="h-3.5 w-3.5" /> {labels.remove}
          </Button>
        {:else}
          <span class="text-muted-foreground">{labels.empty}</span>
        {/each}
        <Button type="button" variant="outline" size="sm" disabled={fieldLocked || (node.maxItems !== undefined && items.length >= node.maxItems)} onclick={() => addArrayItem(path, node.items ?? { type: 'string' })}>
          <Plus class="h-3.5 w-3.5" /> {labels.add}
        </Button>
      </fieldset>
    {:else}
      <div class="space-y-1">
        <label for={id} class="block font-medium text-foreground">
          {title}{#if required}<span class="text-destructive">*</span>{/if}
        </label>
        {#if node.description}<p id={descriptionId} class="text-[11px] text-muted-foreground">{node.description}</p>{/if}
        {#if options}
          <select id={id} name={path.join('.')} disabled={fieldLocked} aria-invalid={error ? 'true' : undefined} aria-describedby={[descriptionId, errorId].filter(Boolean).join(' ') || undefined} required={required} value={enumIndex(current, options) < 0 ? '' : enumToken(enumIndex(current, options))} onchange={(event) => writePath(path, enumValue(event.currentTarget.value, options))} class="h-8 w-full rounded-md border border-input bg-background px-2 text-xs">
            <option value="">{i18n.t('common.selectOption')}</option>
            {#each options as option, index (index)}<option value={enumToken(index)}>{String(option)}</option>{/each}
          </select>
        {:else if node.type === 'null'}
          <input id={id} disabled={fieldLocked} aria-invalid={error ? 'true' : undefined} aria-describedby={[descriptionId, errorId].filter(Boolean).join(' ') || undefined} type="text" value="null" readonly />
        {:else if type === 'boolean'}
          <input id={id} name={path.join('.')} disabled={fieldLocked} aria-invalid={error ? 'true' : undefined} aria-describedby={[descriptionId, errorId].filter(Boolean).join(' ') || undefined} type="checkbox" checked={Boolean(current)} onchange={(event) => writePath(path, event.currentTarget.checked)} />
        {:else if type === 'number' || type === 'integer'}
          <input id={id} name={path.join('.')} disabled={fieldLocked} aria-invalid={error ? 'true' : undefined} aria-describedby={[descriptionId, errorId].filter(Boolean).join(' ') || undefined} type="number" step={type === 'integer' ? 1 : 'any'} min={node.minimum} max={node.maximum} required={required} value={current == null ? '' : String(current)} oninput={(event) => writeNumber(path, event.currentTarget)} class="h-8 w-full rounded-md border border-input bg-background px-2 text-xs" />
        {:else}
          <input id={id} name={path.join('.')} disabled={fieldLocked} aria-invalid={error ? 'true' : undefined} aria-describedby={[descriptionId, errorId].filter(Boolean).join(' ') || undefined} type="text" minlength={node.minLength} maxlength={node.maxLength} required={required} value={String(current ?? '')} oninput={(event) => writePath(path, event.currentTarget.value)} class="h-8 w-full rounded-md border border-input bg-background px-2 text-xs" />
        {/if}
        {#if error}<p id={errorId}>{i18n.t('validation.invalidFormat')}</p>{/if}
      </div>
    {/if}
  {/snippet}

  <fieldset class="schema-form-fields space-y-4" disabled={locked}>
  {#if prepared.ok}
    {#if model.node?.kind === 'oneOf'}
      {@render renderField(resolvedSchema as JsonSchema, model.node, [], resolvedSchema?.title ?? '', false)}
    {:else}
      <div class="space-y-3.5">
        {#each Object.entries(resolvedSchema?.properties ?? {}) as [key, node] (key)}
          {@render renderField(node, model.node?.kind === 'object' ? model.node.properties[key] : undefined, [key], node.title ?? key, resolvedSchema?.required?.includes(key) ?? false)}
        {/each}
      </div>
    {/if}
  {/if}
  <div class="pt-4 border-t border-border/60 flex justify-end">
    <Button type="submit" size="sm" disabled={locked} class="gap-1 min-w-24">
      {#if isSubmitting}<Loader2 class="h-3.5 w-3.5 animate-spin" />{/if}
      {submitText}
    </Button>
  </div>
  </fieldset>
</form>

<style>
  .schema-form-fields { min-width: 0; margin: 0; padding: 0; border: 0; }
</style>
