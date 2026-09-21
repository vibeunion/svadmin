<script lang="ts">
  import { useLogout } from '@svadmin/core';
  const logout = useLogout();
</script>

<button type="button" onclick={() => logout.mutate()}>Test logout</button>
