export function focusScrollableContent(node: HTMLElement): { destroy(): void } {
  const update = (): void => {
    // Only add a keyboard stop when the region has content to scroll.
    if (node.scrollHeight > node.clientHeight || node.scrollWidth > node.clientWidth) {
      node.tabIndex = 0;
    } else {
      node.removeAttribute('tabindex');
    }
  };
  const resize = new ResizeObserver(update);
  const mutations = new MutationObserver(update);
  resize.observe(node);
  mutations.observe(node, { childList: true, characterData: true, subtree: true });
  update();
  return {
    destroy() {
      resize.disconnect();
      mutations.disconnect();
    },
  };
}
