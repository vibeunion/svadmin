// Svelte Actions — reusable DOM behavior directives
// Usage: <div use:clickOutside={() => close()}>
//        <div use:shortcut={{ key: 'k', ctrl: true, action: open }}>

/**
 * Fires callback when clicking outside the node.
 */
export function clickOutside(node: HTMLElement, callback: () => void) {
  const handle = (e: MouseEvent) => {
    if (node && !node.contains(e.target as Node) && !e.defaultPrevented) {
      callback();
    }
  };

  document.addEventListener('pointerdown', handle, true);

  return {
    update(newCallback: () => void) {
      callback = newCallback;
    },
    destroy() {
      document.removeEventListener('pointerdown', handle, true);
    },
  };
}

export interface ShortcutParams {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
}

/**
 * Fires action on keyboard shortcut.
 */
export function shortcut(_node: HTMLElement, params: ShortcutParams) {
  let current = params;

  const handle = (e: KeyboardEvent) => {
    const match =
      e.key.toLowerCase() === current.key.toLowerCase() &&
      (!current.ctrl || e.ctrlKey || e.metaKey) &&
      (!current.shift || e.shiftKey) &&
      (!current.alt || e.altKey);

    if (match) {
      e.preventDefault();
      current.action();
    }
  };

  window.addEventListener('keydown', handle);

  return {
    update(newParams: ShortcutParams) {
      current = newParams;
    },
    destroy() {
      window.removeEventListener('keydown', handle);
    },
  };
}

/**
 * Fires callback when element enters the viewport (infinite scroll sentinel).
 */
export function intersect(node: HTMLElement, callback: () => void) {
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry?.isIntersecting) callback();
    },
    { rootMargin: '200px' },
  );

  observer.observe(node);

  return {
    update(newCallback: () => void) {
      callback = newCallback;
    },
    destroy() {
      observer.disconnect();
    },
  };
}

/**
 * Copies text content to clipboard on click.
 */
export function copyOnClick(node: HTMLElement, text?: string) {
  let value = text;

  const handle = async () => {
    const content = value ?? node.textContent ?? '';
    await navigator.clipboard.writeText(content);
  };

  node.addEventListener('click', handle);

  return {
    update(newText: string) {
      value = newText;
    },
    destroy() {
      node.removeEventListener('click', handle);
    },
  };
}
