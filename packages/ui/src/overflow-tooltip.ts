export const AUTO_OVERFLOW_TITLE_ATTR = 'data-svadmin-auto-title';

const IGNORED_TAGS = new Set([
  'INPUT',
  'TEXTAREA',
  'SELECT',
  'OPTION',
  'SVG',
  'PATH',
  'CANVAS',
  'VIDEO',
  'AUDIO',
  'IFRAME',
  'IMG',
]);

function hasManualAncestorTitle(start: HTMLElement): boolean {
  let node: HTMLElement | null = start;
  for (let depth = 0; node && depth < 6; depth += 1) {
    if (node.dataset['slot'] === 'tooltip-trigger') return true;
    if (
      node.hasAttribute('title')
      && !node.hasAttribute(AUTO_OVERFLOW_TITLE_ATTR)
      && (node.getAttribute('title') ?? '').trim().length > 0
    ) {
      return true;
    }
    if (node === document.body) break;
    node = node.parentElement;
  }
  return false;
}

function isElementTextClipped(el: HTMLElement): boolean {
  const horizontalOverflow = el.scrollWidth > el.clientWidth + 1;
  const verticalOverflow = el.scrollHeight > el.clientHeight + 1;
  if (!horizontalOverflow && !verticalOverflow) return false;

  const view = el.ownerDocument.defaultView;
  if (!view) return false;
  const style = view.getComputedStyle(el);

  if (horizontalOverflow) {
    if (
      style.overflowX === 'hidden'
      || style.overflowX === 'clip'
      || style.textOverflow === 'ellipsis'
    ) {
      return true;
    }
  }

  if (verticalOverflow) {
    const lineClamp = style.getPropertyValue('-webkit-line-clamp') || style.getPropertyValue('line-clamp');
    if (
      style.overflowY === 'hidden'
      || style.overflowY === 'clip'
      || (Boolean(lineClamp) && lineClamp !== 'none')
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Synchronizes a native `title` tooltip onto truncated/clamped text elements
 * on pointer hover or keyboard focus without mutating author-supplied `title`s.
 */
export function syncElementOverflowTitle(target: EventTarget | null): void {
  if (!(target instanceof HTMLElement)) return;
  if (hasManualAncestorTitle(target)) return;

  let current: HTMLElement | null = target;
  for (let depth = 0; current && depth < 4; depth += 1) {
    if (current === document.body || current === document.documentElement) break;

    if (
      !IGNORED_TAGS.has(current.tagName)
      && current.getAttribute('aria-hidden') !== 'true'
      && current.getAttribute('role') !== 'presentation'
      && current.childElementCount <= 4
    ) {
      if (isElementTextClipped(current)) {
        const text = (current.textContent ?? '').replace(/\s+/g, ' ').trim();
        if (text.length > 0 && text.length <= 2000) {
          if (current.getAttribute('title') !== text) {
            current.setAttribute('title', text);
          }
          current.setAttribute(AUTO_OVERFLOW_TITLE_ATTR, '');
          return;
        }
      } else if (current.hasAttribute(AUTO_OVERFLOW_TITLE_ATTR)) {
        current.removeAttribute('title');
        current.removeAttribute(AUTO_OVERFLOW_TITLE_ATTR);
      }
    }

    current = current.parentElement;
  }
}

export function attachOverflowTooltips(targetDocument: Document = document): () => void {
  const handler = (event: Event) => {
    syncElementOverflowTitle(event.target);
  };
  targetDocument.addEventListener('pointerover', handler, { passive: true });
  targetDocument.addEventListener('focusin', handler, { passive: true });
  return () => {
    targetDocument.removeEventListener('pointerover', handler);
    targetDocument.removeEventListener('focusin', handler);
  };
}
