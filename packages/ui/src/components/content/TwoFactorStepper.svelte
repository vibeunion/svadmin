<script lang="ts">
  interface Props { current: number; steps?: string[]; class?: string; }
  let { current, steps = ['Setup', 'Verify', 'Recovery'], class: className = '' }: Props = $props();
</script>
<ol class={'svadmin-u-f3c543ad5fe9 svadmin-u-77a2a20e90d4 svadmin-u-ab1b20c2292a ' + className} aria-label="Progress">
  {#each steps as step, index (step)}
    <li class={'svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-0e17f2bd9074 svadmin-u-03b4dd7f172b svadmin-u-359090c2d529 ' + (index < current ? 'svadmin-u-18a6e7a36f29 svadmin-u-17a9f7af2265 svadmin-u-76747e5e02ff' : index === current ? 'svadmin-u-05f954a846d6 svadmin-u-375dc44df6e9 svadmin-u-2689f3958069 svadmin-u-20aaf08a7ed1' : 'svadmin-u-18049387f0af svadmin-u-bfa603190748')}>
      <span class="svadmin-u-60fbb7713999 svadmin-u-add63bc6753d svadmin-u-012fbd121f37 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-ac204c108886 svadmin-u-ca6bcd4b6f3f svadmin-u-d058ca6de60f">{index + 1}</span><span class="svadmin-u-f283ea9bea0e">{step}</span>
    </li>
  {/each}
</ol>
