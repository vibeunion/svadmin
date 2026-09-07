<script lang="ts">
  import type { FieldDefinition } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import { Button } from '../ui/button/index.js';
  import { Plus, Trash2 } from '@lucide/svelte';
  import TooltipButton from '../TooltipButton.svelte';
  import FieldRenderer from '../FieldRenderer.svelte';

  const i18n = useTranslation();

  let { field, value, onchange } = $props<{
    field: FieldDefinition;
    value: unknown;
    onchange: (val: unknown) => void;
  }>();

  const arrayVal = $derived(Array.isArray(value) ? value : []);
  const subFields = $derived(field.subFields || []);

  function getDefaultForType(type: string): unknown {
    switch (type) {
      case 'text': case 'textarea': case 'richtext': case 'image': return '';
      case 'number': return 0;
      case 'boolean': return false;
      case 'tags': case 'images': case 'multiselect': case 'array': return [];
      case 'json': return {};
      default: return '';
    }
  }

  function handleAdd() {
    const newItem: Record<string, unknown> = {};
    for (const f of subFields) {
      newItem[f.key] = f.defaultValue ?? getDefaultForType(f.type);
    }
    onchange([...arrayVal, newItem]);
  }

  function handleRemove(index: number) {
    onchange(arrayVal.filter((_, i) => i !== index));
  }

  function handleChange(index: number, key: string, val: unknown) {
    const next = [...arrayVal];
    next[index] = { ...next[index], [key]: val };
    onchange(next);
  }
</script>

<div class="svadmin-u-3e7ce58d64fa svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-a29b7a649c77 svadmin-u-8e63407b5ceb">
  <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc">
    <div class="svadmin-u-fc7473ca09eb svadmin-u-2689f3958069 svadmin-u-d4108abe6359">
      {field.label}
      {#if field.required}
        <span class="svadmin-u-811148b13d1e">*</span>
      {/if}
    </div>
    <Button variant="outline" size="sm" type="button" onclick={handleAdd}>
      <Plus class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-618162408e7a" /> {i18n.t('common.add') || 'Add'}
    </Button>
  </div>
  
  <div class="svadmin-u-3e7ce58d64fa svadmin-u-f46b61a9b310">
    {#each arrayVal as item, i (i)}
      <div class="svadmin-u-d89972fe17d6 svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-cd0ad9a56558 svadmin-u-8e63407b5ceb svadmin-u-30c1d058f0db svadmin-u-438b2237b8d6">
        <div class="svadmin-u-da4dbfbc4fdc svadmin-u-7b2d63937d23 svadmin-u-9a2db8f949b6">
          <TooltipButton tooltip={i18n.t('common.remove') || 'Remove'} variant="ghost" size="icon" class="svadmin-u-ed8a5df7b2fb svadmin-u-2bbcfc3b5179 svadmin-u-bfa603190748 svadmin-u-51e95020d6f2 svadmin-u-ceb69a6b0e5f" onclick={() => handleRemove(i)}>
            <Trash2 class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
          </TooltipButton>
        </div>
        <div class="svadmin-u-f3c543ad5fe9 svadmin-u-b39e60c339f4">
          {#each subFields as subField (subField.key)}
            <FieldRenderer
              field={subField}
              value={item[subField.key]}
              onchange={(val) => handleChange(i, subField.key, val)}
            />
          {/each}
        </div>
      </div>
    {/each}
    {#if arrayVal.length === 0}
      <div class="svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-940911bf310c svadmin-u-fc7473ca09eb svadmin-u-bfa603190748 svadmin-u-8a25a995eb8e svadmin-u-421ac2be5045">
        <span>{i18n.t('common.noData') || 'No items added yet.'}</span>
      </div>
    {/if}
  </div>
</div>
