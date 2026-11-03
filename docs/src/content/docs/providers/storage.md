---
title: Storage Provider
description: Cloud object storage integration for signed upload backends
---

`@svadmin/storage` provides unified cloud object storage adapters and an in-memory test driver, paired with `@svadmin/ui`'s `<UploadField>`.

## Installation

```bash
bun add @svadmin/storage
```

## Basic Usage

### 1. Initialize StorageProvider

In your application root (`App.svelte`):

```typescript
import { createS3StorageProvider } from '@svadmin/storage';
import { setStorageProvider } from '@svadmin/core';

const storage = createS3StorageProvider({
  bucket: 'my-admin-uploads',
  publicUrl: 'https://cdn.my-company.com',
  getPresignedUploadUrl: async ({ path, contentType }) => {
    const res = await fetch('/api/storage/presigned', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, contentType }),
    });
    return res.json();
  },
});

setStorageProvider(storage);
```

### 2. Form Integration with `<UploadField>`

```svelte
<script lang="ts">
  import { UploadField } from '@svadmin/ui';

  let avatarUrl = $state<string | null>(null);
  let documentUrls = $state<string[]>([]);
</script>

<UploadField
  label="Avatar"
  bind:value={avatarUrl}
  accept="image/*"
  path="avatars"
/>

<UploadField
  label="Attachments"
  bind:value={documentUrls}
  multiple={true}
  path="docs"
  maxSizeBytes={10 * 1024 * 1024}
/>
```
