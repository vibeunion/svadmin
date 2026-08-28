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
  <div class="relative flex items-center w-full">
    <input
      bind:this={inputRef}
      type={field.type === 'number' ? 'number' : 'text'}
      bind:value={editValue}
      onkeydown={handleKeydown}
      onblur={handleBlur}
      disabled={saving}
      aria-label={`Edit ${fieldLabel}`}
      class="h-7 w-full rounded border bg-background px-2 text-sm outline-none ring-1 ring-primary/50 focus:ring-2 focus:ring-primary transition-all disabled:opacity-60"
    />
    {#if saving}
      <span class="absolute right-2 flex items-center pointer-events-none" role="status" aria-label="Saving...">
        <Loader2 class="size-3.5 animate-spin text-muted-foreground" aria-hidden="true" />
      </span>
    {/if}
  </div>
{:else}
  <span
    class="inline-flex items-center cursor-pointer rounded px-1.5 py-0.5 -mx-1 text-sm text-foreground hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 transition-colors"
    ondblclick={startEdit}
    title={`Double-click or press Enter to edit ${fieldLabel}`}
    role="button"
    tabindex="0"
    aria-label={`Edit ${fieldLabel}: ${value != null && value !== '' ? String(value) : 'empty'}`}
    onkeydown={(e) => { if (e.key === 'Enter' || e.key === 'F2' || e.key === ' ') { e.preventDefault(); startEdit(); } }}
  >
    {value != null && value !== '' ? String(value) : '—'}
  </span>
{/if}
