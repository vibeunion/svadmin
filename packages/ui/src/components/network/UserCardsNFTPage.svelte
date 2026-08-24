<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import { Check, Plus } from '@lucide/svelte';
  import { Button } from '../ui/button/index.js';
  import { Badge } from '../ui/badge/index.js';
  import * as Card from '../ui/card/index.js';
  import ContentPageShell from '../content/ContentPageShell.svelte';
  import ContentPageHeader from '../content/ContentPageHeader.svelte';
  import FilterToolbar from '../content/FilterToolbar.svelte';
  import DataState from '../content/DataState.svelte';
  import type { NetworkUser } from '../content/NetworkUserCard.svelte';

  const i18n = useTranslation();
  type NftUser = NetworkUser & { tags: string[]; collectionCount: number; floorPrice: string; volume: string; verified: boolean };
  let query = $state('');
  let connected = $state<string[]>([]);
  const users: NftUser[] = [
    { id: '1', name: 'CryptoArt Studio', handle: '@cryptoart', role: 'Generative art', summary: 'Digital art collection featuring generative abstracts', tags: ['Art', 'Generative'], collectionCount: 42, floorPrice: '0.5 ETH', volume: '128.3 ETH', verified: true },
    { id: '2', name: 'PixelPunk Collective', handle: '@pixelpunk', role: 'On-chain studio', summary: 'Pixel art characters with unique traits', tags: ['PFP', 'Pixel'], collectionCount: 18, floorPrice: '1.2 ETH', volume: '342.7 ETH', verified: true },
    { id: '3', name: 'MetaVerse Builders', handle: '@metabuild', role: '3D architecture', summary: 'Architectural models for virtual worlds', tags: ['3D', 'Virtual'], collectionCount: 7, floorPrice: '0.8 ETH', volume: '56.1 ETH', verified: false },
    { id: '4', name: 'SoundWave NFT', handle: '@soundwave', role: 'Music studio', summary: 'Music-backed NFTs with on-chain audio', tags: ['Music', 'Audio'], collectionCount: 23, floorPrice: '0.3 ETH', volume: '89.4 ETH', verified: true },
    { id: '5', name: 'GameAssets DAO', handle: '@gameassets', role: 'Gaming collective', summary: 'In-game items and collectibles for Web3 gaming', tags: ['Gaming', 'Items'], collectionCount: 156, floorPrice: '0.05 ETH', volume: '412.8 ETH', verified: true },
    { id: '6', name: 'PhotoVerse', handle: '@photoverse', role: 'Photography', summary: 'Curated photography from world artists', tags: ['Photo', 'Curated'], collectionCount: 31, floorPrice: '0.15 ETH', volume: '67.2 ETH', verified: false },
  ];
  const filtered = $derived(query ? users.filter((user) => `${user.name} ${user.handle} ${user.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase())) : users);
  function toggle(id: string) { connected = connected.includes(id) ? connected.filter((item) => item !== id) : [...connected, id]; }
</script>

<ContentPageShell pageId="network-user-cards" width="wide">
  <ContentPageHeader title={i18n.t('network.userCards')} description={i18n.t('network.userCardsDescription')} />
  <FilterToolbar bind:query placeholder={i18n.t('common.search')} />
  {#if filtered.length === 0}<DataState state="empty" title={i18n.t('network.userCards')} />{:else}<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{#each filtered as user (user.id)}<Card.Card><Card.CardContent class="space-y-4 p-4"><div class="flex items-start gap-3"><span class="flex size-10 items-center justify-center rounded-md bg-muted text-sm font-semibold text-muted-foreground">{user.name.slice(0, 2).toUpperCase()}</span><div class="min-w-0 flex-1"><div class="flex items-center gap-1.5"><h2 class="truncate text-sm font-semibold text-foreground">{user.name}</h2>{#if user.verified}<Check class="size-3.5 text-primary" />{/if}</div><p class="text-xs text-muted-foreground">{user.handle}</p></div></div><p class="text-sm text-muted-foreground">{user.summary}</p><div class="flex flex-wrap gap-1.5">{#each user.tags as tag (tag)}<Badge variant="outline">{tag}</Badge>{/each}</div><div class="grid grid-cols-3 gap-2 border-t border-border pt-3 text-center"><div><p class="text-sm font-semibold text-foreground">{user.collectionCount}</p><p class="text-xs text-muted-foreground">{i18n.t('network.nftCollection')}</p></div><div><p class="text-sm font-semibold text-foreground">{user.floorPrice}</p><p class="text-xs text-muted-foreground">{i18n.t('network.floorPrice')}</p></div><div><p class="text-sm font-semibold text-foreground">{user.volume}</p><p class="text-xs text-muted-foreground">{i18n.t('network.volume')}</p></div></div><Button size="sm" variant={connected.includes(user.id) ? 'outline' : 'default'} class="w-full" onclick={() => toggle(user.id)}>{#if connected.includes(user.id)}<Check class="size-3.5" />{i18n.t('network.connected')}{:else}<Plus class="size-3.5" />{i18n.t('network.connect')}{/if}</Button></Card.CardContent></Card.Card>{/each}</div>{/if}
</ContentPageShell>
