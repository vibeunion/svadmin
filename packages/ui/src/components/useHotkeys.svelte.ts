import { onDestroy } from 'svelte';

export interface HotkeyItem {
  id: string;
  combo: string;
  keys: string[];
  label?: string | undefined;
  description?: string | undefined;
  category?: ('navigation' | 'table' | 'action' | 'view' | 'system' | string) | undefined;
  action?: ((event?: KeyboardEvent) => void) | undefined;
}

export interface UseHotkeysOptions {
  /** Whether to prevent default browser behavior when triggered (default: true) */
  preventDefault?: boolean | undefined;
  /** Whether to stop event propagation (default: true) */
  stopPropagation?: boolean | undefined;
  /** Whether hotkey is actively enabled (default: true or getter) */
  enabled?: (boolean | (() => boolean)) | undefined;
  /** Allow triggering even when input, textarea, or contenteditable is focused (default: false for bare keys, true for modifiers) */
  enableOnInputs?: boolean | undefined;
  /** Optional human-readable label */
  label?: string | undefined;
  /** Optional human-readable description for shortcut modal */
  description?: string | undefined;
  /** Category for shortcut modal (default: 'action') */
  category?: ('navigation' | 'table' | 'action' | 'view' | 'system' | string) | undefined;
  /** Target element to bind (default: window) */
  target?: (Window | Document | HTMLElement | null) | undefined;
}

const activeRegistry = new Map<string, HotkeyItem>();
let nextRegistryId = 1;

export function getRegisteredHotkeys(): HotkeyItem[] {
  return Array.from(activeRegistry.values());
}

export function clearRegisteredHotkeys(): void {
  activeRegistry.clear();
}

export function isMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as { userAgentData?: { platform?: string }; platform?: string };
  const platform = nav.userAgentData?.platform || nav.platform || navigator.userAgent || '';
  return /mac/i.test(platform);
}

function normalizeKey(key: string): string {
  const k = key.trim().toLowerCase();
  switch (k) {
    case 'esc':
    case 'escape':
      return 'escape';
    case 'enter':
    case 'return':
      return 'enter';
    case 'space':
    case ' ':
      return ' ';
    case 'up':
    case 'arrowup':
      return 'arrowup';
    case 'down':
    case 'arrowdown':
      return 'arrowdown';
    case 'left':
    case 'arrowleft':
      return 'arrowleft';
    case 'right':
    case 'arrowright':
      return 'arrowright';
    case 'slash':
      return '/';
    case 'question':
      return '?';
    default:
      return k;
  }
}

export interface ParsedCombo {
  raw: string;
  displayKeys: string[];
  mod: boolean;
  ctrl: boolean;
  meta: boolean;
  alt: boolean;
  shift: boolean;
  key: string;
}

export function parseHotkeyCombo(combo: string): ParsedCombo {
  const parts = combo.split('+').map((p) => p.trim());
  let mod = false;
  let ctrl = false;
  let meta = false;
  let alt = false;
  let shift = false;
  let key = '';

  const displayKeys: string[] = [];
  const mac = isMac();

  for (const part of parts) {
    const lower = part.toLowerCase();
    if (lower === 'mod' || lower === 'cmdorctrl' || lower === 'commandorcontrol') {
      mod = true;
      displayKeys.push(mac ? '⌘' : 'Ctrl');
    } else if (lower === 'ctrl' || lower === 'control') {
      ctrl = true;
      displayKeys.push('Ctrl');
    } else if (lower === 'meta' || lower === 'cmd' || lower === 'command') {
      meta = true;
      displayKeys.push('⌘');
    } else if (lower === 'alt' || lower === 'option') {
      alt = true;
      displayKeys.push(mac ? '⌥' : 'Alt');
    } else if (lower === 'shift') {
      shift = true;
      displayKeys.push('⇧');
    } else {
      key = normalizeKey(part);
      displayKeys.push(part.length === 1 ? part.toUpperCase() : part);
    }
  }

  return { raw: combo, displayKeys, mod, ctrl, meta, alt, shift, key };
}

function isEditingInput(target: EventTarget | null): boolean {
  if (!target || typeof HTMLElement === 'undefined' || !(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable ||
    target.getAttribute('role') === 'textbox'
  );
}

function matchesEvent(combo: ParsedCombo, event: KeyboardEvent): boolean {
  const mac = isMac();
  const eventKey = normalizeKey(event.key ?? '');

  const requiredCtrl = combo.ctrl || (combo.mod && !mac);
  const requiredMeta = combo.meta || (combo.mod && mac);

  if (requiredCtrl !== event.ctrlKey) return false;
  if (requiredMeta !== event.metaKey) return false;
  if (combo.alt !== event.altKey) return false;

  if (combo.shift !== event.shiftKey) {
    if (!(combo.key === '?' && event.key === '?' && event.shiftKey)) {
      return false;
    }
  }

  if (combo.key === '?' && event.key === '?') return true;
  if (combo.key === '/' && (event.key === '/' || event.code === 'Slash')) return true;

  if (combo.key && eventKey !== combo.key) {
    const codeKey = (event.code ?? '').toLowerCase().replace(/^(key|digit)/, '');
    if (codeKey !== combo.key) {
      return false;
    }
  }

  return true;
}

export function useHotkeys(
  combos: string | string[],
  handler: (event: KeyboardEvent) => void,
  options: UseHotkeysOptions = {},
) {
  const {
    preventDefault = true,
    stopPropagation = true,
    enabled = true,
    enableOnInputs = false,
    label,
    description,
    category = 'action',
    target,
  } = options;

  const rawCombos = Array.isArray(combos) ? combos : [combos];
  const parsedCombos = rawCombos.map(parseHotkeyCombo);

  const registrationId = `hotkey-${nextRegistryId++}`;
  const firstCombo = parsedCombos[0];

  if (firstCombo) {
    activeRegistry.set(registrationId, {
      id: registrationId,
      combo: firstCombo.raw,
      keys: firstCombo.displayKeys,
      label: label ?? firstCombo.raw,
      description,
      category,
      action: () => {
        if (typeof KeyboardEvent !== 'undefined') {
          handler(new KeyboardEvent('keydown'));
        }
      },
    });
  }

  function handleKeydown(event: KeyboardEvent) {
    const isEnabled = typeof enabled === 'function' ? enabled() : enabled;
    if (!isEnabled) return;

    const inInput = isEditingInput(event.target);

    for (const combo of parsedCombos) {
      if (matchesEvent(combo, event)) {
        const hasModifier = combo.mod || combo.ctrl || combo.meta || combo.alt;
        const isEscape = combo.key === 'escape';
        if (inInput && !enableOnInputs && !hasModifier && !isEscape) {
          continue;
        }

        if (preventDefault) {
          event.preventDefault();
        }
        if (stopPropagation) {
          event.stopPropagation();
        }
        handler(event);
        return;
      }
    }
  }

  const listenerTarget: EventTarget | null =
    target !== undefined ? target : typeof window !== 'undefined' ? window : null;

  if (listenerTarget) {
    listenerTarget.addEventListener('keydown', handleKeydown as EventListener);
  }

  function destroy() {
    activeRegistry.delete(registrationId);
    if (listenerTarget) {
      listenerTarget.removeEventListener('keydown', handleKeydown as EventListener);
    }
  }

  try {
    onDestroy(destroy);
  } catch {
    // Called outside component lifecycle
  }

  return {
    destroy,
  };
}
