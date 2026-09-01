<script module lang="ts">
  import type { Event as RiveEvent } from '@rive-app/webgl2';

  export type PersonaState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'asleep';
  export type PersonaVariant = 'command' | 'glint' | 'halo' | 'mana' | 'obsidian' | 'opal';

  export interface PersonaProps {
    state?: PersonaState;
    variant?: PersonaVariant;
    class?: string;
    onload?: (event: RiveEvent) => void;
    onloaderror?: (error: Error) => void;
    onready?: () => void;
    onpause?: (event: RiveEvent) => void;
    onplay?: (event: RiveEvent) => void;
    onstop?: (event: RiveEvent) => void;
  }

  interface PersonaSource {
    dynamicColor: boolean;
    source: string;
  }

  const PERSONA_SOURCES: Record<PersonaVariant, PersonaSource> = {
    command: {
      dynamicColor: true,
      source: 'https://ejiidnob33g9ap1r.public.blob.vercel-storage.com/command-2.0.riv',
    },
    glint: {
      dynamicColor: true,
      source: 'https://ejiidnob33g9ap1r.public.blob.vercel-storage.com/glint-2.0.riv',
    },
    halo: {
      dynamicColor: true,
      source: 'https://ejiidnob33g9ap1r.public.blob.vercel-storage.com/halo-2.0.riv',
    },
    mana: {
      dynamicColor: false,
      source: 'https://ejiidnob33g9ap1r.public.blob.vercel-storage.com/mana-2.0.riv',
    },
    obsidian: {
      dynamicColor: true,
      source: 'https://ejiidnob33g9ap1r.public.blob.vercel-storage.com/obsidian-2.0.riv',
    },
    opal: {
      dynamicColor: false,
      source: 'https://ejiidnob33g9ap1r.public.blob.vercel-storage.com/orb-1.2.riv',
    },
  };
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import type { Rive, StateMachineInput } from '@rive-app/webgl2';
  import { cn } from '../../utils.js';

  const STATE_MACHINE = 'default';

  let {
    state: personaState = 'idle',
    variant = 'obsidian',
    class: className = '',
    onload,
    onloaderror,
    onready,
    onpause,
    onplay,
    onstop,
  }: PersonaProps = $props();

  let canvas: HTMLCanvasElement;
  let rive = $state<Rive | null>(null);
  let mounted = $state(false);
  let theme = $state<'light' | 'dark'>('light');
  let generation = 0;

  function currentTheme(): 'light' | 'dark' {
    if (document.documentElement.classList.contains('dark')) return 'dark';
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function asError(error: unknown): Error {
    return error instanceof Error ? error : new Error(String(error));
  }

  function setStateInputs(inputs: StateMachineInput[] | undefined): void {
    for (const input of inputs ?? []) {
      if (input.name === 'listening') input.value = personaState === 'listening';
      if (input.name === 'thinking') input.value = personaState === 'thinking';
      if (input.name === 'speaking') input.value = personaState === 'speaking';
      if (input.name === 'asleep') input.value = personaState === 'asleep';
    }
  }

  function updateState(): void {
    setStateInputs(rive?.stateMachineInputs(STATE_MACHINE));
  }

  function updateColor(): void {
    if (!(rive && PERSONA_SOURCES[variant].dynamicColor)) return;
    const color = rive.viewModelInstance?.color('color');
    if (!color) return;
    const channel = theme === 'dark' ? 255 : 0;
    color.rgb(channel, channel, channel);
  }

  function cleanupRive(): void {
    generation += 1;
    rive?.cleanup();
    rive = null;
  }

  async function initializeRive(nextVariant: PersonaVariant): Promise<void> {
    const source = PERSONA_SOURCES[nextVariant];
    const requestGeneration = generation + 1;
    cleanupRive();
    generation = requestGeneration;

    try {
      const { Rive: RiveRuntime } = await import('@rive-app/webgl2');
      if (!mounted || requestGeneration !== generation) return;

      rive = new RiveRuntime({
        canvas,
        src: source.source,
        autoplay: true,
        autoBind: true,
        stateMachine: STATE_MACHINE,
        onLoad: (event) => {
          rive?.resizeDrawingSurfaceToCanvas();
          updateState();
          updateColor();
          onload?.(event);
          onready?.();
        },
        onLoadError: (event) => onloaderror?.(asError(event.data ?? 'Persona failed to load.')),
        onPause: (event) => onpause?.(event),
        onPlay: (event) => onplay?.(event),
        onStop: (event) => onstop?.(event),
      });
    } catch (error) {
      if (requestGeneration === generation) onloaderror?.(asError(error));
    }
  }

  $effect(() => {
    if (!mounted) return;
    const nextVariant = variant;
    const frame = requestAnimationFrame(() => void initializeRive(nextVariant));
    return () => cancelAnimationFrame(frame);
  });

  $effect(() => {
    void personaState;
    updateState();
  });

  $effect(() => {
    void theme;
    void variant;
    updateColor();
  });

  onMount(() => {
    mounted = true;
    theme = currentTheme();

    const resizeObserver = new ResizeObserver(() => rive?.resizeDrawingSurfaceToCanvas());
    resizeObserver.observe(canvas);

    const themeObserver = new MutationObserver(() => (theme = currentTheme()));
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)');
    const updateTheme = () => (theme = currentTheme());
    mediaQuery?.addEventListener('change', updateTheme);

    return () => {
      mounted = false;
      resizeObserver.disconnect();
      themeObserver.disconnect();
      mediaQuery?.removeEventListener('change', updateTheme);
      cleanupRive();
    };
  });
</script>

<div
  class={cn('inline-block size-16 shrink-0', className)}
  data-state={personaState}
  data-variant={variant}
  role="img"
  aria-label={`AI persona: ${personaState}`}
>
  <canvas bind:this={canvas} class="svadmin-ai svadmin-ai-persona size-full" aria-hidden="true"></canvas>
</div>
