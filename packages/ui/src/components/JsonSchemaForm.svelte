<script lang="ts">
  import { Button } from './ui/button/index.js';
  import { Loader2 } from '@lucide/svelte';
  import { cn } from '../utils.js';

  interface Props {
    schema: Record<string, unknown>;
    value?: Record<string, unknown>;
    onsubmit?: (data: Record<string, unknown>) => void | Promise<void>;
    submitText?: string;
    class?: string;
  }

  let {
    schema,
    value = $bindable({}),
    onsubmit,
    submitText = 'Submit Form',
    class: className = '',
  }: Props = $props();

  let isSubmitting = $state(false);

  interface FieldMeta {
    key: string;
    title: string;
    description?: string;
    type: string;
    enum?: Array<string | number>;
    required?: boolean;
    default?: unknown;
  }

  const properties = $derived.by<FieldMeta[]>(() => {
    const propsObj = (schema.properties ?? {}) as Record<string, Record<string, unknown>>;
    const requiredKeys = Array.isArray(schema.required) ? (schema.required as string[]) : [];

    return Object.entries(propsObj).map(([key, propDef]) => ({
      key,
      title: String(propDef.title ?? key),
      description: propDef.description ? String(propDef.description) : undefined,
      type: String(propDef.type ?? 'string'),
      enum: Array.isArray(propDef.enum) ? (propDef.enum as Array<string | number>) : undefined,
      required: requiredKeys.includes(key),
      default: propDef.default,
    }));
  });

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    isSubmitting = true;
    try {
      await onsubmit?.(value);
    } finally {
      isSubmitting = false;
    }
  }

  function updateValue(key: string, val: unknown) {
    value = {
      ...value,
      [key]: val,
    };
  }
</script>

<form
  onsubmit={handleSubmit}
  class={cn('svadmin-u-3e7ce58d64fa svadmin-u-a217b4eaa918 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-cd0ad9a56558 svadmin-u-0478c89a150f svadmin-u-cef5b893cf23 svadmin-u-359090c2d529', className)}
>
  {#if schema.title}
    <div class="svadmin-u-f4cc511ff0c1 svadmin-u-65fdbade2025 svadmin-u-05faf5c801ff">
      <h3 class="svadmin-u-fc7473ca09eb svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{schema.title}</h3>
      {#if schema.description}
        <p class="svadmin-u-359090c2d529 svadmin-u-bfa603190748 svadmin-u-15e1b1f444fe">{schema.description}</p>
      {/if}
    </div>
  {/if}

  <div class="svadmin-u-9c6cdfa2ba3d">
    {#each properties as field (field.key)}
      <div class="svadmin-u-da7c36cd8867">
        <label for="json_field_{field.key}" class="svadmin-u-0214b4b355d1 svadmin-u-2689f3958069 svadmin-u-d4108abe6359">
          {field.title}
          {#if field.required}
            <span class="svadmin-u-811148b13d1e">*</span>
          {/if}
        </label>

        {#if field.description}
          <p class="svadmin-u-d058ca6de60f svadmin-u-bfa603190748">{field.description}</p>
        {/if}

        {#if field.enum}
          <select
            id="json_field_{field.key}"
            required={field.required}
            value={String(value[field.key] ?? field.default ?? '')}
            onchange={(e) => updateValue(field.key, e.currentTarget.value)}
            class="svadmin-u-ed8a5df7b2fb svadmin-u-6da6a3c3f741 svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-e5795dad4d22 svadmin-u-e6f9e383a762 svadmin-u-d5eab218aa34 svadmin-u-359090c2d529 svadmin-u-f10f771f87e9 svadmin-u-3e94a98e1466 svadmin-u-9c1295a6914a"
          >
            <option value="">Select an option...</option>
            {#each field.enum as option (option)}
              <option value={String(option)}>{option}</option>
            {/each}
          </select>
        {:else if field.type === 'boolean'}
          <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-6b7d6e21ccbd">
            <input
              id="json_field_{field.key}"
              type="checkbox"
              checked={Boolean(value[field.key] ?? field.default)}
              onchange={(e) => updateValue(field.key, e.currentTarget.checked)}
              class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-07389a777c1f svadmin-u-18049387f0af svadmin-u-20aaf08a7ed1 svadmin-u-4df2b13689a4 svadmin-u-34516836730d"
            />
            <span class="svadmin-u-359090c2d529 svadmin-u-bfa603190748">{field.title}</span>
          </div>
        {:else if field.type === 'number' || field.type === 'integer'}
          <input
            id="json_field_{field.key}"
            type="number"
            required={field.required}
            value={Number(value[field.key] ?? field.default ?? 0)}
            oninput={(e) => updateValue(field.key, Number(e.currentTarget.value))}
            class="svadmin-u-ed8a5df7b2fb svadmin-u-6da6a3c3f741 svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-e5795dad4d22 svadmin-u-e6f9e383a762 svadmin-u-d5eab218aa34 svadmin-u-359090c2d529 svadmin-u-f10f771f87e9 svadmin-u-3e94a98e1466 svadmin-u-9c1295a6914a"
          />
        {:else}
          <input
            id="json_field_{field.key}"
            type="text"
            required={field.required}
            value={String(value[field.key] ?? field.default ?? '')}
            oninput={(e) => updateValue(field.key, e.currentTarget.value)}
            class="svadmin-u-ed8a5df7b2fb svadmin-u-6da6a3c3f741 svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-e5795dad4d22 svadmin-u-e6f9e383a762 svadmin-u-d5eab218aa34 svadmin-u-359090c2d529 svadmin-u-f10f771f87e9 svadmin-u-3e94a98e1466 svadmin-u-9c1295a6914a"
          />
        {/if}
      </div>
    {/each}
  </div>

  <div class="svadmin-u-173fa8f06789 svadmin-u-b950dda299d3 svadmin-u-05faf5c801ff svadmin-u-60fbb7713999 svadmin-u-77c08e015d14">
    <Button type="submit" size="sm" disabled={isSubmitting} class="svadmin-u-44ee8ba0a421 svadmin-u-25effcb585ab">
      {#if isSubmitting}
        <Loader2 class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-afbdd13a380e" />
      {/if}
      {submitText}
    </Button>
  </div>
</form>
