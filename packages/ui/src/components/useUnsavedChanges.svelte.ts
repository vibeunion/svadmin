export interface UseUnsavedChangesOptions {
  /** Initial dirty state or getter function */
  isDirty?: boolean | (() => boolean) | undefined;
  /** Custom warning message for native browser dialog */
  message?: string | (() => string) | undefined;
  /** Whether the unsaved changes guard is actively enabled (default: true) */
  enabled?: boolean | (() => boolean) | undefined;
  /** Callback when user decides to leave/discard */
  onLeave?: (() => void) | undefined;
  /** Callback when user decides to stay and keep editing */
  onStay?: (() => void) | undefined;
}

export function useUnsavedChanges(options: UseUnsavedChangesOptions = {}) {
  let dirtyState = $state(
    typeof options.isDirty === 'function' ? options.isDirty() : Boolean(options.isDirty),
  );
  let isBlocked = $state(false);
  let pendingNavigationUrl = $state<string | null>(null);
  let allowLeave = false;

  const isDirtyDerived = $derived(
    typeof options.isDirty === 'function' ? options.isDirty() : dirtyState,
  );

  const enabled = $derived(
    typeof options.enabled === 'function' ? options.enabled() : (options.enabled ?? true),
  );

  const warningMessage = $derived(
    typeof options.message === 'function'
      ? options.message()
      : (options.message ?? 'You have unsaved changes. Are you sure you want to leave?'),
  );

  function handleBeforeUnload(e: BeforeUnloadEvent) {
    if (allowLeave || !enabled || !isDirtyDerived) return;
    e.preventDefault();
    e.returnValue = warningMessage;
    return warningMessage;
  }

  function handleDocumentClick(e: MouseEvent) {
    if (allowLeave || !enabled || !isDirtyDerived) return;
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const target = (e.target as HTMLElement)?.closest?.('a');
    if (!target || !target.href) return;
    if (target.target === '_blank' || target.hasAttribute('download')) return;

    try {
      const url = new URL(target.href, window.location.href);
      if (
        url.origin === window.location.origin &&
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return;
      }
    } catch {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    pendingNavigationUrl = target.href;
    isBlocked = true;
  }

  function handlePopState() {
    if (allowLeave || !enabled || !isDirtyDerived) return;
    window.history.pushState(null, '', window.location.href);
    isBlocked = true;
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('click', handleDocumentClick, true);
    window.addEventListener('popstate', handlePopState);
  }

  function proceed() {
    const url = pendingNavigationUrl;
    isBlocked = false;
    dirtyState = false;
    allowLeave = true;
    pendingNavigationUrl = null;
    options.onLeave?.();
    if (url && typeof window !== 'undefined') {
      window.location.href = url;
      return;
    }
    // Reset the bypass only if no synchronous navigation happened, so an
    // `onLeave` callback can still navigate without a second beforeunload prompt.
    setTimeout(() => {
      allowLeave = false;
    }, 0);
  }

  function cancel() {
    isBlocked = false;
    pendingNavigationUrl = null;
    allowLeave = false;
    options.onStay?.();
  }

  function destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleDocumentClick, true);
      window.removeEventListener('popstate', handlePopState);
    }
  }

  return {
    get isDirty() {
      return isDirtyDerived;
    },
    get isBlocked() {
      return isBlocked;
    },
    get pendingNavigationUrl() {
      return pendingNavigationUrl;
    },
    setDirty: (value: boolean) => {
      dirtyState = value;
    },
    setBlocked: (value: boolean) => {
      isBlocked = value;
    },
    proceed,
    cancel,
    destroy,
  };
}
