<script lang="ts">
  import { captureAdminContext, useMenu } from '@svadmin/core';
  
  const adminContext = captureAdminContext();
  const { menuItems } = useMenu();

  let navigated = false;
  $effect(() => {
    // Navigate to first resource ONCE — avoid infinite re-triggers
    if (!navigated && menuItems.length > 0) {
      navigated = true;
      adminContext.navigate(menuItems[0].route);
    }
  });
</script>

<div class="svadmin-u-60fbb7713999 svadmin-u-ef114b5f5ad1 svadmin-u-71ec51c9997d svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-8e63407b5ceb svadmin-u-bfa603190748">
  <div class="svadmin-u-ca6bf63030aa">
    <div class="svadmin-u-da019856f2cc svadmin-u-bb0c4bfc52bd svadmin-u-ed8a5df7b2fb svadmin-u-2bbcfc3b5179 svadmin-u-afbdd13a380e svadmin-u-ac204c108886 svadmin-u-b485ae1c3b47 svadmin-u-6cbc84dd9e1a svadmin-u-980d09f1c472"></div>
    <p>Navigating to default resource...</p>
  </div>
</div>
