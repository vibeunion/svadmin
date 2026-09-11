import assert from 'node:assert/strict';
import { Elysia, t } from '../../../node_modules/elysia/dist/index.js';
import { getSchemaValidator } from '../../../node_modules/elysia/dist/schema.js';
import { z } from 'zod';

for (const dynamic of [false, true]) {
  const validator = getSchemaValidator(t.Object({ id: t.Number() }), { dynamic });
  assert.deepEqual(validator.parse({ id: 1 }), { id: 1 });
  assert.equal(validator.safeParse({ id: 'invalid' }).success, false);
  const standard = getSchemaValidator(z.object({ id: z.number() }), { dynamic });
  assert.deepEqual(standard.parse({ id: 1 }), { id: 1 });
  const failure = standard.safeParse({ id: 'invalid' });
  assert.equal(failure.success, false);
  if (failure.success) throw new Error('Expected parsing to fail');
  assert.equal(failure.errors[0]?.path, '/id');
  assert.throws(() => standard.parse({ id: 'invalid' }));
}

const models = new Elysia().model({
  User: t.Object({ id: t.Number() }),
  Label: z.string().transform(value => value.length),
});
assert.deepEqual(models.models.User.parse({ id: 1 }), { id: 1 });
assert.equal(models.models.Label.parse('label'), 5);
assert.equal(models.models.Label.safeParse(1).success, false);

const app = new Elysia()
  .macro({ identity: { resolve: () => ({ user: { id: 7 } }) } })
  .get('/identity', ({ user }) => ({ id: user.id }), { identity: true })
  .get('/missing', ({ status }) => status('Not Found', { error: 'missing' }), {
    response: { 404: t.Object({ error: t.String() }) },
  });
const identity = await app.handle(new Request('http://localhost/identity'));
assert.deepEqual(await identity.json(), { id: 7 });
const missing = await app.handle(new Request('http://localhost/missing'));
assert.equal(missing.status, 404);
assert.deepEqual(await missing.json(), { error: 'missing' });
