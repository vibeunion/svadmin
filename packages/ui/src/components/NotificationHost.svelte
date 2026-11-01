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
  .svadmin-notification-host { position: fixed; z-index: 80; inset-block-start: 1rem; inset-inline-end: 1rem; display: grid; width: min(22rem, calc(100vw - 2rem)); gap: var(--svadmin-space-2); pointer-events: none; }
  .svadmin-notification-host[data-placement='top-left'] { inset-inline-start: 1rem; inset-inline-end: auto; }
  .svadmin-notification-host[data-placement='bottom-right'] { inset-block-start: auto; inset-block-end: 1rem; }
  .svadmin-notification-host[data-placement='bottom-left'] { inset-block-start: auto; inset-block-end: 1rem; inset-inline-start: 1rem; inset-inline-end: auto; }
  .svadmin-notification-host__item { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: var(--svadmin-space-3); padding: var(--svadmin-space-3); border: 1px solid var(--border); border-inline-start: 3px solid var(--info); border-radius: var(--radius-md); background: var(--card); color: var(--foreground); box-shadow: var(--shadow-overlay, 0 10px 28px color-mix(in srgb, var(--foreground) 16%, transparent)); pointer-events: auto; }
  .svadmin-notification-host__item[data-tone='success'] { border-inline-start-color: var(--success); }
  .svadmin-notification-host__item[data-tone='warning'] { border-inline-start-color: var(--warning); }
  .svadmin-notification-host__item[data-tone='danger'] { border-inline-start-color: var(--destructive); }
  .svadmin-notification-host__title { margin: 0; font-size: var(--svadmin-text-body); font-weight: 600; }
  .svadmin-notification-host__description { margin: var(--svadmin-space-1) 0 0; color: var(--muted-foreground); font-size: var(--svadmin-text-label); line-height: var(--svadmin-leading-body); }
  .svadmin-notification-host__action { margin-block-start: var(--svadmin-space-2); padding: 0; border: 0; background: transparent; color: var(--primary); font-size: var(--svadmin-text-label); font-weight: 600; cursor: pointer; }
  .svadmin-notification-host__close { align-self: start; width: 1.5rem; height: 1.5rem; padding: 0; border: 0; border-radius: var(--radius-sm); background: transparent; color: var(--muted-foreground); cursor: pointer; }
  .svadmin-notification-host__close:hover { background: var(--muted); color: var(--foreground); }
  .svadmin-notification-host__close:focus-visible { outline: 2px solid var(--ring); outline-offset: 1px; }
</style>
