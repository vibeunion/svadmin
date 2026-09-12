import { Elysia, t } from 'elysia';
import type { SelectiveStatus } from 'elysia/error';
import type { InferResourceMap } from '../../../packages/elysia/src/types.js';
import type { Reconcile, UnwrapSchema } from 'elysia/types';
import { z } from 'zod';

const app = new Elysia().get('/users', () => ({
  items: [{ id: 1, name: 'Ada' }],
  total: 1,
}), {
  response: t.Object({
    items: t.Array(t.Object({ id: t.Number(), name: t.String() })),
    total: t.Number(),
  }),
});
type Users = InferResourceMap<typeof app>;
const user: Users['users'] = { id: 1, name: 'Ada' };
void app;
// @ts-expect-error Route response records retain schema-derived field types.
user.id = 'one';
void user;

declare const status: SelectiveStatus<{ 200: { ok: true }; 404: { error: string } }>;
status(200, { ok: true });
status('Not Found', { error: 'missing' });
// @ts-expect-error Status codes must be present in the response schema.
status(500, { error: 'unexpected' });
// @ts-expect-error Named status codes retain their payload schema.
status('OK', { error: 'wrong' });
// @ts-expect-error Unknown response fields must be rejected.
status(200, { ok: true, unexpected: true });
declare const quotedStatus: SelectiveStatus<{ '200': { ok: true } }>;
quotedStatus(200, { ok: true });
quotedStatus('OK', { ok: true });
// @ts-expect-error Quoted numeric keys must not admit an unrelated status.
quotedStatus(201, { ok: true });

new Elysia().macro({
  identity: { resolve: () => ({ user: { id: 7 } }) },
  denied: { beforeHandle: ({ status }) => status('Forbidden', { error: 'denied' }) },
}).get('/identity', ({ user }) => {
  const id: number = user.id;
  // @ts-expect-error Macro resolution preserves concrete property types.
  user.id = 'seven';
  return { id };
}, { identity: true }).get('/disabled', context => {
  // @ts-expect-error Disabled macros do not contribute resolved context.
  void context.user;
  return { ok: true };
}, { identity: false });

const models = new Elysia().model({
  User: t.Object({ id: t.Number(), name: t.String() }),
});
const parsed = models.models.User.parse({ id: 1, name: 'Ada' });
const parsedId: number = parsed.id;
// @ts-expect-error Model parsers return data, not a TypeBox schema object.
void parsed.properties;
const result = models.models.User.safeParse({ id: 'invalid' });
if (result.success) {
  const id: number = result.data.id;
  void id;
} else {
  // @ts-expect-error Failed parsing cannot expose a successful data record.
  void result.data.id;
}
void parsedId;

type Definitions = typeof models['~Definitions']['typebox'];
type User = UnwrapSchema<'User', Definitions>;
const inferred: User = { id: 1, name: 'Ada' };
// @ts-expect-error Named schema references preserve their field types.
inferred.name = 5;
void inferred;

type Merged = Reconcile<{ nested: { a: number } }, { nested: { a: string } }, true>;
declare const merged: Merged;
const replaced: string = merged.nested.a;
// @ts-expect-error Override reconciliation must not retain the old field type.
const old: number = merged.nested.a;
void replaced;
void old;

const mixed = new Elysia().model({
  User: t.Object({ id: t.Number() }),
  Label: z.string().transform(value => value.length),
});
const labelLength: number = mixed.models.Label.parse('label');
// @ts-expect-error Standard Schema models retain their decoded output type.
const labelText: string = mixed.models.Label.parse('label');
mixed.Ref('User');
mixed.models.modules.Import('User');
// @ts-expect-error The TypeBox module does not contain Standard Schema definitions.
mixed.models.modules.Import('Label');
// @ts-expect-error Standard Schema models are not TypeBox references.
mixed.Ref('Label');
// @ts-expect-error References must identify registered TypeBox models.
mixed.Ref('Missing');
const envelope = mixed.model('Envelope', t.Object({ user: mixed.Ref('User') }));
const envelopeId: number = envelope.models.Envelope.parse({ user: { id: 1 } }).user.id;
// @ts-expect-error Module references must resolve concrete properties.
envelope.models.Envelope.parse({ user: { id: 1 } }).user.id = 'one';
const remapped = models.model(schemas => ({ UserId: t.Pick(schemas.User, ['id']) }));
const remappedId: number = remapped.models.UserId.parse({ id: 1 }).id;
// @ts-expect-error Model mappers replace the registry rather than retaining removed models.
void remapped.models.User;
void labelLength;
void labelText;
void envelopeId;
void remappedId;

new Elysia().macro({
  identity: { resolve: [() => ({ user: { id: 7 } }), () => ({ enabled: true })] },
}).macro({
  audit: { identity: true, resolve: () => ({ trace: 'trace' }) },
}).get('/nested', ({ user, enabled, trace }) => {
  const id: number = user.id;
  const active: boolean = enabled;
  const traceId: string = trace;
  return { id, active, traceId };
}, { audit: true });

const transformed = new Elysia().model('Length',
  t.Transform(t.String()).Decode(value => value.length).Encode(value => String(value)));
const length: number = transformed.models.Length.parse('text');
void length;

const optional = new Elysia().model('Optional', t.Optional(t.Object({ id: t.Number() })));
const optionalId: number = optional.models.Optional.parse({ id: 1 }).id;
void optionalId;

class DeniedError extends Error {
  readonly reason = 'denied';
}
new Elysia().error({ Denied: DeniedError }).guard({
  error({ code, error, status }) {
    if (code === 'Denied') {
      const reason: 'denied' = error.reason;
      // @ts-expect-error Registered guard errors cannot expose arbitrary properties.
      void error.missing;
      return status(403, { reason });
    }
    return status(500, 'unexpected');
  },
}, app => app.get('/guarded', () => 'guarded'));
