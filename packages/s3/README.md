# @svadmin/s3

Read-only `DataProvider` for an S3-compatible bucket. It lists objects and common prefixes, and reads object metadata (`key`, `size`, `lastModified`, `etag`, `contentType`). Small `text/*`, JSON, and XML bodies can be inlined from `getOne` when you opt in.

This package is not `@svadmin/storage`. Storage stays the client upload toolkit (`createS3StorageProvider`, presigned upload callbacks, `delete`). `@svadmin/s3` does not upload, copy, delete, or mint presigned PUT URLs. `create`, `update`, `delete`, and `custom` fail closed before any request is sent.

Use it on a trusted server. Do not import it into a browser bundle with access keys. The constructor throws if it sees a browser `window`.

## Install

```bash
bun add @svadmin/s3
```

## Usage

```ts
import { createS3DataProvider } from '@svadmin/s3';

const objects = createS3DataProvider({
  endpoint: process.env.SVADMIN_S3_ENDPOINT, // MinIO, R2, or another S3-compatible origin
  region: process.env.SVADMIN_S3_REGION ?? 'us-east-1',
  bucket: process.env.SVADMIN_S3_BUCKET,
  prefix: 'incoming/',
  accessKeyId: process.env.SVADMIN_S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.SVADMIN_S3_SECRET_ACCESS_KEY,
  sessionToken: process.env.SVADMIN_S3_SESSION_TOKEN,
  forcePathStyle: true,
  maxInlineBodyBytes: 65_536,
});

const page = await objects.getList({
  resource: 'objects',
  pagination: { mode: 'cursor', pageSize: 100 },
});
```

Credentials can also come from `SVADMIN_S3_ENDPOINT`, `SVADMIN_S3_REGION`, `SVADMIN_S3_BUCKET`, `SVADMIN_S3_PREFIX`, `SVADMIN_S3_ACCESS_KEY_ID`, `SVADMIN_S3_SECRET_ACCESS_KEY`, `SVADMIN_S3_SESSION_TOKEN`, and `SVADMIN_S3_FORCE_PATH_STYLE`. Standard `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`, `AWS_REGION`, and `AWS_ENDPOINT_URL_S3` are fallbacks. Constructor options win. Pass `env: {}` when tests must ignore the ambient process environment. Missing or partial credentials fail closed. `allowAnonymous: true` is the only unsigned mode, and it is for a public bucket.

`resource` defaults to `objects` and only names this bucket listing. It is not a dataset or table name. `meta.prefix` appends a relative prefix under the configured prefix. `..` is rejected.

Offset `getList` scans up to `maxListKeys` (default 5000) and fails closed if the listing is still truncated. Use `pagination.mode: 'cursor'` for larger buckets. The only supported sort is `key` ascending.

`getOne` uses `HEAD`. A non-zero `maxInlineBodyBytes` then `GET`s the body only when `Content-Length` is known and the type is text, JSON, or XML, and the size is within the ceiling. Request meta cannot raise that ceiling.

`forcePathStyle` defaults to `true` for custom endpoints (MinIO, IP hosts) and `false` for the default AWS regional endpoint.

仅供受信服务端使用。不要把访问密钥打进浏览器包。写操作会失败关闭，不会发出上传或删除请求。
