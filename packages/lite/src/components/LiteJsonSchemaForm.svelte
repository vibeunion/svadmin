<script lang="ts">
  interface Props {
    schema: Record<string, unknown>;
    value?: Record<string, unknown>;
    action?: string;
    method?: 'get' | 'post' | 'dialog' | 'GET' | 'POST' | 'DIALOG' | null;
    submitText?: string;
  }

  let {
    schema,
    value = {},
    action = '',
    method = 'POST',
    submitText = 'Submit Form',
  }: Props = $props();

  interface FieldMeta {
    key: string;
    title: string;
    type: string;
    enum?: Array<string | number>;
    required?: boolean;
  }

  const properties = $derived.by<FieldMeta[]>(() => {
    const propsObj = (schema.properties ?? {}) as Record<string, Record<string, unknown>>;
    const requiredKeys = Array.isArray(schema.required) ? (schema.required as string[]) : [];

    return Object.entries(propsObj).map(([key, propDef]) => ({
      key,
      title: String(propDef.title ?? key),
      type: String(propDef.type ?? 'string'),
      enum: Array.isArray(propDef.enum) ? (propDef.enum as Array<string | number>) : undefined,
      required: requiredKeys.includes(key),
    }));
  });
</script>

<div class="lite-schema-form-card">
  {#if schema.title}
    <div class="lite-schema-form-header">
      <strong>{schema.title}</strong>
    </div>
  {/if}

  <form {action} {method} class="lite-schema-form">
    {#each properties as field (field.key)}
      <div class="lite-schema-field">
        <label for="lite_json_{field.key}" class="lite-label">
          {field.title} {#if field.required}<span style="color: #ef4444;">*</span>{/if}
        </label>
        {#if field.enum}
          <select id="lite_json_{field.key}" name={field.key} class="lite-select" required={field.required}>
            {#each field.enum as option (option)}
              <option value={String(option)} selected={String(value[field.key]) === String(option)}>
                {option}
              </option>
            {/each}
          </select>
        {:else if field.type === 'boolean'}
          <input id="lite_json_{field.key}" type="checkbox" name={field.key} checked={Boolean(value[field.key])} />
        {:else if field.type === 'number' || field.type === 'integer'}
          <input id="lite_json_{field.key}" type="number" name={field.key} value={Number(value[field.key] ?? 0)} class="lite-input" required={field.required} />
        {:else}
          <input id="lite_json_{field.key}" type="text" name={field.key} value={String(value[field.key] ?? '')} class="lite-input" required={field.required} />
        {/if}
      </div>
    {/each}

    <div class="lite-schema-footer">
      <button type="submit" class="lite-btn lite-btn-primary lite-btn-sm">
        {submitText}
      </button>
    </div>
  </form>
</div>

<style>
  .lite-schema-form-card {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 16px;
    margin-bottom: 16px;
  }
  .lite-schema-form-header {
    padding-bottom: 8px;
    border-bottom: 1px solid #e2e8f0;
    margin-bottom: 12px;
    font-size: 14px;
  }
  .lite-schema-field {
    margin-bottom: 12px;
  }
  .lite-schema-footer {
    display: flex;
    justify-content: flex-end;
    padding-top: 12px;
    border-top: 1px solid #e2e8f0;
  }
</style>
