<script lang="ts">
  import { useUpdate } from '@svadmin/core';
  import type { FieldDefinition } from '@svadmin/core';
  import { Loader2 } from '@lucide/svelte';

  interface Props {
    resourceName: string;
    recordId: string | number;
    field: FieldDefinition;
    value: unknown;
    /** Callback after successful save */
    onSave?: (newValue: unknown) => void;
  }

  let { resourceName, recordId, field, value, onSave }: Props = $props();

  let editing = $state(false);
  let editValue = $state('');
  let inputRef = $state<HTMLInputElement | null>(null);
  let saving = $state(false);
  let savePending = false;
  const displayValue = $derived(String(value ?? ''));
  const fieldLabel = $derived(field.label || field.key);

  const { mutation } = useUpdate({ get resource() { return resourceName; } });

  function startEdit() {
    if (field.type === 'number' || field.type === 'text' || field.type === 'url' || field.type === 'email') {
      editing = true;
      editValue = displayValue;
      // Focus input on next tick
      setTimeout(() => inputRef?.focus(), 0);
    }
  }

  async function save() {
    if (!editing || saving || savePending) return;
    const newValue = field.type === 'number' ? (editValue.trim() === '' ? null : (() => { const n = Number(editValue); return isNaN(n) ? value : n; })()) : editValue;
    if (newValue === value) {
      editing = false;
      return;
    }
    savePending = true;
    saving = true;
    try {
      await mutation.mutateAsync({
        id: recordId,
        resource: resourceName,
        variables: { [field.key]: newValue },
      });
      editing = false;
      onSave?.(newValue);
    } catch {
      // Keep editing on error
    } finally {
      saving = false;
      savePending = false;
    }
  }

  function cancel() {
    editing = false;
    editValue = displayValue;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      save();
    }
    if (e.key === 'Escape') cancel();
  }

  function handleBlur() {
    if (!savePending) save();
  }
</script>

{#if editing}
  <div class="svadmin-u-d89972fe17d6 svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-6da6a3c3f741">
    <input
      bind:this={inputRef}
      type={field.type === 'number' ? 'number' : 'text'}
      bind:value={editValue}
      onkeydown={handleKeydown}
      onblur={handleBlur}
      disabled={saving}
      aria-label={fieldLabel}
      class="svadmin-u-d0a52b312f7d svadmin-u-6da6a3c3f741 svadmin-u-07389a777c1f svadmin-u-ca6bcd4b6f3f svadmin-u-e6f9e383a762 svadmin-u-d5eab218aa34 svadmin-u-fc7473ca09eb svadmin-u-df37b1fd9495 svadmin-u-3daca9af0861 svadmin-u-f42e9fee68a1 svadmin-u-608dd26cd5ba svadmin-u-1a5f9520d7fa svadmin-u-0fe7d7d814d0 svadmin-u-d463b664011d"
    />
    {#if saving}
      <span class="svadmin-u-da4dbfbc4fdc svadmin-u-7b2d63937d23 svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-a4326536b8f5" role="status" aria-label="Saving...">
        <Loader2 class="svadmin-u-783b0d9d1e2c svadmin-u-afbdd13a380e svadmin-u-bfa603190748" aria-hidden="true" />
      </span>
    {/if}
  </div>
{:else}
  <span
    class="svadmin-u-52083e7da442 svadmin-u-3960ffc248d9 svadmin-u-34516836730d svadmin-u-07389a777c1f svadmin-u-45d828117213 svadmin-u-465609a240a8 svadmin-u-76610325273f svadmin-u-fc7473ca09eb svadmin-u-d4108abe6359 svadmin-u-2a6233dc87a9 svadmin-u-f10f771f87e9 svadmin-u-793c80e97ffb svadmin-u-9c1295a6914a svadmin-u-ce4edccf4cbb svadmin-u-ceb69a6b0e5f"
    ondblclick={startEdit}
    title={`Double-click to edit ${fieldLabel}`}
    role="button"
    tabindex="0"
    onkeydown={(e) => { if (e.key === 'Enter' || e.key === 'F2') { e.preventDefault(); startEdit(); } }}
  >
    {value != null && value !== '' ? String(value) : '—'}
  </span>
{/if}
