<script lang="ts">
  /**
   * SSR UndoableNotification — Degraded to a static banner with an undo link.
   * Without JS there's no countdown timer. Instead, the server provides an
   * undo URL that performs the reversal action. If the user navigates away,
   * the action is considered confirmed.
   */
  interface Props {
    message: string;
    undoUrl: string;
  }

  let { message, undoUrl }: Props = $props();
</script>

<div
  role="alert"
  style="padding: 12px 16px; background: #FFF7E8; border: 1px solid #FFE4BA; color: #713f12; border-radius: 6px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; font-size: 14px;"
>
  <span>{message}</span>
  <a
    href={undoUrl}
    style="color: #b45309; font-weight: 600; text-decoration: underline; margin-left: 16px; white-space: nowrap;"
  >Undo</a>
</div>
