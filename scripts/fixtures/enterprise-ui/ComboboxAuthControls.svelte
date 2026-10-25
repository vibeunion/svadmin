<script lang="ts">
  import { useLogout } from '@svadmin/core';

  const logout = useLogout();
</script>

<button type="button" data-testid="combobox-logout" onclick={() => logout.mutate({})}>
  Reset auth session
</button>