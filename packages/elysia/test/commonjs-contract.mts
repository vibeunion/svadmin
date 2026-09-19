import assert from 'node:assert/strict';
import { Elysia, t } from '../../../node_modules/elysia/dist/index.js';
import { getSchemaValidator } from '../../../node_modules/elysia/dist/schema.js';
import { typeboxAsyncStandard, typeboxStandard } from './typebox-standard-schema.mts';

for (const dynamic of [false, true]) {
  const validator = getSchemaValidator(t.Object({ id: t.Number() }), { dynamic });
  assert.deepEqual(validator.parse({ id: 1 }), { id: 1 });
  assert.equal(validator.safeParse({ id: 'invalid' }).success, false);
  const standard = getSchemaValidator(typeboxStandard(t.Object({ id: t.Number() })), { dynamic });
  assert.deepEqual(standard.parse({ id: 1 }), { id: 1 });
  const failure = standard.safeParse({ id: 'invalid' });
  assert.equal(failure.success, false);
  if (failure.success) throw new Error('Expected parsing to fail');
  assert.equal(failure.errors[0]?.path, '/id');
  assert.throws(() => standard.parse({ id: 'invalid' }));

  const asyncValidator = getSchemaValidator(typeboxAsyncStandard(t.String({ minLength: 1 })), { dynamic });
  assert.throws(() => asyncValidator.parse('value'), /Use Validate/);
  assert.throws(() => asyncValidator.safeParse('value'), /Use Validate/);
  if (!asyncValidator.Validate) throw new Error('Expected a Standard Schema validator');
  assert.deepEqual(await asyncValidator.Validate('value'), { value: 'value' });
  assert.ok((await asyncValidator.Validate('')).issues);

  const escaped = getSchemaValidator(typeboxStandard(t.Object({
    'a/b': t.Object({ '~name': t.Array(t.Number()) }),
  })), { dynamic });
  const escapedFailure = escaped.safeParse({ 'a/b': { '~name': ['private-payload'] } });
  if (escapedFailure.success) throw new Error('Expected escaped path validation to fail');
  assert.equal(escapedFailure.errors[0]?.path, '/a~1b/~0name/0');
  assert.ok(!JSON.stringify(escapedFailure).includes('private-payload'));
}

const models = new Elysia().model({
  User: t.Object({ id: t.Number() }),
  Label: typeboxStandard(t.Transform(t.String())
    .Decode(value => value.length).Encode(value => String(value))),
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
