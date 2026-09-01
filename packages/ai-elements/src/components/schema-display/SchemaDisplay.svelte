<script module lang="ts">
  export interface SchemaDefinition {
    title?: string;
    description?: string;
    type?: string | string[];
    format?: string;
    properties?: Record<string, SchemaDefinition>;
    items?: SchemaDefinition | SchemaDefinition[];
    required?: string[];
    enum?: unknown[];
    default?: unknown;
    examples?: unknown[];
    $ref?: string;
    allOf?: SchemaDefinition[];
    anyOf?: SchemaDefinition[];
    oneOf?: SchemaDefinition[];
    additionalProperties?: boolean | SchemaDefinition;
    [key: string]: unknown;
  }

  export interface SchemaRow {
    id: string;
    name: string;
    path: string;
    depth: number;
    schema: SchemaDefinition;
    required: boolean;
  }
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Braces, ChevronDown } from '@lucide/svelte';
  import { cn } from '../../utils.js';
  import SchemaDisplayContent from './SchemaDisplayContent.svelte';
  import SchemaDisplayDescription from './SchemaDisplayDescription.svelte';
  import SchemaDisplayHeader from './SchemaDisplayHeader.svelte';
  import SchemaDisplayMethod from './SchemaDisplayMethod.svelte';
  import SchemaDisplayParameters from './SchemaDisplayParameters.svelte';
  import SchemaDisplayPath from './SchemaDisplayPath.svelte';
  import SchemaDisplayRequest from './SchemaDisplayRequest.svelte';
  import SchemaDisplayResponse from './SchemaDisplayResponse.svelte';

  interface Props {
    schema?: SchemaDefinition;
    method?: import('./context.svelte.js').HttpMethod;
    path?: string;
    description?: string;
    parameters?: import('./context.svelte.js').SchemaParameter[];
    requestBody?: import('./context.svelte.js').SchemaProperty[];
    responseBody?: import('./context.svelte.js').SchemaProperty[];
    title?: string;
    rootName?: string;
    filter?: string;
    open?: boolean;
    class?: string;
    row?: Snippet<[SchemaRow]>;
    children?: Snippet;
    onpathclick?: (row: SchemaRow) => void;
  }

  let {
    schema = {},
    method = 'GET',
    path = '',
    description,
    parameters,
    requestBody,
    responseBody,
    title,
    rootName = 'root',
    filter = $bindable(''),
    open = $bindable(true),
    class: className = '',
    row: rowSnippet,
    children,
    onpathclick,
  }: Props = $props();

  import { provideSchemaDisplayContext } from './context.svelte.js';

  let showDescriptions = $state(true);
  const resolvedTitle = $derived(title ?? schema.title ?? 'Schema');
  const rows = $derived(flattenSchema(schema, rootName));
  const visibleRows = $derived(filter.trim()
    ? rows.filter((row) => `${row.path} ${row.schema.description ?? ''} ${schemaType(row.schema)}`.toLowerCase().includes(filter.trim().toLowerCase()))
    : rows);
  const endpointMode = $derived(Boolean(path || description || parameters?.length || requestBody?.length || responseBody?.length));
  provideSchemaDisplayContext({
    get method() { return method; },
    get path() { return path; },
    get description() { return description; },
    get parameters() { return parameters; },
    get requestBody() { return requestBody; },
    get responseBody() { return responseBody; },
  });

  function flattenSchema(root: SchemaDefinition, name: string): SchemaRow[] {
    const result: SchemaRow[] = [];
    const seen = new WeakSet<object>();

    function visit(current: SchemaDefinition, currentName: string, path: string, depth: number, required: boolean): void {
      result.push({ id: path, name: currentName, path, depth, schema: current, required });
      if (seen.has(current)) return;
      seen.add(current);

      const requiredNames = new Set(current.required ?? []);
      for (const [propertyName, propertySchema] of Object.entries(current.properties ?? {})) {
        visit(propertySchema, propertyName, `${path}.${propertyName}`, depth + 1, requiredNames.has(propertyName));
      }
      const items = Array.isArray(current.items) ? current.items : current.items ? [current.items] : [];
      items.forEach((item, index) => visit(item, `item${items.length > 1 ? ` ${index + 1}` : ''}`, `${path}[${index}]`, depth + 1, true));
      (['allOf', 'anyOf', 'oneOf'] as const).forEach((keyword) => {
        current[keyword]?.forEach((entry, index) => visit(entry, `${keyword} ${index + 1}`, `${path}.${keyword}[${index}]`, depth + 1, false));
      });
    }

    visit(root, name, name, 1, true);
    return result;
  }

  function schemaType(value: SchemaDefinition): string {
    if (value.$ref) return value.$ref.split('/').at(-1) ?? '$ref';
    const type = Array.isArray(value.type) ? value.type.join(' | ') : value.type;
    return [type ?? (value.properties ? 'object' : 'unknown'), value.format].filter(Boolean).join(' · ');
  }

  function compactValue(value: unknown): string {
    try {
      const serialized = JSON.stringify(value);
      return serialized === undefined ? String(value) : serialized;
    } catch {
      return String(value);
    }
  }
</script>

{#if children}
<section class={cn('svadmin-ai-schema-display', 'svadmin-ai-schema-display--compound', className)} data-slot="schema-display">{@render children()}</section>
{:else if endpointMode}
<section class={cn('svadmin-ai-schema-display', 'svadmin-ai-schema-display--compound', className)} data-slot="schema-display">
  <SchemaDisplayHeader><SchemaDisplayMethod /><SchemaDisplayPath /></SchemaDisplayHeader>
  {#if description}<SchemaDisplayDescription />{/if}
  <SchemaDisplayContent>
    {#if parameters?.length}<SchemaDisplayParameters />{/if}
    {#if requestBody?.length}<SchemaDisplayRequest />{/if}
    {#if responseBody?.length}<SchemaDisplayResponse />{/if}
  </SchemaDisplayContent>
</section>
{:else}
<details class={cn('svadmin-ai-schema-display', className)} {open} ontoggle={(event) => { open = (event.currentTarget as HTMLDetailsElement).open; }}>
  <summary class="svadmin-ai-schema-display__summary">
    <span><ChevronDown size={15} aria-hidden="true" /><Braces size={15} aria-hidden="true" /><strong>{resolvedTitle}</strong></span>
    <small>{rows.length} fields</small>
  </summary>
  <div class="svadmin-ai-schema-display__content">
    <div class="svadmin-ai-schema-display__toolbar">
      <label><span class="svadmin-ai__sr-only">Filter schema fields</span><input class="svadmin-ai__input" type="search" bind:value={filter} placeholder="Filter fields" /></label>
      <label class="svadmin-ai-schema-display__toggle"><input type="checkbox" bind:checked={showDescriptions} /> Descriptions</label>
    </div>
    {#if schema.description && showDescriptions}<p class="svadmin-ai-schema-display__description">{schema.description}</p>{/if}
    <div class="svadmin-ai-schema-display__rows" aria-label={`${resolvedTitle} fields`}>
      {#each visibleRows as schemaRow (schemaRow.id)}
        <button type="button" class="svadmin-ai-schema-display__row" style={`--schema-depth: ${schemaRow.depth - 1}`} onclick={() => onpathclick?.(schemaRow)}>
          {#if rowSnippet}
            {@render rowSnippet(schemaRow)}
          {:else}
            <span class="svadmin-ai-schema-display__field">
              <strong>{schemaRow.name}</strong>
              {#if schemaRow.required}<span class="svadmin-ai-schema-display__required">required</span>{/if}
            </span>
            <code>{schemaType(schemaRow.schema)}</code>
            {#if schemaRow.schema.enum?.length}<small>enum {schemaRow.schema.enum.map(compactValue).join(', ')}</small>{/if}
            {#if schemaRow.schema.default !== undefined}<small>default {compactValue(schemaRow.schema.default)}</small>{/if}
            {#if showDescriptions && schemaRow.schema.description}<p>{schemaRow.schema.description}</p>{/if}
          {/if}
        </button>
      {:else}
        <p class="svadmin-ai-schema-display__empty">No fields match this filter.</p>
      {/each}
    </div>
  </div>
</details>
{/if}

<style>
  .svadmin-ai-schema-display { border: 1px solid var(--border, currentColor); border-radius: min(var(--radius, .5rem), .5rem); background: var(--card, transparent); color: var(--card-foreground, var(--foreground, currentColor)); }
  .svadmin-ai-schema-display__summary { display: flex; align-items: center; justify-content: space-between; gap: .75rem; padding: .7rem .8rem; cursor: pointer; list-style: none; }
  .svadmin-ai-schema-display__summary::-webkit-details-marker { display: none; }
  .svadmin-ai-schema-display__summary > span { display: inline-flex; align-items: center; gap: .45rem; font-size: .82rem; }
  .svadmin-ai-schema-display[open] .svadmin-ai-schema-display__summary > span > :first-child { transform: rotate(180deg); }
  .svadmin-ai-schema-display__summary small { color: var(--muted-foreground, currentColor); font-size: .7rem; }
  .svadmin-ai-schema-display__summary:focus-visible, .svadmin-ai-schema-display__row:focus-visible, .svadmin-ai__input:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: 2px; }
  .svadmin-ai-schema-display__content { border-top: 1px solid var(--border, currentColor); padding: .65rem; }
  .svadmin-ai-schema-display__toolbar { display: flex; align-items: center; gap: .75rem; margin-bottom: .6rem; }
  .svadmin-ai-schema-display__toolbar > :first-child { min-width: 0; flex: 1; }
  .svadmin-ai__input { min-height: 2.1rem; padding: .35rem .55rem; font-size: .76rem; }
  .svadmin-ai-schema-display__toggle { display: inline-flex; flex: none; align-items: center; gap: .35rem; color: var(--muted-foreground, currentColor); font-size: .72rem; }
  .svadmin-ai-schema-display__description { margin: .25rem 0 .65rem; color: var(--muted-foreground, currentColor); font-size: .76rem; line-height: 1.5; }
  .svadmin-ai-schema-display__rows { display: grid; gap: .2rem; }
  .svadmin-ai-schema-display__row { display: grid; width: 100%; grid-template-columns: minmax(8rem, 1fr) auto; align-items: baseline; gap: .2rem .75rem; padding: .5rem .55rem .5rem calc(.55rem + var(--schema-depth) * .9rem); border: 0; border-radius: min(var(--radius, .5rem), .35rem); background: transparent; color: inherit; text-align: left; font: inherit; cursor: pointer; }
  .svadmin-ai-schema-display__row:hover { background: var(--muted, transparent); }
  .svadmin-ai-schema-display__field { display: flex; min-width: 0; align-items: center; gap: .4rem; }
  .svadmin-ai-schema-display__field strong { overflow: hidden; font-size: .77rem; text-overflow: ellipsis; white-space: nowrap; }
  .svadmin-ai-schema-display__required { color: var(--destructive, currentColor); font-size: .64rem; font-weight: 600; }
  .svadmin-ai-schema-display__row code { color: var(--primary, currentColor); font-size: .7rem; }
  .svadmin-ai-schema-display__row small { color: var(--muted-foreground, currentColor); font-size: .68rem; }
  .svadmin-ai-schema-display__row p { grid-column: 1 / -1; margin: .08rem 0 0; color: var(--muted-foreground, currentColor); font-size: .7rem; line-height: 1.45; }
  .svadmin-ai-schema-display__empty { margin: 0; padding: .8rem; color: var(--muted-foreground, currentColor); font-size: .78rem; text-align: center; }
  .svadmin-ai-schema-display--compound { overflow: hidden; }
</style>
