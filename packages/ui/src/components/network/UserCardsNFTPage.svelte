<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import ContentPageShell from '../content/ContentPageShell.svelte';
  import ContentPageHeader from '../content/ContentPageHeader.svelte';
  import FilterToolbar from '../content/FilterToolbar.svelte';
  import DataState from '../content/DataState.svelte';
  import NetworkUserCard from '../content/NetworkUserCard.svelte';
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
  <FilterToolbar bind:query placeholder={i18n.t('common.search')} clearLabel={i18n.locale === 'zh-CN' ? '清除搜索' : 'Clear search'} />
  {#if filtered.length === 0}
    <DataState state="empty" title={i18n.t('network.userCards')} />
  {:else}
    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {#each filtered as user (user.id)}
        <NetworkUserCard
          {user}
          tags={user.tags}
          verified={user.verified}
          verifiedLabel={i18n.locale === 'zh-CN' ? '已验证' : 'Verified'}
          metrics={[
            { label: i18n.t('network.nftCollection'), value: user.collectionCount },
            { label: i18n.t('network.floorPrice'), value: user.floorPrice },
            { label: i18n.t('network.volume'), value: user.volume },
          ]}
          connected={connected.includes(user.id)}
          connectLabel={i18n.t('network.connect')}
          connectedLabel={i18n.t('network.connected')}
          onconnect={() => toggle(user.id)}
        />
      {/each}
    </div>
  {/if}
</ContentPageShell>
