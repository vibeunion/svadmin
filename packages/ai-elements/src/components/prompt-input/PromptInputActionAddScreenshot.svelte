<script lang="ts">
  import type { HTMLButtonAttributes } from 'svelte/elements'; import { Monitor } from '@lucide/svelte'; import { cn } from '../../utils.js'; import { usePromptInputAttachments } from './context.svelte.js';
  interface Props extends Omit<HTMLButtonAttributes, 'class' | 'onselect'> { class?: string; label?: string; onselect?: (event: MouseEvent) => void; }
  let { class: className = '', label = 'Take screenshot', onclick, onselect, ...rest }: Props = $props(); const attachments = usePromptInputAttachments(); let capturing = $state(false);
  async function capture(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }): Promise<void> {
    onclick?.(event); onselect?.(event); if (event.defaultPrevented || capturing || !navigator.mediaDevices?.getDisplayMedia) return;
    let stream: MediaStream | undefined; const video = document.createElement('video'); capturing = true;
    try { stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false }); video.srcObject = stream; video.muted = true; video.playsInline = true; await new Promise<void>((resolve, reject) => { video.onloadedmetadata = () => resolve(); video.onerror = () => reject(new Error('Unable to load the captured screen.')); }); await video.play(); const canvas = document.createElement('canvas'); canvas.width = video.videoWidth; canvas.height = video.videoHeight; const context = canvas.getContext('2d'); if (!context) return; context.drawImage(video, 0, 0); const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png')); if (blob) attachments.add([new File([blob], `screenshot-${new Date().toISOString().replaceAll(/[:.]/g, '-')}.png`, { type: 'image/png' })]); }
    catch (error) { if (!(error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'AbortError'))) throw error; }
    finally { stream?.getTracks().forEach((track) => track.stop()); video.pause(); video.srcObject = null; capturing = false; }
  }
</script>
<button {...rest} type="button" role="menuitem" class={cn('flex min-h-9 w-full items-center gap-2 rounded px-2 text-left text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring', className)} disabled={capturing || rest.disabled} aria-busy={capturing} data-slot="prompt-input-action-add-screenshot" onclick={capture}><Monitor size={16} aria-hidden="true" />{capturing ? 'Capturing…' : label}</button>
