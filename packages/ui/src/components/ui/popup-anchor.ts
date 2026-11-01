export type PopupAnchorKind = 'popover' | 'dialog' | 'alert-dialog' | 'tooltip' | 'sheet';

const TRIGGER_SELECTOR: Record<Exclude<PopupAnchorKind, 'sheet'>, string> = {
  popover: '[data-popover-trigger]',
  dialog: '[data-dialog-trigger], [data-slot="dialog-trigger"]',
  'alert-dialog': '[data-alert-dialog-trigger]',
  tooltip: '[data-tooltip-trigger], [data-slot="tooltip-trigger"]',
};

function isHtmlElement(value: unknown): value is HTMLElement {
  return typeof HTMLElement !== 'undefined' && value instanceof HTMLElement;
}

function isOpenTrigger(element: HTMLElement): boolean {
  const state = element.getAttribute('data-state');
  if (state && state !== 'closed') return true;
  return element.getAttribute('aria-expanded') === 'true';
}

function nextMarkerAfter(trigger: HTMLElement, markers: readonly HTMLElement[], NodeCtor: typeof Node): HTMLElement | undefined {
  let candidate: HTMLElement | undefined;
  for (const marker of markers) {
    const position = trigger.compareDocumentPosition(marker);
    if ((position & NodeCtor.DOCUMENT_POSITION_FOLLOWING) === 0) continue;
    if (!candidate || (marker.compareDocumentPosition(candidate) & NodeCtor.DOCUMENT_POSITION_FOLLOWING) !== 0) {
      candidate = marker;
    }
  }
  return candidate;
}

/**
 * 把打开的触发器配到它后面最近的同类型锚点。
 * 后出现的触发器会覆盖更早的配对，因此紧挨着浮层的那个触发器胜出。
 */
function triggerForMarker(marker: HTMLElement, kind: PopupAnchorKind | undefined): HTMLElement | undefined {
  if (!kind || kind === 'sheet') return undefined;
  const doc = marker.ownerDocument;
  const NodeCtor = doc?.defaultView?.Node;
  const selector = TRIGGER_SELECTOR[kind];
  if (!doc || !NodeCtor || !selector) return undefined;

  const markers = [...doc.querySelectorAll<HTMLElement>(`[data-svadmin-popup-anchor="${kind}"]`)];
  const triggers = [...doc.querySelectorAll<HTMLElement>(selector)];
  const openOwner = ownersFor(triggers.filter(isOpenTrigger), markers, NodeCtor).get(marker);
  // 受控 open 时触发器的 data-state 可能仍是 closed。没有打开中的触发器时，退回同类型里紧邻的那个。
  return openOwner ?? ownersFor(triggers, markers, NodeCtor).get(marker);
}

function ownersFor(triggers: readonly HTMLElement[], markers: readonly HTMLElement[], NodeCtor: typeof Node): Map<HTMLElement, HTMLElement> {
  const owners = new Map<HTMLElement, HTMLElement>();
  for (const trigger of triggers) {
    const owner = nextMarkerAfter(trigger, markers, NodeCtor);
    if (owner) owners.set(owner, trigger);
  }
  return owners;
}

/**
 * getPopupContainer 收到的节点：显式锚点优先，否则是同类型触发器，最后才是源码树里的锚点标记。
 * Sheet 没有触发器，使用声明位置上的标记，这样 node?.closest() 仍能看到所在容器。
 */
export function resolvePopupAnchor(
  explicit: HTMLElement | null | undefined,
  marker: HTMLElement | null | undefined,
  kind?: PopupAnchorKind,
): HTMLElement | undefined {
  if (isHtmlElement(explicit)) return explicit;
  if (!isHtmlElement(marker)) return undefined;
  return triggerForMarker(marker, kind) ?? marker;
}
