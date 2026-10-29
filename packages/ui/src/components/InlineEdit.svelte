<script lang="ts">
  import { useUpdate, useResourceContract, captureAdminContext, captureAuthSession, useCan, HttpError, useTranslation } from '@svadmin/core';
  import type { FieldDefinition } from '@svadmin/core';
  import { definedReactiveOptions } from '@svadmin/core/options';
  import { untrack } from 'svelte';
  import { Check, X, Loader2 } from '@lucide/svelte';
  import { Button } from './ui/button/index.js';
  import FieldDisplay from './FieldDisplay.svelte';
  import { inlineDisplayValue, parseInlineValue } from '../inline-value';

  interface Props {
    resourceName: string;
    recordId: string | number;
    field: FieldDefinition;
    value: unknown;
    /** Callback after successful save */
    onSave?: (newValue: unknown) => void;
  }

  let { resourceName, recordId, field, value, onSave }: Props = $props();

  const context = captureAdminContext();
  const binding = useResourceContract(() => resourceName);
  const i18n = useTranslation();
  const permission = useCan(() => ({ resource: resourceName, action: 'edit', id: recordId }));
  const { mutation } = useUpdate(definedReactiveOptions({
    get resource() { return binding.resource; },
    get id() { return recordId; },
  }));
  const display = $derived(inlineDisplayValue(field.type, value));
  const session = $derived(captureAuthSession(context.authProvider));
  const editable = $derived(session.available && context.getResource(resourceName).canEdit !== false && field.showInEdit !== false &&
    field.key !== 'id' && permission.allowed === true && display !== undefined);
  const scope = $derived({
    contract: binding.resource, id: recordId, field: field.key, type: field.type, editable,
    provider: context.providers?.[binding.dataProviderName], meta: binding.meta,
    tenant: context.tenantCacheKey?.__svadminTenant,
    auth: context.authProvider, session,
  });
  let editing = $state(false);
  let editValue = $state('');
  let inputRef = $state<HTMLInputElement | null>(null);
  let editorRef = $state<HTMLDivElement | null>(null);
  let saving = $state(false);
  let failure = $state<'input' | 'request' | null>(null);
  let active: object | undefined;
  let editingScope = $state.raw<typeof scope>();
  const fieldLabel = $derived(field.label || field.key);

  $effect(() => {
    void scope;
    editing = false;
    editValue = '';
    saving = false;
    failure = null;
    active = undefined;
    editingScope = undefined;
  });
  $effect(() => () => { active = undefined; });
  $effect(() => {
    const node = inputRef;
    if (editing && node) untrack(() => node.focus());
  });

  function startEdit() {
    if (!editable || !display || saving || !session.isCurrent()) return;
    editingScope = scope;
    failure = null;
    editValue = display.text;
    editing = true;
  }

  async function save() {
    if (!editing || saving || !editable || editingScope !== scope || !session.isCurrent()) return;
    let newValue: string | number | null;
    try { newValue = parseInlineValue(field.type, editValue); }
    catch { failure = 'input'; return; }
    if (newValue === display?.value) {
      editing = false;
      return;
    }
    const current = scope;
    const fieldKey = field.key;
    const callback = onSave;
    const token = {};
    active = token;
    saving = true;
    failure = null;
    let succeeded = false;
    let savedValue: unknown;
    try {
      const result = await mutation.mutateAsync({
        variables: { [fieldKey]: newValue }, dataProviderName: binding.dataProviderName,
      });
      if (active === token && scope === current && current.session.isCurrent()) {
        editing = false;
        succeeded = true;
        savedValue = result.data[fieldKey];
      }
    } catch (error) {
      if (active === token && scope === current && current.session.isCurrent()) {
        failure = error instanceof HttpError && error.code === 'INVALID_RESOURCE_INPUT' ? 'input' : 'request';
      }
    } finally {
      if (active === token && scope === current && current.session.isCurrent()) {
        active = undefined;
        saving = false;
      }
    }
    if (succeeded && scope === current && current.session.isCurrent()) callback?.(savedValue);
  }

  function cancel() {
    if (saving) return;
    editing = false;
    failure = null;
    editingScope = undefined;
    editValue = display?.text ?? '';
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      save();
    }
    if (e.key === 'Escape') cancel();
  }

  function handleBlur(event: FocusEvent) {
    if (event.relatedTarget instanceof Node && editorRef?.contains(event.relatedTarget)) return;
    if (!saving) void save();
  }
</script>

{#if editing && editingScope === scope && session.isCurrent()}
  <div bind:this={editorRef} class="relative flex items-center w-full">
    <input
      bind:this={inputRef}
      type="text"
      inputmode={field.type === 'number' ? 'decimal' : field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text'}
      bind:value={editValue}
      onkeydown={handleKeydown}
      onblur={handleBlur}
      disabled={saving}
      aria-label={fieldLabel}
      aria-invalid={failure !== null}
      class="h-7 min-w-0 flex-1 rounded border bg-background px-2 text-sm outline-none ring-1 ring-primary/50 focus:ring-2 focus:ring-primary transition-all disabled:opacity-60"
    />
    <Button type="button" variant="ghost" size="icon-sm" disabled={saving} title={i18n.t('common.save')}
      aria-label={i18n.t('common.save')} aria-busy={saving} onclick={save}>
      {#if saving}
        <Loader2 class="h-4 w-4 animate-spin" role="status" aria-label="Saving..." />
      {:else}
        <Check class="h-4 w-4" />
      {/if}
    </Button>
    <Button type="button" variant="ghost" size="icon-sm" disabled={saving} title={i18n.t('common.cancel')}
      aria-label={i18n.t('common.cancel')} onclick={cancel}>
      <X class="h-4 w-4" />
    </Button>
  </div>
  {#if failure}
    <p role="alert">{i18n.t(failure === 'input' ? 'validation.invalidFormat' : 'common.operationFailed')}</p>
  {/if}
{:else if editable && display}
  <button type="button"
    class="inline-flex items-center cursor-pointer rounded px-1.5 py-0.5 -mx-1 text-sm text-foreground hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 transition-colors"
    ondblclick={startEdit}
    onclick={startEdit}
    title={`${i18n.t('common.edit')} ${fieldLabel}`}
    aria-label={`${i18n.t('common.edit')} ${fieldLabel}`}
    onkeydown={(e) => { if (e.key === 'Enter' || e.key === 'F2') { e.preventDefault(); startEdit(); } }}
  >
    {display.text || '—'}
  </button>
{:else}
  <FieldDisplay type={field.type} {value} options={field.options} resourceName={field.resource} />
{/if}
