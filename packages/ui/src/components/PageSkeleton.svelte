<script lang="ts">
  import { fade } from 'svelte/transition';
  import { Skeleton } from './ui/skeleton';

  let {
    type = 'list',
    rows = 5,
  } = $props<{
    type?: 'list' | 'show' | 'form';
    rows?: number;
  }>();
</script>

<div class="svadmin-u-6da6a3c3f741 svadmin-u-b3542e058833" out:fade={{ duration: 200 }}>
  <!-- Header Skeleton -->
  <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc">
    <div class="svadmin-u-6f7e013d6499">
      <Skeleton class="svadmin-u-ed8a5df7b2fb svadmin-u-efc981d0f818" />
      <Skeleton class="svadmin-u-11e59c6d5f6b svadmin-u-069503724c35" />
    </div>
    {#if type === 'list'}
      <Skeleton class="svadmin-u-426b8b75185b svadmin-u-c1ca66f139f6" />
    {/if}
  </div>

  <div class="svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-8e63407b5ceb svadmin-u-3e7ce58d64fa">
    {#if type === 'list'}
      <!-- Table Header -->
      <div class="svadmin-u-60fbb7713999 svadmin-u-0c3bc98565dd svadmin-u-65fdbade2025 svadmin-u-9fcd8a13827e">
        {#each Array(4) as _, _i (_i)}
          <Skeleton class="svadmin-u-f6fe902450dc svadmin-u-36e579c0b41c" />
        {/each}
      </div>
      <!-- Table Rows -->
      <div class="svadmin-u-3e7ce58d64fa">
        {#each Array(rows) as _, _i (_i)}
          <div class="svadmin-u-60fbb7713999 svadmin-u-0c3bc98565dd">
            <Skeleton class="svadmin-u-f6fe902450dc svadmin-u-36e579c0b41c" />
            <Skeleton class="svadmin-u-f6fe902450dc svadmin-u-36e579c0b41c" />
            <Skeleton class="svadmin-u-f6fe902450dc svadmin-u-36e579c0b41c" />
            <Skeleton class="svadmin-u-f6fe902450dc svadmin-u-36e579c0b41c" />
          </div>
        {/each}
      </div>
    {:else if type === 'show'}
      <!-- Key-Value pairs -->
      <div class="svadmin-u-b3542e058833">
        {#each Array(rows) as _, _i (_i)}
          <div class="svadmin-u-6f7e013d6499">
            <Skeleton class="svadmin-u-11e59c6d5f6b svadmin-u-671513a87226" />
            <Skeleton class="svadmin-u-f6fe902450dc svadmin-u-71e31b2f1bb2" />
          </div>
        {/each}
      </div>
    {:else if type === 'form'}
      <!-- Form Inputs -->
      <div class="svadmin-u-b3542e058833">
        {#each Array(rows) as _, _i (_i)}
          <div class="svadmin-u-6f7e013d6499">
            <Skeleton class="svadmin-u-11e59c6d5f6b svadmin-u-671513a87226" />
            <Skeleton class="svadmin-u-426b8b75185b svadmin-u-6da6a3c3f741 svadmin-u-9794ab45094d" />
          </div>
        {/each}
        <div class="svadmin-u-173fa8f06789 svadmin-u-60fbb7713999 svadmin-u-77a2a20e90d4">
          <Skeleton class="svadmin-u-426b8b75185b svadmin-u-671513a87226" />
          <Skeleton class="svadmin-u-426b8b75185b svadmin-u-671513a87226" />
        </div>
      </div>
    {/if}
  </div>
</div>
