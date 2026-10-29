<script lang="ts">
  /**
   * LiteEmptyState — SSR-compatible empty state indicator.
   * Renders a centered box with an icon, title, description, and link.
   * No client-side JS required.
   */

  interface Props {
    title: string;
    description?: string;
    /** Optional HTML entity or text icon */
    icon?: string;
    actionLabel?: string;
    actionUrl?: string;
  }

  let {
    title,
    description,
    icon,
    actionLabel,
    actionUrl,
  }: Props = $props();
</script>

<div class="lite-empty-state lite-card" style="text-align:center;padding:48px 24px;">
  {#if icon}
    <div style="font-size:32px;color:#86909C;margin-bottom:16px;">{icon}</div>
  {/if}
  <h3 style="font-size:16px;font-weight:600;color:#1D2129;margin:0 0 8px 0;">{title}</h3>
  {#if description}
    <p style="font-size:14px;color:#4E5969;margin:0 0 24px 0;">{description}</p>
  {/if}
  {#if actionLabel && actionUrl}
    <a href={actionUrl} class="lite-btn lite-btn-primary">
      {actionLabel}
    </a>
  {/if}
</div>
