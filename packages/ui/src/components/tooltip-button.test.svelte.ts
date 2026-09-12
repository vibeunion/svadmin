import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TooltipInteractionHarness from '../../test/fixtures/TooltipInteractionHarness.svelte';
import TooltipLayerStackHarness from '../../test/fixtures/TooltipLayerStackHarness.svelte';
import TooltipLifecycleHarness from '../../test/fixtures/TooltipLifecycleHarness.svelte';
import TooltipCompletionHarness from '../../test/fixtures/TooltipCompletionHarness.svelte';
import TooltipTetherHarness from '../../test/fixtures/TooltipTetherHarness.svelte';

type DismissibleLayer = {
  opts: {
    ref: {
      current: HTMLElement | null;
    };
  };
};

declare global {
  // bits-ui exposes this registry for coordinating dismissible layers.
  // The regression is observable when a destroyed tooltip remains registered.
  var bitsDismissableLayers: Map<DismissibleLayer, unknown> | undefined;
}

function disconnectedTooltipLayers() {
  return [...(globalThis.bitsDismissableLayers?.keys() ?? [])].filter((layer) => {
    const node = layer.opts.ref.current;
    return node?.dataset['slot'] === 'tooltip-content' && !node.isConnected;
  });
}

function createAnimationGate() {
  let resolveFinished: () => void = () => {};
  const finished = new Promise<void>((resolve) => {
    resolveFinished = resolve;
  });
  return {
    animation: { finished } as unknown as Animation,
    resolve: resolveFinished,
  };
}

describe('TooltipButton lifecycle', () => {
  beforeEach(() => {
    globalThis.bitsDismissableLayers?.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(Element.prototype, 'getAnimations');
  });

  it('does not re-register a disconnected tooltip layer after click navigation destroys it', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(TooltipLifecycleHarness);

    for (let index = 0; index < 20; index += 1) {
      const trigger = screen.getByRole('button', { name: 'Edit record' });
      await fireEvent.pointerEnter(trigger, { pointerType: 'mouse' });
      await waitFor(() => expect(document.querySelector('[data-slot="tooltip-content"]')).not.toBeNull());
      const content = document.querySelector<HTMLElement>('[data-slot="tooltip-content"]');
      expect(content?.id).toBeTruthy();
      expect(trigger.getAttribute('aria-describedby')?.split(/\s+/)).toEqual(
        expect.arrayContaining(['existing-tooltip-description', content?.id]),
      );

      await fireEvent.click(trigger);
      await waitFor(() => expect(screen.getByTestId('tooltip-navigations').textContent).toBe(String(index + 1)));
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(document.querySelector('[data-slot="tooltip-content"]')).toBeNull();
      expect(disconnectedTooltipLayers()).toHaveLength(0);
      expect(globalThis.bitsDismissableLayers?.size ?? 0).toBe(0);

      if (index < 19) await fireEvent.click(screen.getByTestId('tooltip-reset'));
    }

    expect([...warn.mock.calls, ...error.mock.calls].flat().join(' ')).not.toContain('derived_inert');
  });

  it('keeps hoverable custom content open during pointer transit and closes it on leave or Escape', async () => {
    render(TooltipInteractionHarness);

    const trigger = screen.getByRole('button', { name: 'Hover target' });
    await fireEvent.pointerEnter(trigger, { pointerType: 'mouse' });
    const content = await screen.findByRole('tooltip');
    await waitFor(() => expect(screen.getByTestId('tooltip-changed-states').textContent).toBe('true'));
    await waitFor(() => expect(screen.getByTestId('tooltip-completed-states').textContent).toBe('true'));
    expect(content.getAttribute('data-testid')).toBe('custom-tooltip-content');
    expect(trigger.getAttribute('aria-describedby')?.split(/\s+/)).toEqual(
      expect.arrayContaining(['existing-interaction-description', content.id]),
    );

    await fireEvent.pointerLeave(trigger, { pointerType: 'mouse', relatedTarget: content });
    await fireEvent.pointerEnter(content, { pointerType: 'mouse', relatedTarget: trigger });
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(screen.getByRole('tooltip')).toBe(content);

    await fireEvent.pointerLeave(content, { pointerType: 'mouse' });
    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());
    await waitFor(() => expect(screen.getByTestId('tooltip-changed-states').textContent).toBe('true,false'));
    await waitFor(() => expect(screen.getByTestId('tooltip-completed-states').textContent).toBe('true,false'));

    await fireEvent.focus(trigger);
    await screen.findByRole('tooltip');
    await waitFor(() =>
      expect(screen.getByTestId('tooltip-changed-states').textContent).toBe('true,false,true'),
    );
    await waitFor(() =>
      expect(screen.getByTestId('tooltip-completed-states').textContent).toBe('true,false,true'),
    );
    await fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());
    await waitFor(() =>
      expect(screen.getByTestId('tooltip-changed-states').textContent).toBe('true,false,true,false'),
    );
    await waitFor(() =>
      expect(screen.getByTestId('tooltip-completed-states').textContent).toBe('true,false,true,false'),
    );
  });

  it('supports detached tether triggers, singleton payloads, style objects, direction, and completion', async () => {
    render(TooltipTetherHarness);

    const first = screen.getByRole('button', { name: 'First detached trigger' });
    await fireEvent.pointerEnter(first, { pointerType: 'mouse' });

    const firstContent = await screen.findByRole('tooltip');
    expect(firstContent.textContent?.trim()).toBe('First payload:tether-first:true');
    expect(first.getAttribute('aria-describedby')?.split(/\s+/)).toEqual(
      expect.arrayContaining(['existing-tether-first', firstContent.id]),
    );
    expect(screen.getByRole('button', { name: 'Second detached trigger' }).getAttribute('aria-describedby')).toBe(
      'existing-tether-second',
    );
    expect(screen.getByRole('button', { name: 'Third detached trigger' }).getAttribute('aria-describedby')).toBe(
      'existing-tether-third',
    );
    expect(firstContent.style.color).toBe('rgb(1, 2, 3)');
    expect(firstContent.style.getPropertyValue('--tooltip-test-state')).toBe('ready');
    expect(firstContent.dir).toBe('rtl');
    await waitFor(() => expect(screen.getByTestId('tether-completed-states').textContent).toBe('true'));

    await fireEvent.pointerLeave(first, { pointerType: 'mouse' });
    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());
    await waitFor(() => expect(screen.getByTestId('tether-completed-states').textContent).toBe('true,false'));

    const second = screen.getByRole('button', { name: 'Second detached trigger' });
    await fireEvent.pointerEnter(second, { pointerType: 'mouse' });
    const secondContent = await screen.findByRole('tooltip');
    expect(secondContent.textContent?.trim()).toBe('Second payload:tether-second:true');
    expect(second.getAttribute('aria-describedby')?.split(/\s+/)).toEqual(
      expect.arrayContaining(['existing-tether-second', secondContent.id]),
    );
    expect(first.getAttribute('aria-describedby')).toBe('existing-tether-first');
    expect(screen.getByRole('button', { name: 'Third detached trigger' }).getAttribute('aria-describedby')).toBe(
      'existing-tether-third',
    );
    expect(secondContent.style.color).toBe('');
    await waitFor(() => expect(screen.getByTestId('tether-completed-states').textContent).toBe('true,false,true'));

    await fireEvent.pointerLeave(second, { pointerType: 'mouse' });
    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());

    const third = screen.getByRole('button', { name: 'Third detached trigger' });
    await fireEvent.pointerEnter(third, { pointerType: 'mouse' });
    const thirdContent = await screen.findByRole('tooltip');
    expect(thirdContent.textContent?.trim()).toBe('Third payload:tether-third:true');
    expect(thirdContent.style.color).toBe('rgb(4, 5, 6)');

    await fireEvent.pointerLeave(third, { pointerType: 'mouse' });
    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());
    await fireEvent.click(screen.getByTestId('open-second-tether'));
    const programmaticContent = await screen.findByRole('tooltip');
    expect(programmaticContent.textContent?.trim()).toBe('Second payload:tether-second:true');
  });

  it('waits for enter and exit animations before reporting completion or unmounting', async () => {
    const enter = createAnimationGate();
    const exit = createAnimationGate();
    const animationBatches = [[enter.animation], [exit.animation]];
    const startingStyleAtAnimationRead: boolean[] = [];
    const getAnimations = vi.fn(function (this: Element) {
      startingStyleAtAnimationRead.push(this.hasAttribute('data-starting-style'));
      return animationBatches.shift() ?? [];
    });
    Object.defineProperty(Element.prototype, 'getAnimations', {
      configurable: true,
      value: getAnimations,
    });

    render(TooltipCompletionHarness);
    await fireEvent.click(screen.getByTestId('completion-open'));
    const content = await screen.findByRole('tooltip');
    await waitFor(() => expect(getAnimations).toHaveBeenCalledTimes(1));
    expect(startingStyleAtAnimationRead[0]).toBe(false);
    expect(screen.getByTestId('completion-states').textContent).toBe('');

    enter.resolve();
    await waitFor(() => expect(screen.getByTestId('completion-states').textContent).toBe('true'));

    await fireEvent.click(screen.getByTestId('completion-close'));
    await waitFor(() => expect(getAnimations).toHaveBeenCalledTimes(2));
    expect(document.querySelector('[data-slot="tooltip-content"]')).toBe(content);
    expect(screen.getByTestId('completion-states').textContent).toBe('true');

    exit.resolve();
    await waitFor(() => expect(document.querySelector('[data-slot="tooltip-content"]')).toBeNull());
    expect(screen.getByTestId('completion-states').textContent).toBe('true,false');
  });

  it('ignores stale exit completion when an ending tooltip rapidly reopens', async () => {
    const enter = createAnimationGate();
    const exit = createAnimationGate();
    const reenter = createAnimationGate();
    const animationBatches = [[enter.animation], [exit.animation], [reenter.animation]];
    const getAnimations = vi.fn(() => animationBatches.shift() ?? []);
    Object.defineProperty(Element.prototype, 'getAnimations', {
      configurable: true,
      value: getAnimations,
    });

    render(TooltipCompletionHarness);
    await fireEvent.click(screen.getByTestId('completion-open'));
    await waitFor(() => expect(getAnimations).toHaveBeenCalledTimes(1));
    enter.resolve();
    await waitFor(() => expect(screen.getByTestId('completion-states').textContent).toBe('true'));

    await fireEvent.click(screen.getByTestId('completion-close'));
    await waitFor(() => expect(getAnimations).toHaveBeenCalledTimes(2));
    await fireEvent.click(screen.getByTestId('completion-reopen'));
    await waitFor(() => expect(getAnimations).toHaveBeenCalledTimes(3));

    exit.resolve();
    await Promise.resolve();
    expect(screen.getByTestId('completion-open-state').textContent).toBe('true');
    expect(document.querySelector('[data-slot="tooltip-content"]')).not.toBeNull();
    expect(screen.getByTestId('completion-states').textContent).toBe('true');

    reenter.resolve();
    await waitFor(() => expect(screen.getByTestId('completion-states').textContent).toBe('true,true'));
  });

  it('keeps closed content mounted with forceMount after exit completion', async () => {
    const getAnimations = vi.fn(() => [] as Animation[]);
    Object.defineProperty(Element.prototype, 'getAnimations', {
      configurable: true,
      value: getAnimations,
    });

    render(TooltipCompletionHarness);
    await fireEvent.click(screen.getByTestId('completion-force-mount'));
    const content = document.querySelector<HTMLElement>('[data-slot="tooltip-content"]');
    expect(content).not.toBeNull();
    expect(content?.getAttribute('aria-hidden')).toBe('true');

    await fireEvent.click(screen.getByTestId('completion-open'));
    await waitFor(() => expect(screen.getByTestId('completion-states').textContent).toBe('true'));
    await fireEvent.click(screen.getByTestId('completion-close'));
    await waitFor(() => expect(screen.getByTestId('completion-states').textContent).toBe('true,false'));

    expect(document.querySelector('[data-slot="tooltip-content"]')).toBe(content);
    expect(content?.getAttribute('aria-hidden')).toBe('true');
    expect(content?.getAttribute('data-state')).toBe('closed');

    await fireEvent.click(screen.getByTestId('completion-force-mount'));
    await waitFor(() => expect(document.querySelector('[data-slot="tooltip-content"]')).toBeNull());
  });

  it('lets an outer close layer handle pointer outside when the inner layer defers', async () => {
    render(TooltipLayerStackHarness, {
      outerInteract: 'close',
      innerInteract: 'defer-otherwise-close',
    });
    await fireEvent.click(screen.getByTestId('layer-open'));
    await screen.findByTestId('inner-tooltip-layer');

    await fireEvent.pointerDown(screen.getByTestId('layer-outside'), { pointerType: 'mouse', button: 0 });
    await waitFor(() => expect(screen.getByTestId('layer-open-states').textContent).toBe('false,true'));
    expect(screen.getByTestId('layer-events').textContent).toBe('outer-pointer');
  });

  it('does not dismiss a parent when pointer interaction stays inside a portaled child layer', async () => {
    render(TooltipLayerStackHarness, {
      outerInteract: 'close',
      innerInteract: 'defer-otherwise-close',
    });
    await fireEvent.click(screen.getByTestId('layer-open'));
    const innerLayer = await screen.findByTestId('inner-tooltip-layer');

    await fireEvent.pointerDown(innerLayer, { pointerType: 'mouse', button: 0 });
    await Promise.resolve();

    expect(screen.getByTestId('layer-open-states').textContent).toBe('true,true');
    expect(screen.getByTestId('layer-events').textContent).toBe('');
  });

  it('lets the topmost ignore layer block parent Escape handling', async () => {
    render(TooltipLayerStackHarness, {
      outerEscape: 'close',
      innerEscape: 'ignore',
    });
    await fireEvent.click(screen.getByTestId('layer-open'));
    await screen.findByTestId('inner-tooltip-layer');

    await fireEvent.keyDown(window, { key: 'Escape' });
    await Promise.resolve();
    expect(screen.getByTestId('layer-open-states').textContent).toBe('true,true');
    expect(screen.getByTestId('layer-events').textContent).toBe('');
  });

  it('chooses the bottom layer when every Escape behavior defers', async () => {
    render(TooltipLayerStackHarness, {
      outerEscape: 'defer-otherwise-ignore',
      innerEscape: 'defer-otherwise-close',
    });
    await fireEvent.click(screen.getByTestId('layer-open'));
    await screen.findByTestId('inner-tooltip-layer');

    await fireEvent.keyDown(window, { key: 'Escape' });
    await Promise.resolve();
    expect(screen.getByTestId('layer-open-states').textContent).toBe('true,true');
    expect(screen.getByTestId('layer-events').textContent).toBe('');
  });

  it('notifies focus outside without closing tooltip layers', async () => {
    render(TooltipLayerStackHarness, {
      outerInteract: 'close',
      innerInteract: 'close',
    });
    await fireEvent.click(screen.getByTestId('layer-open'));
    await screen.findByTestId('inner-tooltip-layer');

    await fireEvent.focusIn(screen.getByTestId('layer-outside'));
    await waitFor(() => expect(screen.getByTestId('layer-events').textContent).toBe('outer-focus,inner-focus'));
    expect(screen.getByTestId('layer-open-states').textContent).toBe('true,true');
  });
});
