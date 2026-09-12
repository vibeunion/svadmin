<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Search } from '@lucide/svelte';
  import { cn } from '../utils.js';

  interface Props {
    items: Record<string, unknown>[];
    selectedId?: string | number;
    idKey?: string;
    titleKey?: string;
    subtitleKey?: string;
    listWidth?: string;
    emptyText?: string;
    itemSnippet?: Snippet<[Record<string, unknown>, boolean]>;
    detailSnippet?: Snippet<[Record<string, unknown>]>;
    class?: string;
  }

  let {
    items = [],
    selectedId = $bindable(items[0]?.['id'] as (string | number | undefined)),
    idKey = 'id',
    titleKey = 'title',
    subtitleKey = 'subtitle',
    listWidth = 'svadmin-u-92e13d146fd7 svadmin-u-b7dfca40c07f',
    emptyText = 'No items found',
    itemSnippet,
    detailSnippet,
    class: className = '',
  }: Props = $props();

  let searchQuery = $state('');

  const filteredItems = $derived(
    items.filter((item) => {
      if (!searchQuery.trim()) return true;
      const title = String(item[titleKey] ?? '').toLowerCase();
      const subtitle = String(item[subtitleKey] ?? '').toLowerCase();
      const q = searchQuery.toLowerCase().trim();
      return title.includes(q) || subtitle.includes(q);
    })
  );

  const activeItem = $derived(
    items.find((item) => String(item[idKey]) === String(selectedId)) ?? filteredItems[0]
  );
</script>

<div class={cn('svadmin-u-60fbb7713999 svadmin-u-668b21aa5409 svadmin-u-afc45e21ada6 svadmin-u-a217b4eaa918 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-cd0ad9a56558 svadmin-u-cef5b893cf23 svadmin-u-2cd02d11d1af svadmin-u-359090c2d529', className)}>
  <!-- Master List Panel -->
  <div class={cn('svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-5ceb636bd9f3 svadmin-u-05faf5c801ff svadmin-u-46daeb0b661f svadmin-u-012fbd121f37', listWidth)}>
    <!-- Search Bar -->
    <div class="svadmin-u-eb6e8b881acd svadmin-u-65fdbade2025 svadmin-u-05faf5c801ff">
      <div class="svadmin-u-d89972fe17d6">
        <Search class="svadmin-u-da4dbfbc4fdc svadmin-u-ecfeb742a3f3 svadmin-u-7a470f4c9b28 svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-bfa603190748" />
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Search items..."
          class="svadmin-u-ed8a5df7b2fb svadmin-u-6da6a3c3f741 svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-e5795dad4d22 svadmin-u-e6f9e383a762 svadmin-u-e4af885410fe svadmin-u-aa2c13a5e1b4 svadmin-u-359090c2d529 svadmin-u-f10f771f87e9 svadmin-u-3e94a98e1466 svadmin-u-9c1295a6914a"
        />
      </div>
    </div>

    <!-- Scrollable Items List -->
    <div class="svadmin-u-36e579c0b41c svadmin-u-92bf82f493b1 svadmin-u-fa6acbf81d74 svadmin-u-08b5607c7258">
      {#each filteredItems as item (item[idKey])}
        {@const isSelected = String(item[idKey]) === String(activeItem?.[idKey])}
        <button
          type="button"
          class={cn(
            'svadmin-u-6da6a3c3f741 svadmin-u-2eba0d65d059 svadmin-u-eb6e8b881acd svadmin-u-ceb69a6b0e5f svadmin-u-34516836730d svadmin-u-119b2aa0b8f6 svadmin-u-7f19cdf4c5bb',
            isSelected
              ? 'svadmin-u-375dc44df6e9 svadmin-u-445ec4d497ce svadmin-u-6cbc84dd9e1a svadmin-u-d4108abe6359 svadmin-u-2689f3958069'
              : 'svadmin-u-f6e31b39b8e4 svadmin-u-bfa603190748'
          )}
          onclick={() => { selectedId = item[idKey] as (string | number); }}
        >
          {#if itemSnippet}
            {@render itemSnippet(item, isSelected)}
          {:else}
            <div class={cn('svadmin-u-e83a7042bc91 svadmin-u-f283ea9bea0e', isSelected ? 'svadmin-u-20aaf08a7ed1' : 'svadmin-u-d4108abe6359')}>
              {item[titleKey] ?? item['name'] ?? `Item #${item[idKey]}`}            </div>
            {#if item[subtitleKey]}
              <div class="svadmin-u-d058ca6de60f svadmin-u-bfa603190748 svadmin-u-f283ea9bea0e svadmin-u-15e1b1f444fe">
                {item[subtitleKey]}
              </div>
            {/if}
          {/if}
        </button>
      {/each}

      {#if filteredItems.length === 0}
        <div class="svadmin-u-0478c89a150f svadmin-u-ca6bf63030aa svadmin-u-bfa603190748">
          {emptyText}
        </div>
      {/if}
    </div>
  </div>

  <!-- Detail Content Panel -->
  <div class="svadmin-u-36e579c0b41c svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-92bf82f493b1 svadmin-u-0478c89a150f svadmin-u-cd0ad9a56558">
    {#if activeItem}
      {#if detailSnippet}
        {@render detailSnippet(activeItem)}
      {:else}
        <div class="svadmin-u-3e7ce58d64fa">
          <div class="svadmin-u-7fcf9124b5df svadmin-u-65fdbade2025 svadmin-u-05faf5c801ff">
            <h3 class="svadmin-u-4ee734926ff6 svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">
              {activeItem[titleKey] ?? activeItem['name'] ?? `Item #${activeItem[idKey]}`}            </h3>
            {#if activeItem[subtitleKey]}
              <p class="svadmin-u-359090c2d529 svadmin-u-bfa603190748 svadmin-u-15e1b1f444fe">{activeItem[subtitleKey]}</p>
            {/if}
          </div>

          <div class="svadmin-u-f3c543ad5fe9 svadmin-u-8e75e3db482b svadmin-u-1004c0c3954c svadmin-u-359090c2d529">
            {#each Object.entries(activeItem) as [k, v] (k)}
              <div class="svadmin-u-9fe52d5d506c svadmin-u-5f22e64f2282 svadmin-u-967d113a1451 svadmin-u-ca6bcd4b6f3f svadmin-u-6ee2d41e2d2d">
                <span class="svadmin-u-bfa603190748 svadmin-u-2689f3958069 svadmin-u-0214b4b355d1 svadmin-u-d058ca6de60f svadmin-u-166af870e200">{k}</span>
                <span class="svadmin-u-0e65706bcccd svadmin-u-d4108abe6359 svadmin-u-170cee3ff4e4">{typeof v === 'object' ? JSON.stringify(v) : String(v ?? '—')}</span>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    {:else}
      <div class="svadmin-u-36e579c0b41c svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-bfa603190748">
        Select an item from the list to view details
      </div>
    {/if}
  </div>
</div>
