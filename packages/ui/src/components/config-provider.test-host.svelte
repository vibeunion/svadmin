<script lang="ts">
  import ConfigProvider from './ConfigProvider.svelte';
  import { Button } from './ui/button/index.js';
  import { Input } from './ui/input/index.js';
  import { Badge } from './ui/badge/index.js';
</script>

<ConfigProvider componentSize="sm" density="compact" direction="rtl" locale="zh-CN">
  <Button>Action</Button>
  <Input aria-label="Name" />
  <Badge>Status</Badge>
</ConfigProvider>
