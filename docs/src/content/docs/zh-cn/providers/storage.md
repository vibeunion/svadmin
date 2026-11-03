---
title: 云存储提供器
description: 带签名上传后端的云对象存储集成
---

`@svadmin/storage` 提供统一的云对象存储抽象与内存测试驱动，并联动 `@svadmin/ui` 中的 `<UploadField>` 组件。

## 安装

```bash
bun add @svadmin/storage
```

## 基本用法

### 1. 配置 StorageProvider

在应用入口（如 `App.svelte`）中初始化存储提供器：

```typescript
import { createS3StorageProvider } from '@svadmin/storage';
import { setStorageProvider } from '@svadmin/core';

const storage = createS3StorageProvider({
  bucket: 'my-admin-uploads',
  publicUrl: 'https://cdn.my-company.com',
  // 可选：请求后端签发的预签名上传 URL（避免在前端暴露密钥）
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

### 2. 在表单中使用 `<UploadField>`

```svelte
<script lang="ts">
  import { UploadField } from '@svadmin/ui';

  let avatarUrl = $state<string | null>(null);
  let galleryUrls = $state<string[]>([]);
</script>

<!-- 单图上传 -->
<UploadField
  label="用户头像"
  bind:value={avatarUrl}
  accept="image/*"
  path="avatars"
/>

<!-- 多文件批量上传 -->
<UploadField
  label="相关附件"
  bind:value={galleryUrls}
  multiple={true}
  path="documents"
  maxSizeBytes={10 * 1024 * 1024}
/>
```

### 3. 使用 `useStorage()` Hook

对于自定义交互，可直接调用响应式无头 Hook：

```svelte
<script lang="ts">
  import { useStorage } from '@svadmin/core';

  const storage = useStorage();

  async function onUpload(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const result = await storage.upload(file, {
      path: 'receipts',
      onProgress: (p) => {
        console.log(`上传进度: ${p.percentage}%`);
      },
    });

    console.log('文件访问地址:', result.url);
  }
</script>
```
