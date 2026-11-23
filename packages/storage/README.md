# @svadmin/storage

Storage adapters — S3, Cloudflare R2, and in-memory storage provider for svadmin

## Install

```bash
bun add @svadmin/storage
```

## Usage

```ts
import { createS3StorageProvider } from '@svadmin/storage';

const storage = createS3StorageProvider({
  bucket: 'my-bucket',
  publicUrl: 'https://cdn.example.com',
  getPresignedUploadUrl: async ({ path }) => signUpload(path),
});
```

Storage provider for S3, Cloudflare R2, and in-memory development, including presigned uploads, deletes, and batch validation.

Documentation: https://svadmin.nestjs.cn

License: MIT
