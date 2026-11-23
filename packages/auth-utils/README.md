# @svadmin/auth-utils

Zero-dependency auth utility functions — password hashing, session management, TOTP for svadmin

## Install

```bash
bun add @svadmin/auth-utils
```

## Usage

```ts
import {
  hashPassword,
  verifyPassword,
  createSessionManager,
  generateSecret,
  generateTOTP,
  verifyTOTP,
} from '@svadmin/auth-utils';

const passwordHash = await hashPassword('correct horse battery staple');
```

Zero-dependency password hashing, session management, and TOTP helpers. Keep secrets server-side.

Documentation: https://svadmin.nestjs.cn

License: MIT
