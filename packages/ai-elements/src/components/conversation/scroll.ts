export function observeConversationScroll(
  element: HTMLElement,
  onAtBottomChange: (atBottom: boolean) => void,
): { scrollToBottom(): void; destroy(): void } {
  let following = true;
  let previousTop = element.scrollTop;
  let frame: number | undefined;
  let destroyed = false;
  const observed = new Set<Element>();
  const atBottom = () => element.scrollHeight - element.scrollTop - element.clientHeight <= 48;

  function scrollToBottom(): void {
    if (destroyed) return;
    following = true;
    if (typeof element.scrollTo === 'function') {
      element.scrollTo({ top: element.scrollHeight, behavior: 'instant' });
    } else {
      element.scrollTop = element.scrollHeight;
    }
    previousTop = element.scrollTop;
    onAtBottomChange(true);
  }

  function schedule(): void {
    if (destroyed || frame !== undefined) return;
    frame = requestAnimationFrame(() => {
      frame = undefined;
      if (destroyed) return;
      if (atBottom()) following = true;
      if (following) scrollToBottom();
      else onAtBottomChange(atBottom());
    });
  }

  function onScroll(): void {
    const nextTop = element.scrollTop;
    // Layout changes can emit scroll events without a user moving away.
    if (atBottom()) following = true;
    else if (nextTop !== previousTop) following = false;
    previousTop = nextTop;
    onAtBottomChange(atBottom());
  }

  const resize = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(schedule);
  function observeChildren(): void {
    const children = new Set(element.children);
    for (const child of observed) {
      if (!children.has(child)) {
        resize?.unobserve(child);
        observed.delete(child);
      }
    }
    for (const child of children) {
      if (!observed.has(child)) {
        resize?.observe(child);
        observed.add(child);
      }
    }
  }

  resize?.observe(element);
  observeChildren();
  const mutation = new MutationObserver((records) => {
    if (records.some((record) => record.type === 'childList')) observeChildren();
    schedule();
  });
  mutation.observe(element, { childList: true, subtree: true, characterData: true });
  element.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  schedule();

  return {
    scrollToBottom,
    destroy() {
      destroyed = true;
      if (frame !== undefined) cancelAnimationFrame(frame);
      resize?.disconnect();
      mutation.disconnect();
      element.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', schedule);
    },
  };
}
