import { Elysia } from 'elysia';
import type { InferResourceMap } from './types';

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends
  (<Value>() => Value extends Right ? 1 : 2)
    ? true
    : false;

type Expect<Value extends true> = Value;

const user = { id: 1, name: '' };
const post = { id: 1, title: '' };
const app = new Elysia()
  .get('/users', () => ({
    items: [user],
    total: 1,
  }))
  .get('/posts', () => [
    post,
  ])
  .get('/health', () => ({ ok: true }))
  .get('/health/status', () => ({ ok: true }));

void app;

type Resources = InferResourceMap<typeof app>;

type TypeAssertions = [
  Expect<Equal<keyof Resources, 'users' | 'posts'>>,
  Expect<Equal<Resources['users'], { id: number; name: string }>>,
  Expect<Equal<Resources['posts'], { id: number; title: string }>>,
];

export type { TypeAssertions };
