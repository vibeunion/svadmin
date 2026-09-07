<script lang="ts">
  import type { Snippet } from 'svelte';
  import SvadminLogo from './SvadminLogo.svelte';

  interface Props {
    brand: string;
    title: string;
    description?: string;
    children: Snippet;
    footer?: Snippet;
  }

  let { brand, title, description, children, footer }: Props = $props();
</script>

<div class="svadmin-u-f3c543ad5fe9 svadmin-u-793346c7362c svadmin-u-967d113a1451 svadmin-u-5d17652eacdf" data-svadmin-auth-page>
  <aside class="svadmin-u-99d72c7fc3e2 svadmin-u-5ceb636bd9f3 svadmin-u-18049387f0af svadmin-u-cd0ad9a56558 svadmin-u-a4d0f420b78d svadmin-u-3eb153dc198f svadmin-u-a94f89d92058 svadmin-u-62c392c49841 svadmin-u-a06ab179a5d5">
    <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-1004c0c3954c"><SvadminLogo size={40} /><span class="svadmin-u-42536e69e639 svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{brand}</span></div>
    <div class="svadmin-u-2472e9b81a97 svadmin-u-6ed543e2fbbb"><h2 class="svadmin-u-3febee094e85 svadmin-u-e83a7042bc91 svadmin-u-e9fadafbd4a2 svadmin-u-d4108abe6359">{title}</h2>{#if description}<p class="svadmin-u-fc7473ca09eb svadmin-u-18550d5945ae svadmin-u-bfa603190748">{description}</p>{/if}</div>
    <p class="svadmin-u-359090c2d529 svadmin-u-bfa603190748">{brand}</p>
  </aside>
  <main class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-c07e54fd1439 svadmin-u-e91f4cd3974c svadmin-u-de2d5f919ba9">
    <div class="svadmin-u-6da6a3c3f741 svadmin-u-9794ab45094d svadmin-u-b43b4c086d9a">
      <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-1004c0c3954c svadmin-u-a327049cac5b"><SvadminLogo size={36} /><span class="svadmin-u-4ee734926ff6 svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{brand}</span></div>
      <section class="svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-cd0ad9a56558 svadmin-u-c07e54fd1439 svadmin-u-438b2237b8d6 svadmin-u-e299d4635ea7">
        <header class="svadmin-u-b6777c6db914 svadmin-u-6f7e013d6499"><h1 class="svadmin-u-d5c9b0001e7e svadmin-u-e83a7042bc91 svadmin-u-e9fadafbd4a2 svadmin-u-d4108abe6359">{title}</h1>{#if description}<p class="svadmin-u-fc7473ca09eb svadmin-u-18550d5945ae svadmin-u-bfa603190748">{description}</p>{/if}</header>
        {@render children()}
      </section>
      {#if footer}<div class="svadmin-u-ca6bf63030aa">{@render footer()}</div>{/if}
    </div>
  </main>
</div>
