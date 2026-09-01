<script module lang="ts">
  export interface VoiceOption {
    id: string;
    name: string;
    language?: string;
    description?: string;
    local?: boolean;
    default?: boolean;
    provider?: string;
  }
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Search, Square, Volume2 } from '@lucide/svelte';
  import { cn } from '../../utils.js';

  interface Props {
    voices?: VoiceOption[];
    value?: string;
    label?: string;
    placeholder?: string;
    language?: string;
    search?: string;
    disabled?: boolean;
    discoverSystemVoices?: boolean;
    previewText?: string;
    class?: string;
    children?: Snippet;
    onchange?: (voice: VoiceOption | undefined) => void;
    onpreview?: (voice: VoiceOption) => void;
  }

  let {
    voices = [],
    value = $bindable(''),
    label = 'Voice',
    placeholder = 'Select a voice',
    language,
    search = $bindable(''),
    disabled = false,
    discoverSystemVoices = true,
    previewText = 'This is a preview of the selected voice.',
    class: className = '',
    children,
    onchange,
    onpreview,
  }: Props = $props();

  let systemVoices = $state<VoiceOption[]>([]);
  let previewing = $state(false);
  let previewSession: VoicePreviewSession | null = null;
  const allVoices = $derived(mergeVoices(voices, discoverSystemVoices ? systemVoices : []));
  const visibleVoices = $derived(allVoices.filter((voice) => {
    const matchesLanguage = !language || voice.language?.toLowerCase().startsWith(language.toLowerCase());
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || `${voice.name} ${voice.language ?? ''} ${voice.description ?? ''} ${voice.provider ?? ''}`.toLowerCase().includes(query);
    return matchesLanguage && matchesSearch;
  }));
  const selectedVoice = $derived(allVoices.find((voice) => voice.id === value));

  interface VoicePreviewSession {
    frame: HTMLIFrameElement;
    synthesis: SpeechSynthesis;
    utterance: SpeechSynthesisUtterance;
  }

  $effect(() => {
    if (!discoverSystemVoices || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const synthesis = window.speechSynthesis;
    const load = () => {
      systemVoices = synthesis.getVoices().map((voice) => ({
        id: voice.voiceURI,
        name: voice.name,
        language: voice.lang,
        local: voice.localService,
        default: voice.default,
        provider: 'System',
      }));
    };
    load();
    synthesis.addEventListener('voiceschanged', load);
    return () => synthesis.removeEventListener('voiceschanged', load);
  });

  function mergeVoices(primary: VoiceOption[], secondary: VoiceOption[]): VoiceOption[] {
    const merged = new Map<string, VoiceOption>();
    secondary.forEach((voice) => merged.set(voice.id, voice));
    primary.forEach((voice) => merged.set(voice.id, voice));
    return [...merged.values()].sort((left, right) => Number(Boolean(right.default)) - Number(Boolean(left.default)) || left.name.localeCompare(right.name));
  }

  function handleChange(event: Event): void {
    value = (event.currentTarget as HTMLSelectElement).value;
    onchange?.(allVoices.find((voice) => voice.id === value));
  }

  function finishPreview(session: VoicePreviewSession): void {
    session.utterance.onstart = null;
    session.utterance.onend = null;
    session.utterance.onerror = null;
    session.frame.remove();
    if (previewSession !== session) return;
    previewSession = null;
    previewing = false;
  }

  function createPreviewSession(text: string): VoicePreviewSession | null {
    if (typeof document === 'undefined') return null;
    const frame = document.createElement('iframe');
    frame.hidden = true;
    frame.tabIndex = -1;
    frame.setAttribute('aria-hidden', 'true');
    frame.title = 'Voice preview';
    document.body.append(frame);

    const previewWindow = frame.contentWindow as (Window & typeof globalThis) | null;
    const synthesis = previewWindow?.speechSynthesis;
    const Utterance = previewWindow?.SpeechSynthesisUtterance;
    if (!synthesis || !Utterance) {
      frame.remove();
      return null;
    }

    return { frame, synthesis, utterance: new Utterance(text) };
  }

  function preview(): void {
    if (!selectedVoice || disabled) return;
    onpreview?.(selectedVoice);
    stopPreview();
    const session = createPreviewSession(previewText);
    if (!session) return;
    previewSession = session;
    previewing = true;
    const nativeVoice = session.synthesis.getVoices().find((voice) => voice.voiceURI === selectedVoice.id);
    if (nativeVoice) session.utterance.voice = nativeVoice;
    if (selectedVoice.language) session.utterance.lang = selectedVoice.language;
    session.utterance.onstart = () => {
      if (previewSession === session) previewing = true;
    };
    session.utterance.onend = () => finishPreview(session);
    session.utterance.onerror = () => finishPreview(session);
    try {
      session.synthesis.speak(session.utterance);
    } catch (error) {
      finishPreview(session);
      if (!(error instanceof DOMException)) throw error;
    }
  }

  function stopPreview(): void {
    const session = previewSession;
    if (!session) {
      previewing = false;
      return;
    }
    previewSession = null;
    session.utterance.onstart = null;
    session.utterance.onend = null;
    session.utterance.onerror = null;
    session.synthesis.cancel();
    session.frame.remove();
    previewing = false;
  }

  $effect(() => () => stopPreview());
</script>

<section class={cn('svadmin-ai-voice-selector', className)} aria-label={label}>
  <div class="svadmin-ai-voice-selector__header"><h3>{label}</h3><span>{visibleVoices.length} voices</span></div>
  <label class="svadmin-ai-voice-selector__search">
    <Search size={14} aria-hidden="true" />
    <span class="svadmin-ai__sr-only">Search voices</span>
    <input class="svadmin-ai__input" type="search" bind:value={search} placeholder="Search voices" {disabled} />
  </label>
  <div class="svadmin-ai-voice-selector__controls">
    <label class="svadmin-ai-voice-selector__select-label">
      <span class="svadmin-ai__sr-only">{label}</span>
      <select class="svadmin-ai__select" value={value} onchange={handleChange} {disabled}>
        <option value="">{placeholder}</option>
        {#each visibleVoices as voice (voice.id)}
          <option value={voice.id}>{voice.name}{voice.language ? ` · ${voice.language}` : ''}{voice.default ? ' · Default' : ''}</option>
        {/each}
      </select>
    </label>
    <button type="button" class="svadmin-ai-voice-selector__preview" aria-label={previewing ? 'Stop voice preview' : 'Preview selected voice'} title={previewing ? 'Stop preview' : 'Preview voice'} disabled={disabled || !selectedVoice} onclick={previewing ? stopPreview : preview}>
      {#if previewing}<Square size={14} aria-hidden="true" />{:else}<Volume2 size={14} aria-hidden="true" />{/if}
    </button>
  </div>
  {#if selectedVoice}
    <div class="svadmin-ai-voice-selector__selected" aria-live="polite">
      <strong>{selectedVoice.name}</strong>
      <span>{[selectedVoice.language, selectedVoice.provider, selectedVoice.local ? 'Local' : undefined].filter(Boolean).join(' · ')}</span>
      {#if selectedVoice.description}<p>{selectedVoice.description}</p>{/if}
    </div>
  {/if}
  {@render children?.()}
</section>

<style>
  .svadmin-ai-voice-selector { display: grid; gap: .6rem; padding: .8rem; border: 1px solid var(--border, currentColor); border-radius: min(var(--radius, .5rem), .5rem); background: var(--card, transparent); color: var(--card-foreground, var(--foreground, currentColor)); }
  .svadmin-ai-voice-selector__header { display: flex; align-items: center; justify-content: space-between; gap: .75rem; }
  h3 { margin: 0; font-size: .82rem; font-weight: 650; }
  .svadmin-ai-voice-selector__header span { color: var(--muted-foreground, currentColor); font-size: .7rem; }
  .svadmin-ai-voice-selector__search { display: flex; align-items: center; gap: .4rem; color: var(--muted-foreground, currentColor); }
  .svadmin-ai__input, .svadmin-ai__select { min-height: 2.25rem; padding: .4rem .6rem; font-size: .78rem; }
  .svadmin-ai-voice-selector__controls { display: flex; align-items: center; gap: .45rem; }
  .svadmin-ai-voice-selector__select-label { min-width: 0; flex: 1; }
  .svadmin-ai-voice-selector__preview { display: inline-flex; width: 2.25rem; height: 2.25rem; flex: none; align-items: center; justify-content: center; border: 1px solid var(--border, currentColor); border-radius: min(var(--radius, .5rem), .35rem); background: transparent; color: inherit; cursor: pointer; }
  .svadmin-ai-voice-selector__preview:hover:not(:disabled) { background: var(--muted, transparent); }
  .svadmin-ai-voice-selector__preview:focus-visible, .svadmin-ai__input:focus-visible, .svadmin-ai__select:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: 2px; }
  .svadmin-ai-voice-selector__preview:disabled { cursor: not-allowed; opacity: .45; }
  .svadmin-ai-voice-selector__selected { display: grid; gap: .12rem; padding: .55rem .65rem; border-radius: min(var(--radius, .5rem), .35rem); background: var(--muted, transparent); }
  .svadmin-ai-voice-selector__selected strong { font-size: .76rem; }
  .svadmin-ai-voice-selector__selected span, .svadmin-ai-voice-selector__selected p { color: var(--muted-foreground, currentColor); font-size: .69rem; }
  .svadmin-ai-voice-selector__selected p { margin: .2rem 0 0; line-height: 1.45; }
</style>
