<script lang="ts">
  import type { Snippet } from 'svelte';
  import { captureAdminContext } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import { ArrowLeft } from '@lucide/svelte';
  import SvadminLogo from './SvadminLogo.svelte';
  import { Button } from './ui/button/index.js';

  let { title = 'svadmin', children }: { title?: string; children: Snippet } = $props();

  const adminContext = captureAdminContext();
  const i18n = useTranslation();
</script>

<div class="svadmin-u-793346c7362c svadmin-u-e6f9e383a762 svadmin-u-d4108abe6359">
  <header class="svadmin-u-60fbb7713999 svadmin-u-07017cde3e97 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-65fdbade2025 svadmin-u-05faf5c801ff svadmin-u-f0faeb26d656 svadmin-u-7a9aabfcd059">
    <button
      type="button"
      class="svadmin-u-52083e7da442 svadmin-u-3960ffc248d9 svadmin-u-7e9a2a250cc3 svadmin-u-fc7473ca09eb svadmin-u-e83a7042bc91"
      onclick={() => adminContext.navigate('/')}
    >
      <SvadminLogo size={30} />
      <span>{title}</span>
    </button>
    <Button variant="ghost" size="sm" onclick={() => adminContext.back()}>
      <ArrowLeft class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
      <span class="svadmin-u-99d72c7fc3e2 svadmin-u-ee3c1259a368">{i18n.t('common.back')}</span>
    </Button>
  </header>

  <main class="svadmin-u-055a17b0d27b svadmin-u-967d113a1451 svadmin-u-0e17f2bd9074 svadmin-u-c9b99cd93450 svadmin-u-7a9aabfcd059 svadmin-u-9249876ba240">
    {@render children()}
  </main>
</div>
