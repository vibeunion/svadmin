# @svadmin/supabase

Supabase adapters — DataProvider, AuthProvider, LiveProvider, AuditHandler

## Install

```bash
bun add @svadmin/supabase @supabase/supabase-js
```

## Usage

```ts
import { createClient } from '@supabase/supabase-js';
import {
  createSupabaseDataProvider,
  createSupabaseAuthProvider,
  createSupabaseLiveProvider,
} from '@svadmin/supabase';

const supabase = createClient(url, anonKey);
const dataProvider = createSupabaseDataProvider(supabase);
const authProvider = createSupabaseAuthProvider(supabase);
const liveProvider = createSupabaseLiveProvider(supabase);
```

Data, auth, live, audit, RPC, and SupaCloud task adapters. Use the subpath `/supacloud` for task APIs.

Documentation: https://svadmin.nestjs.cn

License: MIT
