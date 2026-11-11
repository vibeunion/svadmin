<script lang="ts">
  import { AlertTriangle, X } from '@lucide/svelte';
  import { onDestroy, type Snippet } from 'svelte';
  import { cn } from '../utils.js';
  import { useUnsavedChanges } from './useUnsavedChanges.svelte.js';

  export interface UnsavedChangesGuardProps {
    /** Controlled dirty flag indicating whether current form has unsaved modifications */
    isDirty?: boolean | undefined;
    /** Whether protection is actively enabled (default: true) */
    enabled?: boolean | undefined;
    /** Modal dialog title (default: 'Unsaved Changes') */
    title?: string | undefined;
    /** Modal dialog description / warning text */
    message?: string | undefined;
    /** Stay button label (default: 'Stay on Page') */
    stayText?: string | undefined;
    /** Leave button label (default: 'Discard & Leave') */
    leaveText?: string | undefined;
    /** Callback when user confirms discard */
    onleave?: (() => void) | undefined;
    /** Callback when user cancels and stays */
    onstay?: (() => void) | undefined;
    /** Extra classes for wrapper */
    class?: string | undefined;
    /** Page or form content */
    children?: Snippet | undefined;
    /** Custom modal replacement snippet */
    modal?: Snippet<[{ proceed: () => void; cancel: () => void; isBlocked: boolean }]> | undefined;
  }

  let {
    isDirty = false,
    enabled = true,
    title = 'Unsaved Changes',
    message = 'You have unsaved changes that will be lost if you leave this page. Are you sure you want to discard them?',
    stayText = 'Stay on Page',
    leaveText = 'Discard & Leave',
    onleave,
    onstay,
    class: className = '',
    children,
    modal,
  }: UnsavedChangesGuardProps = $props();

  const guard = useUnsavedChanges({
    isDirty: () => isDirty,
    enabled: () => enabled,
    message: () => message,
    onLeave: () => onleave?.(),
    onStay: () => onstay?.(),
  });

  onDestroy(() => {
    guard.destroy();
  });
</script>

<div
  data-svadmin-component="UnsavedChangesGuard"
  data-dirty={isDirty ? 'true' : 'false'}
  class={cn('w-full', className)}
>
  {#if children}
    {@render children()}
  {/if}

  {#if guard.isBlocked}
    {#if modal}
      {@render modal({ proceed: guard.proceed, cancel: guard.cancel, isBlocked: guard.isBlocked })}
    {:else}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="unsaved-changes-title"
        aria-describedby="unsaved-changes-desc"
        class="fixed inset-0 z-50 flex items-center justify-center overflow-hidden p-4"
      >
        <!-- Backdrop -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <div
          role="button"
          tabindex="-1"
          class="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
          onclick={guard.cancel}
          aria-label="Dismiss warning"
        ></div>

        <!-- Alert Modal Box -->
        <div
          class="relative z-50 w-full max-w-md rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-2xl transition-all animate-in fade-in zoom-in-95 duration-150"
        >
          <div class="flex items-start gap-4">
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning border border-warning/20">
              <AlertTriangle class="h-6 w-6" />
            </div>

            <div class="flex-1 space-y-1.5">
              <h3 id="unsaved-changes-title" class="text-base font-semibold text-foreground">
                {title}
              </h3>
              <p id="unsaved-changes-desc" class="text-xs text-muted-foreground leading-relaxed">
                {message}
              </p>
            </div>

            <button
              type="button"
              onclick={guard.cancel}
              class="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X class="h-4 w-4" />
            </button>
          </div>

          <div class="mt-6 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onclick={guard.cancel}
              class="rounded-lg border border-border bg-background px-4 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              {stayText}
            </button>

            <button
              type="button"
              onclick={guard.proceed}
              class="rounded-lg bg-destructive px-4 py-2 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors shadow-sm"
            >
              {leaveText}
            </button>
          </div>
        </div>
      </div>
    {/if}
  {/if}
</div>
