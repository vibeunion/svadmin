<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import * as Card from '../ui/card/index.js';
  import { Button } from '../ui/button/index.js';
  import { Badge } from '../ui/badge/index.js';
  import { Input } from '../ui/input/index.js';
  import { Search, ExternalLink, Check, Plus } from '@lucide/svelte';

  const i18n = useTranslation();

  interface NFTUser {
    id: string;
    name: string;
    username: string;
    avatar?: string;
    bio: string;
    collectionCount: number;
    floorPrice: string;
    volume: string;
    verified: boolean;
    tags: string[];
  }

  let searchQuery = $state('');

  const users: NFTUser[] = [
    { id: '1', name: 'CryptoArt Studio', username: '@cryptoart', bio: 'Digital art collection featuring generative abstracts', collectionCount: 42, floorPrice: '0.5 ETH', volume: '128.3 ETH', verified: true, tags: ['Art', 'Generative'] },
    { id: '2', name: 'PixelPunk Collective', username: '@pixelpunk', bio: 'On-chain pixel art characters with unique traits', collectionCount: 18, floorPrice: '1.2 ETH', volume: '342.7 ETH', verified: true, tags: ['PFP', 'Pixel'] },
    { id: '3', name: 'MetaVerse Builders', username: '@metabuild', bio: '3D architectural models for virtual worlds', collectionCount: 7, floorPrice: '0.8 ETH', volume: '56.1 ETH', verified: false, tags: ['3D', 'Virtual'] },
    { id: '4', name: 'SoundWave NFT', username: '@soundwave', bio: 'Music-backed NFTs with on-chain audio', collectionCount: 23, floorPrice: '0.3 ETH', volume: '89.4 ETH', verified: true, tags: ['Music', 'Audio'] },
    { id: '5', name: 'GameAssets DAO', username: '@gameassets', bio: 'In-game items and collectibles for Web3 gaming', collectionCount: 156, floorPrice: '0.05 ETH', volume: '412.8 ETH', verified: true, tags: ['Gaming', 'Items'] },
    { id: '6', name: 'PhotoVerse', username: '@photoverse', bio: 'Curated photography NFTs from world artists', collectionCount: 31, floorPrice: '0.15 ETH', volume: '67.2 ETH', verified: false, tags: ['Photo', 'Curated'] },
    { id: '7', name: 'CryptoKicks', username: '@cryptokicks', bio: 'Limited-edition digital sneakers and wearables', collectionCount: 64, floorPrice: '0.4 ETH', volume: '156.9 ETH', verified: true, tags: ['Fashion', 'Wearables'] },
    { id: '8', name: 'ChainChronicles', username: '@chainchron', bio: 'Story-driven collectible cards with on-chain lore', collectionCount: 88, floorPrice: '0.25 ETH', volume: '203.4 ETH', verified: false, tags: ['Cards', 'Story'] },
    { id: '9', name: 'AIArtifacts', username: '@aiartifacts', bio: 'AI-generated sculptures minted as unique tokens', collectionCount: 12, floorPrice: '2.1 ETH', volume: '512.6 ETH', verified: true, tags: ['AI', '3D'] },
  ];

  const filtered = $derived(
    searchQuery
      ? users.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.username.toLowerCase().includes(searchQuery.toLowerCase()) || u.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
      : users
  );

  const initials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  let connectedIds = $state<string[]>([]);

  function toggleConnect(id: string) {
    connectedIds = connectedIds.includes(id)
      ? connectedIds.filter(connectedId => connectedId !== id)
      : [...connectedIds, id];
  }

  function isConnected(id: string): boolean {
    return connectedIds.includes(id);
  }
</script>

<div class="space-y-6" data-svadmin-content-page="network">
  <div>
    <h2 class="text-xl font-semibold text-foreground">{i18n.t('network.userCards')}</h2>
    <p class="mt-1 text-sm text-muted-foreground">{i18n.t('network.userCardsDescription')}</p>
  </div>

  <div class="relative">
    <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input placeholder={i18n.t('common.search')} bind:value={searchQuery} class="pl-9" />
  </div>

  <p class="text-sm font-medium text-muted-foreground">{i18n.t('network.showingUsers', { count: filtered.length })}</p>

  <div class="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
    {#each filtered as user (user.id)}
      <Card.Card class="overflow-hidden border-border/60 hover:border-primary/30 transition-colors">
        <div class="h-20 bg-gradient-to-r from-violet-500/20 via-purple-500/15 to-fuchsia-500/20 relative">
          <div class="absolute inset-0 opacity-[0.08]" style="background-image: radial-gradient(circle, currentColor 1px, transparent 1px); background-size: 16px 16px;"></div>
        </div>
        <Card.CardContent class="relative px-4 pb-4">
          <div class="-mt-8 mb-2 flex items-end gap-3">
            <div class="ring-3 ring-card rounded-xl overflow-hidden shrink-0">
              <div class="flex h-14 w-14 items-center justify-center bg-primary/10 text-primary font-bold">
                {initials(user.name)}
              </div>
            </div>
            <div class="flex-1 min-w-0 pb-0.5">
              <div class="flex items-center gap-1.5">
                <h4 class="text-sm font-semibold text-foreground truncate">{user.name}</h4>
                {#if user.verified}
                  <Check class="h-3.5 w-3.5 text-blue-500" />
                {/if}
              </div>
              <p class="text-xs text-muted-foreground">{user.username}</p>
            </div>
          </div>

          <p class="text-xs text-muted-foreground line-clamp-2 mb-3">{user.bio}</p>

          <div class="flex flex-wrap gap-1 mb-3">
            {#each user.tags as tag (tag)}
              <Badge variant="outline" class="text-[10px]">{tag}</Badge>
            {/each}
          </div>

          <!-- NFT stats -->
          <div class="grid grid-cols-3 gap-2 border-t pt-3">
            <div class="text-center">
              <div class="text-sm font-semibold text-foreground">{user.collectionCount}</div>
              <div class="text-[10px] text-muted-foreground">{i18n.t('network.nftCollection')}</div>
            </div>
            <div class="text-center">
              <div class="text-sm font-semibold text-foreground">{user.floorPrice}</div>
              <div class="text-[10px] text-muted-foreground">{i18n.t('network.floorPrice')}</div>
            </div>
            <div class="text-center">
              <div class="text-xs font-semibold text-foreground">{user.volume}</div>
              <div class="text-[10px] text-muted-foreground">{i18n.t('network.volume')}</div>
            </div>
          </div>

          <div class="mt-3 flex gap-2">
            <Button
              size="sm"
              variant={isConnected(user.id) ? 'outline' : 'default'}
              class="flex-1"
              onclick={() => toggleConnect(user.id)}
            >
              {#if isConnected(user.id)}
                <Check class="h-3.5 w-3.5 mr-1" />{i18n.t('network.connected')}
              {:else}
                <Plus class="h-3.5 w-3.5 mr-1" />{i18n.t('network.connect')}
              {/if}
            </Button>
            <Button size="sm" variant="ghost">
              <ExternalLink class="h-3.5 w-3.5" />
            </Button>
          </div>
        </Card.CardContent>
      </Card.Card>
    {/each}
  </div>
</div>
