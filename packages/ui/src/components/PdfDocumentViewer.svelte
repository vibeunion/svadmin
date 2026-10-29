<script lang="ts">
  import { Button } from './ui/button/index.js';
  import { Badge } from './ui/badge/index.js';
  import {
    ChevronLeft,
    ChevronRight,
    ZoomIn,
    ZoomOut,
    RotateCw,
    Download,
    Printer,
    FileText,
    Maximize2,
  } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export interface DocumentStamp {
    id: string;
    text: string;
    page: number;
    x: number; // percentage (0-100)
    y: number; // percentage (0-100)
    status?: 'approved' | 'rejected' | 'confidential' | 'reviewed';
  }

  interface Props {
    fileUrl?: string;
    fileName?: string;
    totalPages?: number;
    currentPage?: number;
    stamps?: DocumentStamp[];
    onpagechange?: (page: number) => void;
    ondownload?: () => void;
    onprint?: () => void;
    class?: string;
  }

  let {
    fileUrl = '',
    fileName = 'Contract_Document.pdf',
    totalPages = 1,
    currentPage = $bindable(1),
    stamps = [],
    onpagechange,
    ondownload,
    onprint,
    class: className = '',
  }: Props = $props();

  let zoomLevel = $state(100);
  let rotation = $state(0);
  let isFullscreen = $state(false);

  function prevPage() {
    if (currentPage > 1) {
      currentPage -= 1;
      onpagechange?.(currentPage);
    }
  }

  function nextPage() {
    if (currentPage < totalPages) {
      currentPage += 1;
      onpagechange?.(currentPage);
    }
  }

  function zoomIn() {
    zoomLevel = Math.min(zoomLevel + 25, 250);
  }

  function zoomOut() {
    zoomLevel = Math.max(zoomLevel - 25, 50);
  }

  function rotate() {
    rotation = (rotation + 90) % 360;
  }

  function handleDownload() {
    if (ondownload) {
      ondownload();
      return;
    }
    if (fileUrl) {
      const a = document.createElement('a');
      a.href = fileUrl;
      a.download = fileName;
      a.click();
    }
  }

  function handlePrint() {
    if (onprint) {
      onprint();
    } else {
      window.print();
    }
  }

  const pageStamps = $derived(
    stamps.filter((s) => s.page === currentPage)
  );

  function getStampVariant(status?: string) {
    switch (status) {
      case 'approved':
        return 'bg-success/15 text-success border-success/30';
      case 'rejected':
        return 'bg-destructive/15 text-destructive border-destructive/30';
      case 'confidential':
        return 'bg-warning/15 text-warning border-warning/30';
      default:
        return 'bg-primary/15 text-primary border-primary/30';
    }
  }
</script>

<div
  class={cn(
    'flex flex-col rounded-xl border border-border bg-card shadow-xs text-xs overflow-hidden transition-all',
    isFullscreen ? 'fixed inset-4 z-50 shadow-2xl' : 'min-h-[500px]',
    className
  )}
>
  <!-- Toolbar Header -->
  <div class="flex flex-wrap items-center justify-between gap-2 p-3 bg-muted/30 border-b border-border/60">
    <!-- File Title -->
    <div class="flex items-center gap-2 font-medium text-foreground truncate max-w-64">
      <FileText class="h-4 w-4 text-primary shrink-0" />
      <span class="truncate">{fileName}</span>
    </div>

    <!-- Paging Controls -->
    <div class="flex items-center gap-1.5">
      <Button
        variant="ghost"
        size="sm"
        class="h-7 w-7 p-0"
        disabled={currentPage <= 1}
        onclick={prevPage}
        title="Previous Page"
      >
        <ChevronLeft class="h-4 w-4" />
      </Button>

      <div class="flex items-center gap-1 font-mono text-[11px] text-muted-foreground px-1">
        <span class="font-semibold text-foreground">{currentPage}</span>
        <span>/</span>
        <span>{totalPages}</span>
      </div>

      <Button
        variant="ghost"
        size="sm"
        class="h-7 w-7 p-0"
        disabled={currentPage >= totalPages}
        onclick={nextPage}
        title="Next Page"
      >
        <ChevronRight class="h-4 w-4" />
      </Button>
    </div>

    <!-- Zoom & Rotate Actions -->
    <div class="flex items-center gap-1">
      <Button variant="ghost" size="sm" class="h-7 w-7 p-0" onclick={zoomOut} title="Zoom Out">
        <ZoomOut class="h-3.5 w-3.5" />
      </Button>

      <span class="font-mono text-[11px] text-muted-foreground w-12 text-center">{zoomLevel}%</span>

      <Button variant="ghost" size="sm" class="h-7 w-7 p-0" onclick={zoomIn} title="Zoom In">
        <ZoomIn class="h-3.5 w-3.5" />
      </Button>

      <Button variant="ghost" size="sm" class="h-7 w-7 p-0" onclick={rotate} title="Rotate 90°">
        <RotateCw class="h-3.5 w-3.5" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        class="h-7 w-7 p-0"
        onclick={() => { isFullscreen = !isFullscreen; }}
        title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
      >
        <Maximize2 class="h-3.5 w-3.5" />
      </Button>
    </div>

    <!-- Export & Print -->
    <div class="flex items-center gap-1.5">
      <Button variant="outline" size="sm" class="h-7 text-xs gap-1" onclick={handlePrint}>
        <Printer class="h-3.5 w-3.5" />
        Print
      </Button>

      <Button size="sm" class="h-7 text-xs gap-1" onclick={handleDownload}>
        <Download class="h-3.5 w-3.5" />
        Download
      </Button>
    </div>
  </div>

  <!-- Document Viewport -->
  <div class="flex-1 overflow-auto bg-muted/40 p-6 flex items-center justify-center min-h-[400px]">
    <div
      class="relative bg-card rounded-lg shadow-md border border-border/80 transition-transform duration-200 overflow-hidden"
      style={`transform: scale(${zoomLevel / 100}) rotate(${rotation}deg); transform-origin: center center; width: 595px; min-height: 842px;`}
    >
      {#if fileUrl}
        <iframe
          src={fileUrl}
          title={fileName}
          class="w-full h-[842px] border-0"
        ></iframe>
      {:else}
        <!-- Simulated Document Paper -->
        <div class="p-12 space-y-6 text-foreground">
          <div class="border-b border-border/60 pb-4 flex justify-between items-start">
            <div>
              <h2 class="text-base font-bold tracking-tight">{fileName.replace(/\.[^/.]+$/, '')}</h2>
              <p class="text-[11px] text-muted-foreground">Document Sheet Reference • Page {currentPage}</p>
            </div>
            <Badge variant="outline" class="font-mono text-[10px]">P.{currentPage}</Badge>
          </div>

          <div class="space-y-3 text-muted-foreground leading-relaxed text-xs">
            <p>This is a rendered document preview surface. In production, provide a valid PDF / image URL via the <code>fileUrl</code> prop to stream direct binary pages.</p>
            <p>The document supports electronic stamps, digital approval watermarks, interactive zooming, rotation and multi-page flipping.</p>
          </div>

          <div class="my-8 p-4 rounded-lg bg-muted/30 border border-border/60 space-y-2">
            <div class="font-semibold text-foreground">Terms & Conditions of Execution</div>
            <div class="text-[11px] text-muted-foreground">All parties acknowledge the contractual stipulations herein outlined and agreed upon via authenticated electronic signatures.</div>
          </div>
        </div>
      {/if}

      <!-- Electronic Stamp Overlays -->
      {#each pageStamps as stamp (stamp.id)}
        <div
          class={cn(
            'absolute z-20 px-3 py-1.5 rounded-md border-2 font-bold text-xs uppercase tracking-wider shadow-sm rotate-[-12deg] pointer-events-none select-none',
            getStampVariant(stamp.status)
          )}
          style={`left: ${stamp.x}%; top: ${stamp.y}%;`}
        >
          {stamp.text}
        </div>
      {/each}
    </div>
  </div>
</div>
