<script lang="ts">
  export interface LiteDeleteImpact {
    label: string;
    count?: number;
    description?: string;
  }

  interface Props {
    title?: string;
    description?: string;
    impactItems?: LiteDeleteImpact[];
    action: string;
    method?: 'POST' | 'post';
    confirmLabel?: string;
    cancelHref?: string;
    cancelLabel?: string;
    confirmationText?: string;
    name?: string;
    class?: string;
  }

  let {
    title = 'Delete this record?',
    description = 'This action cannot be undone. Review the impact before continuing.',
    impactItems = [],
    action,
    method = 'POST',
    confirmLabel = 'Delete permanently',
    cancelHref,
    cancelLabel = 'Cancel',
    confirmationText,
    name = 'confirm',
    class: className = '',
  }: Props = $props();
</script>

<section class="lite-safe-delete lite-card {className}" aria-label={title}>
  <header>
    <h2>{title}</h2>
    <p>{description}</p>
  </header>

  {#if impactItems.length > 0}
    <ul class="lite-safe-delete-impact">
      {#each impactItems as item (item.label)}
        <li>
          <strong>{item.label}</strong>
          {#if typeof item.count === 'number'}<span class="lite-safe-delete-count">{item.count}</span>{/if}
          {#if item.description}<span class="lite-safe-delete-desc">{item.description}</span>{/if}
        </li>
      {/each}
    </ul>
  {/if}

  <form method={method} action={action}>
    {#if confirmationText}
      <label for="lite-delete-confirmation">
        Type <strong>{confirmationText}</strong> to confirm
      </label>
      <input id="lite-delete-confirmation" name={name} autocomplete="off" required />
    {/if}
    <div class="lite-safe-delete-actions">
      <button type="submit" class="lite-safe-delete-danger">{confirmLabel}</button>
      {#if cancelHref}<a href={cancelHref}>{cancelLabel}</a>{/if}
    </div>
  </form>
</section>

<style>
  .lite-safe-delete { padding: 16px; border-color: #ffd8d2; }
  .lite-safe-delete header h2 { margin: 0; color: #1d2129; font-size: 16px; }
  .lite-safe-delete header p { margin: 6px 0 12px; color: #4e5969; font-size: 12px; line-height: 1.5; }
  .lite-safe-delete-impact { margin: 0 0 12px; padding: 0; list-style: none; }
  .lite-safe-delete-impact li { display: flex; align-items: baseline; padding: 7px 9px; border: 1px solid #ffe4e0; border-radius: 4px; background: #fff7f6; color: #4e5969; font-size: 12px; }
  .lite-safe-delete-impact li > * + * { margin-left: 6px; }
  .lite-safe-delete-impact li + li { margin-top: 6px; }
  .lite-safe-delete-impact strong { color: #1d2129; }
  .lite-safe-delete-count { padding: 1px 5px; border-radius: 999px; background: #f53f3f; color: #fff; font-size: 11px; }
  .lite-safe-delete-desc { color: #86909c; }
  .lite-safe-delete label { display: block; margin-bottom: 5px; color: #4e5969; font-size: 12px; }
  .lite-safe-delete input { width: 100%; box-sizing: border-box; padding: 7px 9px; border: 1px solid #e5e6eb; border-radius: 4px; font: inherit; font-size: 13px; }
  .lite-safe-delete-actions { display: flex; align-items: center; margin-top: 12px; }
  .lite-safe-delete-actions > * + * { margin-left: 12px; }
  .lite-safe-delete-danger { padding: 7px 12px; border: 0; border-radius: 4px; background: #f53f3f; color: #fff; font-size: 12px; cursor: pointer; }
  .lite-safe-delete-actions a { color: #4e5969; font-size: 12px; }
</style>
