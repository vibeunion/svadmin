<script lang="ts">
  import { untrack } from 'svelte';
  import {
    Database,
    Plus,
    Trash2,
    Code2,
    Copy,
    Check,
    FileJson,
    Sparkles,
    Settings2,
  } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { cn } from '../utils.js';
  import { Button } from './ui/button/index.js';

  export interface SchemaFieldModel {
    key: string;
    label: string;
    type: 'text' | 'number' | 'boolean' | 'date' | 'select' | 'relation';
    required: boolean;
    filterable: boolean;
    sortable: boolean;
  }

  export interface SchemaVisualModelerProps {
    resourceName?: string | undefined;
    initialFields?: SchemaFieldModel[] | undefined;
    class?: string | undefined;
    onSaveSchema?: ((resourceName: string, fields: SchemaFieldModel[]) => void) | undefined;
  }

  let {
    resourceName = 'Customer',
    initialFields = [
      { key: 'id', label: 'ID', type: 'number', required: true, filterable: true, sortable: true },
      { key: 'name', label: 'Name', type: 'text', required: true, filterable: true, sortable: true },
      { key: 'email', label: 'Email', type: 'text', required: false, filterable: true, sortable: false },
    ],
    class: className = '',
    onSaveSchema,
  }: SchemaVisualModelerProps = $props();

  const i18n = useTranslation();
  const chinese = $derived(i18n.locale.startsWith('zh'));

  let activeTab = $state<'visual' | 'sql' | 'code'>('visual');
  let nameState = $state(untrack(() => resourceName));
  let fields = $state<SchemaFieldModel[]>(untrack(() => JSON.parse(JSON.stringify(initialFields))));
  let rawImportText = $state('');
  let isCopied = $state(false);

  function addField() {
    fields = [
      ...fields,
      {
        key: `field_${fields.length + 1}`,
        label: `Field ${fields.length + 1}`,
        type: 'text',
        required: false,
        filterable: true,
        sortable: false,
      },
    ];
  }

  function removeField(idx: number) {
    fields = fields.filter((_, i) => i !== idx);
  }

  function inferFromJSON(jsonStr: string) {
    try {
      const parsed: unknown = JSON.parse(jsonStr);
      const targetObj = Array.isArray(parsed) ? parsed[0] : parsed;
      if (!targetObj || typeof targetObj !== 'object') return;

      const newFields: SchemaFieldModel[] = Object.entries(targetObj as Record<string, unknown>).map(
        ([key, val]) => {
          let type: SchemaFieldModel['type'] = 'text';
          if (typeof val === 'number') type = 'number';
          else if (typeof val === 'boolean') type = 'boolean';
          else if (typeof val === 'string' && /\d{4}-\d{2}-\d{2}/.test(val)) type = 'date';

          return {
            key,
            label: key.charAt(0).toUpperCase() + key.slice(1),
            type,
            required: key === 'id',
            filterable: true,
            sortable: type === 'number' || type === 'date',
          };
        },
      );

      if (newFields.length > 0) {
        fields = newFields;
        activeTab = 'visual';
      }
    } catch {
      // JSON parse error
    }
  }

  const generatedCode = $derived.by(() => {
    const fieldsStr = fields
      .map(
        (f) =>
          `    { key: '${f.key}', label: '${f.label}', type: '${f.type}', required: ${f.required}, filterable: ${f.filterable}, sortable: ${f.sortable} },`,
      )
      .join('\n');

    return `import { defineResource } from '@svadmin/core';\n\nexport const ${nameState.toLowerCase()}Resource = defineResource({\n  name: '${nameState.toLowerCase()}',\n  label: '${nameState}',\n  fields: [\n${fieldsStr}\n  ],\n});`;
  });

  async function copyCode() {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(generatedCode);
      isCopied = true;
      setTimeout(() => {
        isCopied = false;
      }, 1500);
    }
  }
</script>

<div
  data-svadmin-component="SchemaVisualModeler"
  class={cn(
    'w-full rounded-2xl border border-border bg-card text-card-foreground shadow-xs overflow-hidden flex flex-col',
    className,
  )}
>
  <!-- Header Bar -->
  <div class="flex items-center justify-between border-b border-border/70 px-6 py-4 bg-card">
    <div class="flex items-center gap-2.5">
      <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
        <Database class="h-5 w-5" />
      </div>
      <div>
        <h3 class="text-base font-semibold text-foreground">
          {chinese ? 'Schema 可视化建模与代码生成器' : 'Visual Resource Schema Modeler'}
        </h3>
        <p class="text-xs text-muted-foreground">
          {chinese ? '交互式字段编排、JSON/SQL 逆向推断与 TypeScript 契约导出' : 'Design fields, reverse-engineer JSON, export TypeScript contracts'}
        </p>
      </div>
    </div>

    <!-- Mode Tabs -->
    <div class="flex rounded-lg border border-border bg-muted/40 p-1 text-xs">
      <button
        type="button"
        onclick={() => (activeTab = 'visual')}
        class={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all',
          activeTab === 'visual' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <Settings2 class="h-3.5 w-3.5" />
        <span>{chinese ? '可视化建模' : 'Visual'}</span>
      </button>

      <button
        type="button"
        onclick={() => (activeTab = 'sql')}
        class={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all',
          activeTab === 'sql' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <FileJson class="h-3.5 w-3.5" />
        <span>{chinese ? 'JSON 逆向推断' : 'JSON Infer'}</span>
      </button>

      <button
        type="button"
        onclick={() => (activeTab = 'code')}
        class={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all',
          activeTab === 'code' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <Code2 class="h-3.5 w-3.5" />
        <span>{chinese ? '生成的代码' : 'Code'}</span>
      </button>
    </div>
  </div>

  <!-- Body Content -->
  <div class="p-6 flex-1 overflow-y-auto">
    {#if activeTab === 'visual'}
      <div class="space-y-4">
        <div class="flex items-center gap-3">
          <label for="res-name" class="text-xs font-semibold text-foreground shrink-0">
            {chinese ? '资源英文名称:' : 'Resource Name:'}
          </label>
          <input
            id="res-name"
            type="text"
            bind:value={nameState}
            class="h-8 max-w-xs rounded-md border border-input bg-background px-2.5 text-xs font-mono font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <!-- Field Rows Table -->
        <div class="rounded-xl border border-border overflow-hidden">
          <table class="w-full text-left text-xs border-collapse">
            <thead class="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
              <tr>
                <th class="p-3 w-40">{chinese ? '字段标识 (Key)' : 'Field Key'}</th>
                <th class="p-3 w-40">{chinese ? '显示名称 (Label)' : 'Label'}</th>
                <th class="p-3 w-32">{chinese ? '数据类型' : 'Type'}</th>
                <th class="p-3 w-20 text-center">{chinese ? '必填' : 'Required'}</th>
                <th class="p-3 w-20 text-center">{chinese ? '可筛选' : 'Filterable'}</th>
                <th class="p-3 w-20 text-center">{chinese ? '可排序' : 'Sortable'}</th>
                <th class="p-3 w-16 text-center">{chinese ? '操作' : 'Action'}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border/60">
              {#each fields as field, idx (idx)}
                <tr class="hover:bg-muted/20">
                  <td class="p-2.5">
                    <input
                      type="text"
                      bind:value={field.key}
                      class="h-7 w-full rounded border border-input bg-background px-2 text-xs font-mono"
                    />
                  </td>
                  <td class="p-2.5">
                    <input
                      type="text"
                      bind:value={field.label}
                      class="h-7 w-full rounded border border-input bg-background px-2 text-xs"
                    />
                  </td>
                  <td class="p-2.5">
                    <select
                      bind:value={field.type}
                      class="h-7 w-full rounded border border-input bg-background px-1.5 text-xs"
                    >
                      <option value="text">text</option>
                      <option value="number">number</option>
                      <option value="boolean">boolean</option>
                      <option value="date">date</option>
                      <option value="select">select</option>
                      <option value="relation">relation</option>
                    </select>
                  </td>
                  <td class="p-2.5 text-center">
                    <input type="checkbox" bind:checked={field.required} />
                  </td>
                  <td class="p-2.5 text-center">
                    <input type="checkbox" bind:checked={field.filterable} />
                  </td>
                  <td class="p-2.5 text-center">
                    <input type="checkbox" bind:checked={field.sortable} />
                  </td>
                  <td class="p-2.5 text-center">
                    <button
                      type="button"
                      onclick={() => removeField(idx)}
                      class="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      aria-label="Delete field"
                    >
                      <Trash2 class="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        <div class="flex items-center justify-between pt-2">
          <Button type="button" variant="outline" size="sm" onclick={addField} class="gap-1 text-xs">
            <Plus class="h-3.5 w-3.5" />
            <span>{chinese ? '添加字段' : 'Add Field'}</span>
          </Button>

          {#if onSaveSchema}
            <Button
              type="button"
              size="sm"
              onclick={() => onSaveSchema(nameState, fields)}
              class="gap-1 text-xs"
            >
              <span>{chinese ? '保存并应用 Schema' : 'Save Schema'}</span>
            </Button>
          {/if}
        </div>
      </div>
    {:else if activeTab === 'sql'}
      <div class="space-y-3">
        <label for="json-sample" class="block text-xs font-semibold text-foreground">
          {chinese ? '粘贴 JSON 数据样例逆向推导字段结构:' : 'Paste sample JSON to infer fields:'}
        </label>
        <textarea
          id="json-sample"
          bind:value={rawImportText}
          placeholder="输入或粘贴 JSON 数据样例..."
          rows="8"
          class="w-full rounded-lg border border-input bg-muted/20 p-3 font-mono text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        ></textarea>
        <Button
          type="button"
          size="sm"
          onclick={() => inferFromJSON(rawImportText)}
          class="gap-1.5 text-xs"
        >
          <Sparkles class="h-3.5 w-3.5" />
          <span>{chinese ? '一键逆向解析推断' : 'Infer Fields from JSON'}</span>
        </Button>
      </div>
    {:else}
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-foreground">
            {chinese ? '生成的 Svelte 5 / @svadmin/core 资源代码:' : 'Generated Resource Code:'}
          </span>
          <Button variant="outline" size="sm" onclick={copyCode} class="gap-1.5 text-xs">
            {#if isCopied}
              <Check class="h-3.5 w-3.5 text-success" />
              <span>{chinese ? '已复制' : 'Copied'}</span>
            {:else}
              <Copy class="h-3.5 w-3.5" />
              <span>{chinese ? '复制代码' : 'Copy'}</span>
            {/if}
          </Button>
        </div>

        <pre class="rounded-xl border border-border bg-muted/40 p-4 font-mono text-xs text-foreground overflow-x-auto"><code>{generatedCode}</code></pre>
      </div>
    {/if}
  </div>
</div>
