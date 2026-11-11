<script lang="ts">
  export interface LiteConflictField {
    field: string;
    label?: string;
    localValue?: unknown;
    remoteValue?: unknown;
  }

  interface Props {
    open?: boolean;
    title?: string;
    description?: string;
    fields?: LiteConflictField[];
    formAction?: string;
    namePrefix?: string;
    modifiedBy?: string;
    cancelHref?: string;
    submitLabel?: string;
    class?: string;
  }

  let {
    open = true,
    title = 'Resolve edit conflict',
    description = 'The record changed while you were editing. Choose the value to keep for each field.',
    fields = [],
    formAction = '',
    namePrefix = 'resolve',
    modifiedBy,
    cancelHref,
    submitLabel = 'Save resolution',
    class: className = '',
  }: Props = $props();

  function formatValue(value: unknown): string {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }
</script>

{#if open}
  <div
    class="lite-conflict-modal lite-card {className}"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    aria-labelledby="lite-conflict-title"
  >
    <header>
      <h2 id="lite-conflict-title">{title}</h2>
      {#if modifiedBy}<p class="lite-conflict-meta">Last modified by <strong>{modifiedBy}</strong></p>{/if}
      <p>{description}</p>
    </header>

    {#if fields.length === 0}
      <p class="lite-conflict-empty" role="status">No conflicting fields were provided.</p>
    {:else}
      <form method="POST" action={formAction}>
        <table class="lite-table">
          <thead>
            <tr>
              <th>Field</th>
              <th>My value</th>
              <th>Server value</th>
              <th>Keep</th>
            </tr>
          </thead>
          <tbody>
            {#each fields as field (field.field)}
              <tr data-conflict-field={field.field}>
                <th scope="row">{field.label ?? field.field}</th>
                <td><code>{formatValue(field.localValue)}</code></td>
                <td><code>{formatValue(field.remoteValue)}</code></td>
                <td>
                  <label>
                    <input type="radio" name={`${namePrefix}[${field.field}]`} value="local" checked />
                    Mine
                  </label>
                  <label>
                    <input type="radio" name={`${namePrefix}[${field.field}]`} value="remote" />
                    Theirs
                  </label>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>

        <div class="lite-conflict-actions">
          <button type="submit">{submitLabel}</button>
          {#if cancelHref}<a href={cancelHref}>Discard and go back</a>{/if}
        </div>
      </form>
    {/if}
  </div>
{/if}

<style>
  .lite-conflict-modal { padding: 16px; }
  .lite-conflict-modal header h2 { margin: 0; color: #1d2129; font-size: 16px; }
  .lite-conflict-modal header p { margin: 6px 0 12px; color: #4e5969; font-size: 12px; line-height: 1.5; }
  .lite-conflict-meta { margin-bottom: 0 !important; }
  .lite-conflict-empty { color: #86909c; }
  .lite-conflict-modal code { display: inline-block; max-width: 220px; overflow-wrap: anywhere; padding: 2px 5px; border-radius: 3px; background: #f2f3f5; font-size: 11px; }
  .lite-conflict-actions { display: flex; align-items: center; margin-top: 12px; }
  .lite-conflict-actions > * + * { margin-left: 12px; }
  .lite-conflict-actions button { padding: 7px 12px; border: 0; border-radius: 4px; background: #165dff; color: #fff; font-size: 12px; cursor: pointer; }
  .lite-conflict-actions a { color: #4e5969; font-size: 12px; }
</style>
