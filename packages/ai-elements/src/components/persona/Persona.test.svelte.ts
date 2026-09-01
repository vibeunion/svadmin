import { cleanup, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Persona from './Persona.svelte';

const riveMocks = vi.hoisted(() => ({
  instances: [] as Array<{
    cleanup: ReturnType<typeof vi.fn>;
    inputs: Array<{ name: string; value: boolean }>;
    params: Record<string, unknown>;
  }>,
  resize: vi.fn(),
  rgb: vi.fn(),
}));

vi.mock('@rive-app/webgl2', () => ({
  Rive: class RiveMock {
    cleanup = vi.fn();
    inputs = ['listening', 'thinking', 'speaking', 'asleep'].map((name) => ({
      name,
      value: false,
    }));
    params: Record<string, unknown>;
    resizeDrawingSurfaceToCanvas = riveMocks.resize;
    viewModelInstance = { color: () => ({ rgb: riveMocks.rgb }) };

    constructor(params: Record<string, unknown>) {
      this.params = params;
      riveMocks.instances.push(this);
      queueMicrotask(() => {
        const onLoad = params.onLoad as ((event: { type: string }) => void) | undefined;
        onLoad?.({ type: 'load' });
      });
    }

    stateMachineInputs() {
      return this.inputs;
    }
  },
}));

afterEach(() => {
  cleanup();
  riveMocks.instances.length = 0;
  vi.clearAllMocks();
  document.documentElement.classList.remove('dark');
});

describe('Persona', () => {
  it('drives Rive state inputs and recreates the runtime when the variant changes', async () => {
    const onready = vi.fn();
    const view = render(Persona, { state: 'listening', variant: 'obsidian', onready });

    await waitFor(() => expect(riveMocks.instances).toHaveLength(1));
    await waitFor(() => expect(onready).toHaveBeenCalledOnce());
    expect(riveMocks.instances[0]?.params).toMatchObject({
      autoplay: true,
      autoBind: true,
      stateMachine: 'default',
    });
    expect(riveMocks.instances[0]?.inputs.find(({ name }) => name === 'listening')?.value).toBe(
      true,
    );

    await view.rerender({ state: 'speaking', variant: 'obsidian', onready });
    await waitFor(() =>
      expect(riveMocks.instances[0]?.inputs.find(({ name }) => name === 'speaking')?.value).toBe(
        true,
      ),
    );

    await view.rerender({ state: 'speaking', variant: 'opal', onready });
    await waitFor(() => expect(riveMocks.instances).toHaveLength(2));
    expect(riveMocks.instances[0]?.cleanup).toHaveBeenCalledOnce();
    expect(String(riveMocks.instances[1]?.params.src)).toContain('orb-1.2.riv');

    view.unmount();
    expect(riveMocks.instances[1]?.cleanup).toHaveBeenCalledOnce();
  });

  it('updates dynamic persona color when the document theme changes', async () => {
    render(Persona, { state: 'idle', variant: 'command' });
    await waitFor(() => expect(riveMocks.rgb).toHaveBeenCalledWith(0, 0, 0));

    document.documentElement.classList.add('dark');
    await waitFor(() => expect(riveMocks.rgb).toHaveBeenCalledWith(255, 255, 255));
  });
});
