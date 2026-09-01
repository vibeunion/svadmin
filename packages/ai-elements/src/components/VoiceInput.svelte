<script lang="ts">
  import { onMount } from 'svelte';
  import { cn } from '../utils.js';
  type Props = { onresult?: (text: string) => void; onstart?: () => void; onend?: () => void; class?: string; label?: string };
  let { onresult, onstart, onend, class: className = '', label = 'Voice input' }: Props = $props();
  let listening = $state(false);
  let supported = $state(true);
  type Recognition = { start(): void; stop(): void; onstart: (() => void) | null; onend: (() => void) | null; onerror: (() => void) | null; onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null };
  let recognition = $state<Recognition | null>(null);
  onMount(() => {
    const ctor = (globalThis as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }).SpeechRecognition ?? (globalThis as { webkitSpeechRecognition?: new () => Recognition }).webkitSpeechRecognition;
    if (!ctor) { supported = false; return; }
    const instance = new ctor();
    recognition = instance;
    instance.onstart = () => { listening = true; onstart?.(); };
    instance.onend = () => { listening = false; onend?.(); };
    instance.onerror = () => { listening = false; onend?.(); };
    instance.onresult = (event) => { const text = Array.from(event.results).map((result) => result[0]?.transcript ?? '').join(''); if (text) onresult?.(text); };
    return () => { recognition?.stop(); recognition = null; };
  });
  function toggle(): void { if (!recognition) return; if (listening) recognition.stop(); else recognition.start(); }
</script>

<button type="button" class={cn('svadmin-ai__button svadmin-ai__button--ghost', className)} aria-label={supported ? label : `${label} unavailable`} aria-pressed={listening} disabled={!supported} onclick={toggle}>{listening ? '■ Stop' : '🎙 Voice'}</button>
