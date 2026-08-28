<script lang="ts">
  import * as Dialog from './ui/dialog/index.js';
  import { Button } from './ui/button/index.js';
  import { Badge } from './ui/badge/index.js';
  import { Upload, Image as ImageIcon, Check, Search, Folder } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export interface MediaItem {
    id: string;
    name: string;
    url: string;
    size?: string;
    type?: string;
    category?: string;
  }

  interface Props {
    open?: boolean;
    title?: string;
    multiple?: boolean;
    selectedUrls?: string[];
    mediaItems?: MediaItem[];
    categories?: string[];
    onselect?: (urls: string[]) => void;
    onupload?: (files: File[]) => void | Promise<void>;
    class?: string;
  }

  let {
    open = $bindable(false),
    title = 'Media Asset Library',
    multiple = false,
    selectedUrls = $bindable([]),
    mediaItems = [],
    categories = ['All', 'Images', 'Documents', 'Banners'],
    onselect,
    onupload,
    class: className = '',
  }: Props = $props();

  let activeCategory = $state('All');
  let searchQuery = $state('');
  let localSelected = $state<string[]>([...selectedUrls]);

  const filteredMedia = $derived(
    mediaItems.filter((item) => {
      const matchCat = activeCategory === 'All' || item.category === activeCategory;
      const matchSearch = !searchQuery.trim() || item.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
      return matchCat && matchSearch;
    })
  );

  function toggleSelect(url: string) {
    if (multiple) {
      if (localSelected.includes(url)) {
        localSelected = localSelected.filter((u) => u !== url);
      } else {
        localSelected = [...localSelected, url];
      }
    } else {
      localSelected = [url];
    }
  }

  function handleConfirm() {
    selectedUrls = [...localSelected];
    onselect?.(selectedUrls);
    open = false;
  }

  function handleFileInput(e: Event) {
    const target = e.currentTarget as HTMLInputElement;
    if (target.files?.length) {
      onupload?.(Array.from(target.files));
    }
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class={cn('sm:max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden text-xs', className)}>
    <!-- Header -->
    <Dialog.Header class="p-4 border-b border-border/60">
      <Dialog.Title class="flex items-center gap-2">
        <ImageIcon class="h-4 w-4 text-primary" />
        <span>{title}</span>
      </Dialog.Title>
    </Dialog.Header>

    <!-- Toolbar: Search & Categories -->
    <div class="flex flex-wrap items-center justify-between gap-3 p-3 bg-muted/20 border-b border-border/60">
      <div class="flex items-center gap-1.5 overflow-x-auto">
        {#each categories as cat (cat)}
          <button
            type="button"
            class={cn(
              'px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer border-0',
              activeCategory === cat
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted/60'
            )}
            onclick={() => { activeCategory = cat; }}
          >
            {cat}
          </button>
        {/each}
      </div>

      <div class="flex items-center gap-2">
        <div class="relative w-48">
          <Search class="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            bind:value={searchQuery}
            placeholder="Search media..."
            class="h-7.5 w-full rounded-md border border-input bg-background pl-7.5 pr-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <label class="inline-flex">
          <input type="file" multiple class="hidden" onchange={handleFileInput} />
          <span class="inline-flex items-center gap-1 h-7.5 px-2.5 rounded-md bg-secondary text-secondary-foreground text-xs font-medium hover:bg-secondary/80 cursor-pointer">
            <Upload class="h-3.5 w-3.5" />
            Upload
          </span>
        </label>
      </div>
    </div>

    <!-- Media Grid -->
    <div class="flex-1 overflow-y-auto p-4 min-h-64">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {#each filteredMedia as item (item.id)}
          {@const isChosen = localSelected.includes(item.url)}
          <button
            type="button"
            class={cn(
              'group relative flex flex-col rounded-lg border text-left overflow-hidden transition-all cursor-pointer p-0 bg-card',
              isChosen
                ? 'border-primary ring-2 ring-primary/30 shadow-xs'
                : 'border-border/60 hover:border-border hover:shadow-xs'
            )}
            onclick={() => toggleSelect(item.url)}
          >
            <!-- Thumbnail preview -->
            <div class="relative h-28 w-full bg-muted/40 flex items-center justify-center overflow-hidden">
              {#if item.type?.startsWith('image') || item.url.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i)}
                <img src={item.url} alt={item.name} class="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200" />
              {:else}
                <Folder class="h-8 w-8 text-muted-foreground/60" />
              {/if}

              <!-- Select Checkmark Badge -->
              {#if isChosen}
                <div class="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs">
                  <Check class="h-3 w-3" />
                </div>
              {/if}
            </div>

            <!-- Metadata Info -->
            <div class="p-2 space-y-0.5">
              <div class="font-medium text-foreground truncate">{item.name}</div>
              <div class="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{item.size ?? '—'}</span>
                {#if item.category}
                  <Badge variant="secondary" class="text-[9px] px-1 py-0">{item.category}</Badge>
                {/if}
              </div>
            </div>
          </button>
        {/each}
      </div>

      {#if filteredMedia.length === 0}
        <div class="flex flex-col items-center justify-center py-16 text-muted-foreground text-center space-y-2">
          <ImageIcon class="h-8 w-8 opacity-40" />
          <p>No media files found</p>
        </div>
      {/if}
    </div>

    <!-- Footer -->
    <Dialog.Footer class="p-3 border-t border-border/60 bg-muted/20 flex items-center justify-between">
      <div class="text-muted-foreground">
        Selected <strong class="text-foreground">{localSelected.length}</strong> file(s)
      </div>
      <div class="flex items-center gap-2">
        <Button variant="outline" size="sm" onclick={() => { open = false; }}>Cancel</Button>
        <Button size="sm" disabled={localSelected.length === 0} onclick={handleConfirm}>
          Insert Selected
        </Button>
      </div>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
