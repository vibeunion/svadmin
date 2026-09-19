<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import { Button } from './ui/button/index.js';
  import { Loader2 } from '@lucide/svelte';
  import { cn } from '../utils.js';
  import {
    readSchemaForm, schemaFormValues, validateSchemaForm, schemaFormSnapshot,
    parseSchemaNumber, enumIndex, enumValue,
    type SchemaFormField, type SchemaFormIssue, type SchemaIssueCode,
  } from './enterprise/json-schema-form.js';

  interface Props {
    schema: Record<string, unknown>;
    value?: Record<string, unknown>;
    onsubmit?: (data: Record<string, unknown>) => void | Promise<void>;
    onvalidationerror?: (issues: SchemaFormIssue[]) => void;
    onerror?: (error: unknown) => void;
    submitText?: string;
    disabled?: boolean;
    readonly?: boolean;
    class?: string;
  }
  let { schema, value = $bindable({}), onsubmit, onvalidationerror, onerror, submitText,
    disabled = false, readonly = false, class: className = '' }: Props = $props();
  const uid = $props.id();
  const i18n = useTranslation();
  const chinese = $derived(i18n.locale.startsWith('zh'));
  const model = $derived(readSchemaForm(schema));
  const current = $derived(schemaFormValues(model, value));
  let isSubmitting = $state(false);
  let attempted = $state(false);
  let submitFailed = $state(false);
  let invalidInputs = $state<Record<string, boolean>>({});
  const issues = $derived([
    ...validateSchemaForm(model, current),
    ...Object.keys(invalidInputs).filter((key) => invalidInputs[key]).map((key): SchemaFormIssue => ({ path: pathFor(key), code: 'invalid-value' })),
  ]);
  const visibleIssues = $derived(model.issues.length ? model.issues : attempted ? issues : []);
  const inputClass = 'svadmin-u-ed8a5df7b2fb svadmin-u-6da6a3c3f741 svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-e5795dad4d22 svadmin-u-e6f9e383a762 svadmin-u-d5eab218aa34 svadmin-u-359090c2d529 svadmin-u-f10f771f87e9 svadmin-u-3e94a98e1466 svadmin-u-9c1295a6914a';

  function pathFor(key: string): string { return `/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`; }
  function message(code: SchemaIssueCode): string {
    const labels: Record<SchemaIssueCode, [string, string]> = {
      'unsupported-schema': ['当前表单不支持此 Schema 关键字或字段类型', 'This schema keyword or field type is not supported'],
      'invalid-schema': ['Schema 定义无效', 'Invalid schema definition'],
      required: ['请填写必填字段', 'A required field is missing'], type: ['值类型不匹配', 'Incorrect value type'],
      enum: ['请选择有效选项', 'Choose a valid option'], minimum: ['值低于允许下限', 'Value is below the allowed minimum'],
      maximum: ['值超过允许上限', 'Value exceeds the allowed maximum'], multipleOf: ['值不符合步长约束', 'Value does not satisfy the multiple constraint'],
      minLength: ['文本过短', 'Text is too short'], maxLength: ['文本过长', 'Text is too long'],
      additionalProperties: ['包含未声明的字段', 'An undeclared field is present'], 'invalid-value': ['值无法安全提交', 'The value cannot be submitted safely'],
    };
    return labels[code][chinese ? 0 : 1];
  }
  function fieldError(field: SchemaFormField): string {
    const issue = visibleIssues.find((item) => item.path === pathFor(field.key));
    return issue ? message(issue.code) : '';
  }
  function updateValue(key: string, next: unknown): void {
    if (disabled || readonly || isSubmitting || model.fields.find((field) => field.key === key)?.readonly) return;
    value = { ...current, [key]: next };
    invalidInputs = { ...invalidInputs, [key]: false };
    submitFailed = false;
  }
  function updateNumber(key: string, input: HTMLInputElement): void {
    try {
      if (input.validity.badInput) throw new Error('invalid-value');
      updateValue(key, parseSchemaNumber(input.value));
    } catch {
      updateValue(key, undefined);
      invalidInputs = { ...invalidInputs, [key]: true };
      attempted = true;
    }
  }
  async function handleSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (disabled || readonly || isSubmitting) return;
    attempted = true;
    submitFailed = false;
    if (issues.length) { onvalidationerror?.(issues); return; }
    let snapshot: Record<string, unknown>;
    try { snapshot = schemaFormSnapshot(current); }
    catch { onvalidationerror?.([{ path: '', code: 'invalid-value' }]); submitFailed = true; return; }
    // 输入显示、绑定值与提交负载使用同一套默认值；回调接收独立快照。
    value = { ...current };
    const submittedValue = value, submittedSchema = schema;
    isSubmitting = true;
    try { await onsubmit?.(snapshot); }
    catch (error) {
      if (schema === submittedSchema && value === submittedValue) submitFailed = true;
      onerror?.(error);
    } finally { isSubmitting = false; }
  }
</script>

<form onsubmit={handleSubmit} novalidate aria-busy={isSubmitting} data-testid="json-schema-form"
  class={cn('svadmin-u-3e7ce58d64fa svadmin-u-a217b4eaa918 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-cd0ad9a56558 svadmin-u-0478c89a150f svadmin-u-cef5b893cf23 svadmin-u-359090c2d529', className)}>
  {#if schema['title']}
    <div class="svadmin-u-f4cc511ff0c1 svadmin-u-65fdbade2025 svadmin-u-05faf5c801ff">
      <h3 class="svadmin-u-fc7473ca09eb svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{String(schema['title'])}</h3>
      {#if schema['description']}<p class="svadmin-u-359090c2d529 svadmin-u-bfa603190748">{String(schema['description'])}</p>{/if}
    </div>
  {/if}
  {#if visibleIssues.length}
    <div role="alert" data-testid="schema-form-errors" class="svadmin-u-811148b13d1e">
      {#each visibleIssues as issue, index (`${issue.path}-${issue.code}-${index}`)}
        <p>{issue.path || '/'}: {message(issue.code)}</p>
      {/each}
    </div>
  {/if}
  {#if submitFailed}<p role="alert">{chinese ? '提交失败，请检查数据后重试。' : 'Submission failed. Check the data and retry.'}</p>{/if}
  <div class="svadmin-u-9c6cdfa2ba3d">
    {#each model.fields as field, index (field.key)}
      {@const id = `${uid}-field-${index}`}
      {@const error = fieldError(field)}
      {@const locked = disabled || readonly || isSubmitting || field.readonly}
      {@const describedBy = [field.description ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined}
      <div class="svadmin-u-da7c36cd8867" data-schema-field={field.key}>
        <label for={id} class="svadmin-u-0214b4b355d1 svadmin-u-2689f3958069 svadmin-u-d4108abe6359">
          {field.title}{#if field.required}<span aria-hidden="true" class="svadmin-u-811148b13d1e"> *</span>{/if}
        </label>
        {#if field.description}<p id={`${id}-hint`} class="svadmin-u-d058ca6de60f svadmin-u-bfa603190748">{field.description}</p>{/if}
        {#if field.choices}
          <select id={id} name={field.key} class={inputClass} disabled={locked} aria-required={field.required} aria-invalid={!!error} aria-describedby={describedBy}
            value={enumIndex(field.choices, current[field.key])} onchange={(event) => updateValue(field.key, enumValue(field.choices ?? [], event.currentTarget.value))}>
            <option value="">{chinese ? '请选择' : 'Select an option'}</option>
            {#each field.choices as option, choiceIndex (choiceIndex)}<option value={String(choiceIndex)}>{String(option)}</option>{/each}
          </select>
        {:else if field.type === 'boolean'}
          <input id={id} name={field.key} type="checkbox" disabled={locked} checked={current[field.key] === true}
            aria-required={field.required} aria-invalid={!!error} aria-describedby={describedBy}
            onchange={(event) => updateValue(field.key, event.currentTarget.checked)} />
        {:else if field.type === 'number' || field.type === 'integer'}
          <input id={id} name={field.key} type="number" class={inputClass} disabled={locked} step={field.type === 'integer' ? 1 : 'any'}
            value={typeof current[field.key] === 'number' ? current[field.key] as number : ''}
            aria-required={field.required} aria-invalid={!!error} aria-describedby={describedBy}
            oninput={(event) => updateNumber(field.key, event.currentTarget)} />
        {:else}
          <input id={id} name={field.key} type="text" class={inputClass} disabled={locked} value={String(current[field.key] ?? '')}
            aria-required={field.required} aria-invalid={!!error} aria-describedby={describedBy}
            oninput={(event) => updateValue(field.key, event.currentTarget.value)} />
        {/if}
        {#if field.nullable && !field.choices}
          <Button type="button" size="sm" variant="ghost" disabled={locked} aria-pressed={current[field.key] === null}
            onclick={() => updateValue(field.key, current[field.key] === null ? undefined : null)}>
            {current[field.key] === null ? 'null' : chinese ? '设为空值' : 'Set null'}
          </Button>
        {/if}
        {#if error}<p id={`${id}-error`} class="svadmin-u-811148b13d1e">{error}</p>{/if}
      </div>
    {/each}
  </div>
  <div class="svadmin-u-173fa8f06789 svadmin-u-b950dda299d3 svadmin-u-05faf5c801ff svadmin-u-60fbb7713999 svadmin-u-77c08e015d14">
    <Button type="submit" size="sm" disabled={disabled || readonly || isSubmitting || model.issues.length > 0}>
      {#if isSubmitting}<Loader2 class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-afbdd13a380e" aria-hidden="true" />{/if}
      {submitText ?? (chinese ? '提交表单' : 'Submit Form')}
    </Button>
  </div>
</form>
