<script lang="ts">
  import { liteFragmentId } from '../fragment-id';

  interface Props {
    confirmationId?: string;
    title?: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    /** The summary element (button) that triggers the dropdown */
    triggerLabel: string;
    triggerClass?: string;
    /** Form action to submit on confirm */
    action: string;
    /** Any hidden inputs to include in the form */
    hiddenInputs?: Record<string, string>;
    align?: 'left' | 'right';
  }

  let {
    confirmationId,
    title = 'Are you sure?',
    description = 'This action cannot be undone.',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    triggerLabel,
    triggerClass = 'lite-btn lite-btn-danger lite-btn-sm',
    action,
    hiddenInputs = {},
    align = 'right'
  }: Props = $props();

  const componentId = $props.id();
  const fragmentId = $derived(liteFragmentId(
    'confirm',
    confirmationId ?? componentId,
  ));
  const titleId = $derived(`${fragmentId}-title`);
  const descriptionId = $derived(`${fragmentId}-description`);
</script>

<div class="lite-confirm">
  <span id={`${fragmentId}-closed`} class="lite-confirm-cancel-target" aria-hidden="true"></span>
  <a href={`#${fragmentId}`} class={triggerClass} aria-controls={fragmentId} aria-haspopup="dialog">{triggerLabel}</a>
  <div
    id={fragmentId}
    class="lite-confirm-panel lite-confirm-target"
    style="text-align:left; {align === 'right' ? 'right:0;' : 'left:0;'}"
    role="dialog"
    aria-labelledby={titleId}
    aria-describedby={description ? descriptionId : undefined}
    tabindex="-1"
  >
    <div id={titleId} style="font-weight:600;margin-bottom:8px;color:#0f172a;">{title}</div>
    {#if description}
      <div id={descriptionId} style="font-size:12px;color:#64748b;margin-bottom:16px;">{description}</div>
    {/if}
    <form method="POST" {action} class="lite-inline-actions lite-justify-end">
      {#each Object.entries(hiddenInputs) as [key, val] (key)}
        <input type="hidden" name={key} value={val} />
      {/each}
      <a href={`#${fragmentId}-closed`} class="lite-btn lite-btn-sm">
        {cancelLabel}
      </a>
      <button type="submit" class="lite-btn lite-btn-primary lite-btn-sm lite-btn-danger">
        {confirmLabel}
      </button>
    </form>
  </div>
</div>
