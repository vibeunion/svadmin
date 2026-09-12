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
  <div bind:this={editorRef} class="svadmin-u-d89972fe17d6 svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-6da6a3c3f741">    <input
      bind:this={inputRef}
      type="text"
      inputmode={field.type === 'number' ? 'decimal' : field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text'}
      bind:value={editValue}
      onkeydown={handleKeydown}
      onblur={handleBlur}
      disabled={saving}
      aria-label={fieldLabel}
      aria-invalid={failure !== null}
      class="svadmin-u-d0a52b312f7d svadmin-u-7e0b7cdf1a94 svadmin-u-36e579c0b41c svadmin-u-07389a777c1f svadmin-u-ca6bcd4b6f3f svadmin-u-e6f9e383a762 svadmin-u-d5eab218aa34 svadmin-u-fc7473ca09eb svadmin-u-df37b1fd9495 svadmin-u-3daca9af0861 svadmin-u-f42e9fee68a1 svadmin-u-608dd26cd5ba svadmin-u-1a5f9520d7fa svadmin-u-0fe7d7d814d0 svadmin-u-d463b664011d"
    />
    <Button type="button" variant="ghost" size="icon-sm" disabled={saving} title={i18n.t('common.save')}
      aria-label={i18n.t('common.save')} aria-busy={saving} onclick={save}>
      {#if saving}
        <Loader2 class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-afbdd13a380e" role="status" aria-label="Saving..." />
      {:else}
        <Check class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
      {/if}
    </Button>
    <Button type="button" variant="ghost" size="icon-sm" disabled={saving} title={i18n.t('common.cancel')}
      aria-label={i18n.t('common.cancel')} onclick={cancel}>
      <X class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
    </Button>
  </div>
  {#if failure}
    <p role="alert">{i18n.t(failure === 'input' ? 'validation.invalidFormat' : 'common.operationFailed')}</p>
  {/if}
{:else if editable && display}
  <button type="button"    class="svadmin-u-52083e7da442 svadmin-u-3960ffc248d9 svadmin-u-34516836730d svadmin-u-07389a777c1f svadmin-u-45d828117213 svadmin-u-465609a240a8 svadmin-u-76610325273f svadmin-u-fc7473ca09eb svadmin-u-d4108abe6359 svadmin-u-2a6233dc87a9 svadmin-u-f10f771f87e9 svadmin-u-793c80e97ffb svadmin-u-9c1295a6914a svadmin-u-ce4edccf4cbb svadmin-u-ceb69a6b0e5f"
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
