<script lang="ts">
  import { captureAdminContext, useMenu } from '@svadmin/core';
  
  const adminContext = captureAdminContext();
  const { menuItems } = useMenu();

  let navigated = false;
  $effect(() => {
    // Navigate to first resource ONCE — avoid infinite re-triggers
    const firstMenuItem = menuItems[0];
    if (!navigated && firstMenuItem) {
      navigated = true;
      adminContext.navigate(firstMenuItem.route);
    }
  });
</script>

<div class="flex h-screen w-screen items-center justify-center p-4 text-muted-foreground">
  <div class="text-center">
    <div class="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
    <p>Navigating to default resource...</p>
  </div>
</div>
