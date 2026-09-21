// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { exampleHistoryIndex, registerExampleHistoryGuard, trackExampleHistory } from '../src/history-index';

let dispose: (() => void) | undefined;
afterEach(() => { dispose?.(); dispose = undefined; });

describe('example cross-workspace history positions', () => {
  it('runs a late-mounted page guard before host route listeners', () => {
    dispose = trackExampleHistory();
    let synchronized = false;
    const hostSync = () => { synchronized = true; };
    window.addEventListener('popstate', hostSync);
    const removeGuard = registerExampleHistoryGuard({
      popstate: event => event.stopImmediatePropagation(),
      hashchange: event => event.stopImmediatePropagation(),
    });
    try {
      window.dispatchEvent(new PopStateEvent('popstate'));
      expect(synchronized).toBe(false);
      removeGuard();
      window.dispatchEvent(new PopStateEvent('popstate'));
      expect(synchronized).toBe(true);
    } finally {
      removeGuard();
      window.removeEventListener('popstate', hostSync);
    }
  });
  it('retains host state and follows back, forward and a new branch', () => {
    const replace = window.history.replaceState.bind(window.history);
    replace({ host: 'preserved' }, '', '/#/health_office');
    dispose = trackExampleHistory();
    const office = window.history.state;
    expect(office.host).toBe('preserved');
    const start = exampleHistoryIndex();
    if (start === undefined) throw new Error('Expected initialized history');
    window.history.pushState({ host: 'about' }, '', '/#/account/about');
    const about = window.history.state;
    window.history.pushState(null, '', '/#/products');
    const products = window.history.state;
    expect(exampleHistoryIndex()).toBe(start + 2);

    replace(office, '', '/#/health_office');
    window.dispatchEvent(new PopStateEvent('popstate', { state: office }));
    expect(exampleHistoryIndex()).toBe(start);
    replace(about, '', '/#/account/about');
    window.dispatchEvent(new PopStateEvent('popstate', { state: about }));
    expect(exampleHistoryIndex()).toBe(start + 1);
    // 取消前进必须后退一格，不能把未知条目当 -1 而继续前进。
    expect(start - (exampleHistoryIndex() ?? -1)).toBe(-1);
    replace(office, '', '/#/health_office');
    window.dispatchEvent(new PopStateEvent('popstate', { state: office }));
    window.history.pushState(null, '', '/#/todos');
    expect(exampleHistoryIndex()).toBe(start + 1);
    expect(products).not.toEqual(window.history.state);
  });

  it('stamps native null-state hash entries once before page guards run', () => {
    const nativePush = window.history.pushState.bind(window.history);
    window.history.replaceState(null, '', '/#/');
    dispose = trackExampleHistory();
    const start = exampleHistoryIndex();
    if (start === undefined) throw new Error('Expected initialized history');
    nativePush(null, '', '/#/health_office');
    window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(exampleHistoryIndex()).toBe(start + 1);
    window.history.replaceState({ other: 42 }, '', '/?officeView=report#/health_office');
    expect(exampleHistoryIndex()).toBe(start + 1);
    expect(window.history.state.other).toBe(42);
  });

  it('restores history methods on disposal without losing current position', () => {
    const push = window.history.pushState;
    const replace = window.history.replaceState;
    dispose = trackExampleHistory();
    window.history.pushState(null, '', '/#/todos');
    const position = exampleHistoryIndex();
    dispose();
    dispose = undefined;
    expect(window.history.pushState).toBe(push);
    expect(window.history.replaceState).toBe(replace);
    dispose = trackExampleHistory();
    expect(exampleHistoryIndex()).toBe(position);
  });
});
