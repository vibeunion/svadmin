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
  <Dialog.Content class={cn('svadmin-u-a02aa8a60111 svadmin-u-c3c9f24b386b svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-8a539c7fe216 svadmin-u-2cd02d11d1af svadmin-u-359090c2d529', className)}>
    <!-- Header -->
    <Dialog.Header class="svadmin-u-8e63407b5ceb svadmin-u-65fdbade2025 svadmin-u-05faf5c801ff">
      <Dialog.Title class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4">
        <ImageIcon class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-20aaf08a7ed1" />
        <span>{title}</span>
      </Dialog.Title>
    </Dialog.Header>

    <!-- Toolbar: Search & Categories -->
    <div class="svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-1004c0c3954c svadmin-u-eb6e8b881acd svadmin-u-967d113a1451 svadmin-u-65fdbade2025 svadmin-u-05faf5c801ff">
      <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-58284b4ea568 svadmin-u-1384f66f41d0">
        {#each categories as cat (cat)}
          <button
            type="button"
            class={cn(
              'svadmin-u-0b91436debbd svadmin-u-660d2effb880 svadmin-u-421ac2be5045 svadmin-u-359090c2d529 svadmin-u-2689f3958069 svadmin-u-ceb69a6b0e5f svadmin-u-34516836730d svadmin-u-119b2aa0b8f6',
              activeCategory === cat
                ? 'svadmin-u-75b1bec3ea0e svadmin-u-30ca335ae9c2'
                : 'svadmin-u-cd0ad9a56558 svadmin-u-bfa603190748 svadmin-u-ea7b2e9e070e svadmin-u-68646cdcc246'
            )}
            onclick={() => { activeCategory = cat; }}
          >
            {cat}
          </button>
        {/each}
      </div>

      <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4">
        <div class="svadmin-u-d89972fe17d6 svadmin-u-74b2435a1d40">
          <Search class="svadmin-u-da4dbfbc4fdc svadmin-u-ecfeb742a3f3 svadmin-u-9a2db8f949b6 svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-bfa603190748" />
          <input
            type="text"
            bind:value={searchQuery}
            placeholder="Search media..."
            class="svadmin-u-d1c57777d8b6 svadmin-u-6da6a3c3f741 svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-e5795dad4d22 svadmin-u-e6f9e383a762 svadmin-u-d2d2d97dd0c8 svadmin-u-aa2c13a5e1b4 svadmin-u-359090c2d529 svadmin-u-f10f771f87e9 svadmin-u-3e94a98e1466 svadmin-u-9c1295a6914a"
          />
        </div>

        <label class="svadmin-u-52083e7da442">
          <input type="file" multiple class="svadmin-u-99d72c7fc3e2" onchange={handleFileInput} />
          <span class="svadmin-u-52083e7da442 svadmin-u-3960ffc248d9 svadmin-u-44ee8ba0a421 svadmin-u-d1c57777d8b6 svadmin-u-0b91436debbd svadmin-u-421ac2be5045 svadmin-u-ba939ea82d8b svadmin-u-5064267f78e3 svadmin-u-359090c2d529 svadmin-u-2689f3958069 svadmin-u-35b680bc2a46 svadmin-u-34516836730d">
            <Upload class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
            Upload
          </span>
        </label>
      </div>
    </div>

    <!-- Media Grid -->
    <div class="svadmin-u-36e579c0b41c svadmin-u-92bf82f493b1 svadmin-u-8e63407b5ceb svadmin-u-c7f14f00a474">
      <div class="svadmin-u-f3c543ad5fe9 svadmin-u-8e75e3db482b svadmin-u-898c0bcba480 svadmin-u-1004c0c3954c">
        {#each filteredMedia as item (item.id)}
          {@const isChosen = localSelected.includes(item.url)}
          <button
            type="button"
            class={cn(
              'group svadmin-u-d89972fe17d6 svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-2eba0d65d059 svadmin-u-2cd02d11d1af svadmin-u-0fe7d7d814d0 svadmin-u-34516836730d svadmin-u-8a539c7fe216 svadmin-u-cd0ad9a56558',
              isChosen
                ? 'svadmin-u-6cbc84dd9e1a svadmin-u-16b1efa5875e svadmin-u-d07ac033ff8d svadmin-u-cef5b893cf23'
                : 'svadmin-u-05faf5c801ff svadmin-u-512e82e6a68f svadmin-u-f0372faffc6a'
            )}
            onclick={() => toggleSelect(item.url)}
          >
            <!-- Thumbnail preview -->
            <div class="svadmin-u-d89972fe17d6 svadmin-u-e836f6e0a16f svadmin-u-6da6a3c3f741 svadmin-u-b00f43c30c2b svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-2cd02d11d1af">
              {#if item.type?.startsWith('image') || item.url.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i)}
                <img src={item.url} alt={item.name} class="svadmin-u-668b21aa5409 svadmin-u-6da6a3c3f741 svadmin-u-7d85d0c21a32 svadmin-u-1a9195e1d901 svadmin-u-eadef238231e svadmin-u-625a4c3fbeb2" />
              {:else}
                <Folder class="svadmin-u-ed8a5df7b2fb svadmin-u-2bbcfc3b5179 svadmin-u-7be4d67a6256" />
              {/if}

              <!-- Select Checkmark Badge -->
              {#if isChosen}
                <div class="svadmin-u-da4dbfbc4fdc svadmin-u-b1044d8600a8 svadmin-u-62925abe316b svadmin-u-60fbb7713999 svadmin-u-cd0d9c512cdc svadmin-u-72470489ff4e svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-ac204c108886 svadmin-u-75b1bec3ea0e svadmin-u-30ca335ae9c2 svadmin-u-cef5b893cf23">
                  <Check class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" />
                </div>
              {/if}
            </div>

            <!-- Metadata Info -->
            <div class="svadmin-u-7660b450905a svadmin-u-e2eedc5718f0">
              <div class="svadmin-u-2689f3958069 svadmin-u-d4108abe6359 svadmin-u-f283ea9bea0e">{item.name}</div>
              <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-1dc571a3609f svadmin-u-bfa603190748">
                <span>{item.size ?? '—'}</span>
                {#if item.category}
                  <Badge variant="secondary" class="svadmin-u-e09880869d1f svadmin-u-d8e0e382c67b svadmin-u-68ecb30dbec6">{item.category}</Badge>
                {/if}
              </div>
            </div>
          </button>
        {/each}
      </div>

      {#if filteredMedia.length === 0}
        <div class="svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-02cafd385619 svadmin-u-bfa603190748 svadmin-u-ca6bf63030aa svadmin-u-6f7e013d6499">
          <ImageIcon class="svadmin-u-ed8a5df7b2fb svadmin-u-2bbcfc3b5179 svadmin-u-2a2db4667b27" />
          <p>No media files found</p>
        </div>
      {/if}
    </div>

    <!-- Footer -->
    <Dialog.Footer class="svadmin-u-eb6e8b881acd svadmin-u-b950dda299d3 svadmin-u-05faf5c801ff svadmin-u-967d113a1451 svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc">
      <div class="svadmin-u-bfa603190748">
        Selected <strong class="svadmin-u-d4108abe6359">{localSelected.length}</strong> file(s)
      </div>
      <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4">
        <Button variant="outline" size="sm" onclick={() => { open = false; }}>Cancel</Button>
        <Button size="sm" disabled={localSelected.length === 0} onclick={handleConfirm}>
          Insert Selected
        </Button>
      </div>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
