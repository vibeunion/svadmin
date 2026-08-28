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
  class={cn('space-y-4 rounded-xl border border-border bg-card p-6 shadow-xs text-xs', className)}
>
  {#if schema.title}
    <div class="pb-2 border-b border-border/60">
      <h3 class="text-sm font-semibold text-foreground">{schema.title}</h3>
      {#if schema.description}
        <p class="text-xs text-muted-foreground mt-0.5">{schema.description}</p>
      {/if}
    </div>
  {/if}

  <div class="space-y-3.5">
    {#each properties as field (field.key)}
      <div class="space-y-1">
        <label for="json_field_{field.key}" class="block font-medium text-foreground">
          {field.title}
          {#if field.required}
            <span class="text-destructive">*</span>
          {/if}
        </label>

        {#if field.description}
          <p class="text-[11px] text-muted-foreground">{field.description}</p>
        {/if}

        {#if field.enum}
          <select
            id="json_field_{field.key}"
            required={field.required}
            value={String(value[field.key] ?? field.default ?? '')}
            onchange={(e) => updateValue(field.key, e.currentTarget.value)}
            class="h-8 w-full rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Select an option...</option>
            {#each field.enum as option (option)}
              <option value={String(option)}>{option}</option>
            {/each}
          </select>
        {:else if field.type === 'boolean'}
          <div class="flex items-center gap-2 pt-1">
            <input
              id="json_field_{field.key}"
              type="checkbox"
              checked={Boolean(value[field.key] ?? field.default)}
              onchange={(e) => updateValue(field.key, e.currentTarget.checked)}
              class="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
            />
            <span class="text-xs text-muted-foreground">{field.title}</span>
          </div>
        {:else if field.type === 'number' || field.type === 'integer'}
          <input
            id="json_field_{field.key}"
            type="number"
            required={field.required}
            value={Number(value[field.key] ?? field.default ?? 0)}
            oninput={(e) => updateValue(field.key, Number(e.currentTarget.value))}
            class="h-8 w-full rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        {:else}
          <input
            id="json_field_{field.key}"
            type="text"
            required={field.required}
            value={String(value[field.key] ?? field.default ?? '')}
            oninput={(e) => updateValue(field.key, e.currentTarget.value)}
            class="h-8 w-full rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        {/if}
      </div>
    {/each}
  </div>

  <div class="pt-4 border-t border-border/60 flex justify-end">
    <Button type="submit" size="sm" disabled={isSubmitting} class="gap-1 min-w-24">
      {#if isSubmitting}
        <Loader2 class="h-3.5 w-3.5 animate-spin" />
      {/if}
      {submitText}
    </Button>
  </div>
</form>
