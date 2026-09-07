import { afterEach, describe, expect, it, vi } from 'vitest';
import { observeConversationScroll } from './scroll.js';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function setup() {
  const element = document.createElement('div');
  const child = document.createElement('div');
  element.append(child);
  let height = 1000;
  Object.defineProperties(element, {
    scrollHeight: { get: () => height },
    clientHeight: { get: () => 200 },
  });
  element.scrollTo = vi.fn((options: ScrollToOptions | number) => {
    if (typeof options !== 'number') element.scrollTop = Math.max(0, (options.top ?? 0) - 200);
  }) as typeof element.scrollTo;
  let nextFrame = 0;
  const frames = new Map<number, FrameRequestCallback>();
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.set(++nextFrame, callback);
    return nextFrame;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  let resized!: () => void;
  const disconnectResize = vi.fn();
  const observe = vi.fn();
  const unobserve = vi.fn();
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: () => void) { resized = callback; }
    observe = observe;
    unobserve = unobserve;
    disconnect = disconnectResize;
  });
  let mutated!: (records: Partial<MutationRecord>[]) => void;
  const disconnectMutation = vi.fn();
  vi.stubGlobal('MutationObserver', class {
    constructor(callback: typeof mutated) { mutated = callback; }
    observe() {}
    disconnect = disconnectMutation;
  });
  const changed = vi.fn();
  const controller = observeConversationScroll(element, changed);
  const flush = () => {
    const callbacks = [...frames.values()];
    frames.clear();
    for (const callback of callbacks) callback(0);
  };
  const scroll = (top: number) => {
    element.scrollTop = top;
    element.dispatchEvent(new Event('scroll'));
  };
  return {
    element, child, controller, changed, frames, flush, scroll, resized, mutated,
    observe, unobserve, disconnectResize, disconnectMutation,
    grow: (nextHeight: number) => { height = nextHeight; },
  };
}

describe('conversation scroll following', () => {
  it('follows initial history, streamed DOM mutations, and delayed content resize', () => {
    const view = setup();
    view.flush();
    expect(view.element.scrollTop).toBe(800);
    view.grow(1300);
    view.mutated([{ type: 'characterData' }]);
    view.resized();
    expect(view.frames.size).toBe(1);
    view.flush();
    expect(view.element.scrollTop).toBe(1100);
    view.grow(1500);
    view.resized();
    view.flush();
    expect(view.element.scrollTop).toBe(1300);
    view.controller.destroy();
  });

  it('preserves reading position while paused and resumes from the latest button', () => {
    const view = setup();
    view.flush();
    view.scroll(300);
    expect(view.changed).toHaveBeenLastCalledWith(false);
    view.grow(1400);
    view.resized();
    view.flush();
    expect(view.element.scrollTop).toBe(300);
    view.controller.scrollToBottom();
    expect(view.element.scrollTop).toBe(1200);
    view.grow(1600);
    view.resized();
    view.flush();
    expect(view.element.scrollTop).toBe(1400);
    view.controller.destroy();
  });

  it('resumes following after manually reaching bottom', () => {
    const view = setup();
    view.flush();
    view.scroll(200);
    view.scroll(800);
    view.grow(1200);
    view.resized();
    view.flush();
    expect(view.element.scrollTop).toBe(1000);
    view.controller.destroy();
  });

  it('ignores stationary scroll events caused by content growth', () => {
    const view = setup();
    view.flush();
    view.grow(1400);
    view.element.dispatchEvent(new Event('scroll'));
    view.resized();
    view.flush();
    expect(view.element.scrollTop).toBe(1200);
    view.controller.destroy();
  });

  it('resumes following after clearing history while paused at the top', () => {
    const view = setup();
    view.flush();
    view.scroll(0);
    view.grow(200);
    view.mutated([{ type: 'childList' }]);
    view.flush();
    view.grow(1000);
    view.mutated([{ type: 'childList' }]);
    view.flush();
    expect(view.element.scrollTop).toBe(800);
    view.controller.destroy();
  });

  it('tracks replaced children and cancels pending work on cleanup', () => {
    const view = setup();
    const replacement = document.createElement('article');
    view.element.replaceChildren(replacement);
    view.mutated([{ type: 'childList' }]);
    expect(view.unobserve).toHaveBeenCalledWith(view.child);
    expect(view.observe).toHaveBeenCalledWith(replacement);
    view.controller.destroy();
    view.resized();
    view.flush();
    expect(view.frames.size).toBe(0);
    expect(view.element.scrollTo).not.toHaveBeenCalled();
    expect(view.disconnectResize).toHaveBeenCalledOnce();
    expect(view.disconnectMutation).toHaveBeenCalledOnce();
  });
});
