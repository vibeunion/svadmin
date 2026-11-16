<script lang="ts">
  import { X } from '@lucide/svelte';
  import { useNotificationController, type NotificationPlacement } from '../notifications.svelte.js';

  const placements: NotificationPlacement[] = ['top-right', 'top-left', 'bottom-right', 'bottom-left'];
  const controller = useNotificationController();
  const groups = $derived(placements
    .map((placement) => ({
      placement,
      items: controller.items.filter((item) => item.placement === placement),
    }))
    .filter((group) => group.items.length > 0));
</script>

{#each groups as group (group.placement)}
  <div
    class="svadmin-notification-host"
    data-placement={group.placement}
    aria-label={group.placement === 'top-right' ? 'Notifications' : `Notifications ${group.placement}`}
    aria-live="polite"
  >
    {#each group.items as item (item.id)}
      <section class="svadmin-notification-host__item" data-tone={item.tone} role="status">
        <div class="svadmin-notification-host__content">
          <p class="svadmin-notification-host__title">{item.title}</p>
          {#if item.description}<p class="svadmin-notification-host__description">{item.description}</p>{/if}
          {#if item.actionLabel && item.onAction}
            <button type="button" class="svadmin-notification-host__action" onclick={() => { item.onAction?.(); controller.close(item.id); }}>{item.actionLabel}</button>
          {/if}
        </div>
        <button type="button" class="svadmin-notification-host__close" aria-label="Close notification" onclick={() => controller.close(item.id)}>
          <X size={14} aria-hidden="true" />
        </button>
      </section>
    {/each}
  </div>
{/each}

<style>
  .svadmin-notification-host { position: fixed; z-index: 80; inset-block-start: 20px; inset-inline-end: 20px; display: grid; width: min(340px, calc(100vw - 40px)); gap: 20px; pointer-events: none; }
  .svadmin-notification-host[data-placement='top-left'] { inset-inline-start: 20px; inset-inline-end: auto; }
  .svadmin-notification-host[data-placement='bottom-right'] { inset-block-start: auto; inset-block-end: 20px; }
  .svadmin-notification-host[data-placement='bottom-left'] { inset-block-start: auto; inset-block-end: 20px; inset-inline-start: 20px; inset-inline-end: auto; }
  .svadmin-notification-host__item { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px; width: 340px; max-width: 100%; padding: 20px; border: 1px solid var(--border); border-radius: 4px; background: var(--card); color: var(--foreground); box-shadow: var(--svadmin-shadow-overlay, var(--shadow-overlay)); pointer-events: auto; }
  .svadmin-notification-host__item[data-tone='success'] { border-color: var(--border); }
  .svadmin-notification-host__item[data-tone='warning'] { border-color: var(--border); }
  .svadmin-notification-host__item[data-tone='danger'] { border-color: var(--border); }
  .svadmin-notification-host__title { margin: 0 0 4px; font-size: var(--svadmin-text-section); font-weight: 500; }
  .svadmin-notification-host__description { margin: 0; color: var(--foreground); font-size: var(--svadmin-text-body); line-height: 1.5715; }
  .svadmin-notification-host__action { margin-block-start: var(--svadmin-space-2); padding: 0; border: 0; background: transparent; color: var(--primary); font-size: var(--svadmin-text-label); font-weight: 600; cursor: pointer; }
  .svadmin-notification-host__close { align-self: start; width: 1.5rem; height: 1.5rem; padding: 0; border: 0; border-radius: var(--radius-sm); background: transparent; color: var(--muted-foreground); cursor: pointer; }
  .svadmin-notification-host__close:hover { background: var(--muted); color: var(--foreground); }
  .svadmin-notification-host__close:focus-visible { outline: var(--svadmin-focus-width) solid var(--ring); outline-offset: var(--svadmin-focus-offset); }
</style>
