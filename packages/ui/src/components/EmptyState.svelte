<script lang="ts">
  import { scale } from 'svelte/transition';
  import { PackageOpen } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core';

  const i18n = useTranslation();

  let {
    title = i18n.t('empty.title'),
    description = i18n.t('empty.description'),
    children,
  } = $props<{
    title?: string;
    description?: string;
    children?: import('svelte').Snippet;
  }>();
</script>

<div
  class="svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-5f22e64f2282 svadmin-u-24104d87db9a svadmin-u-7e3e9a76c966 svadmin-u-1100bef66e60 svadmin-u-ca6bf63030aa svadmin-u-cef5b893cf23"
  in:scale={{ start: 0.95, duration: 200, opacity: 0 }}
  role="status"
  aria-live="polite"
>
  <div class="svadmin-u-0a769880db93 svadmin-u-ed831a4dff32 svadmin-u-ac204c108886 svadmin-u-2ef11f1cb219 svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-da019856f2cc">
    <PackageOpen class="svadmin-u-426b8b75185b svadmin-u-d854e5698b57 svadmin-u-bfa603190748" />
  </div>
  <h3 class="svadmin-u-42536e69e639 svadmin-u-e83a7042bc91 svadmin-u-1d7f28b046ad">{title}</h3>
  <p class="svadmin-u-fc7473ca09eb svadmin-u-bfa603190748 svadmin-u-50d0d216a2f8 svadmin-u-2472e9b81a97">{description}</p>
  {#if children}
    <div class="svadmin-u-31f2553311b6">
      {@render children()}
    </div>
  {/if}
</div>
