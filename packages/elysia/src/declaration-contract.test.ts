import { describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Elysia, t } from 'elysia';
import { Cookie } from 'elysia/cookies';
import { getSchemaValidator } from 'elysia/schema';
import { z } from 'zod';

describe('Elysia declaration contracts', () => {
  test('validates route responses and preserves named error statuses', async () => {
    const app = new Elysia()
      .get('/users', () => ({ items: [{ id: 1, name: 'Ada' }], total: 1 }), {
        response: t.Object({
          items: t.Array(t.Object({ id: t.Number(), name: t.String() })),
          total: t.Number(),
        }),
      })
      .get('/missing', ({ status }) => status('Not Found', { error: 'missing' }), {
        response: { 404: t.Object({ error: t.String() }) },
      })
      .get('/quoted', ({ status }) => status('OK', { ok: true }), {
        response: { '200': t.Object({ ok: t.Boolean() }) },
      });
    const users = await app.handle(new Request('http://localhost/users'));
    expect(users.status).toBe(200);
    expect(await users.json()).toEqual({ items: [{ id: 1, name: 'Ada' }], total: 1 });
    const missing = await app.handle(new Request('http://localhost/missing'));
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: 'missing' });
    expect(await (await app.handle(new Request('http://localhost/quoted'))).json()).toEqual({ ok: true });
  });

  test('keeps macro resolution and early responses separate', async () => {
    const app = new Elysia()
      .macro({
        identity: { resolve: () => ({ user: { id: 7 } }) },
        denied: {
          beforeHandle: ({ status }) => status('Forbidden', { error: 'denied' }),
        },
      })
      .get('/identity', ({ user }) => ({ id: user.id }), { identity: true })
      .get('/disabled', () => ({ ok: true }), { identity: false })
      .get('/denied', () => ({ ok: true }), { denied: true });

    expect(await (await app.handle(new Request('http://localhost/identity'))).json()).toEqual({ id: 7 });
    expect(await (await app.handle(new Request('http://localhost/disabled'))).json()).toEqual({ ok: true });
    const denied = await app.handle(new Request('http://localhost/denied'));
    expect(denied.status).toBe(403);
    expect(await denied.json()).toEqual({ error: 'denied' });
  });

  test('resolves model references and returns parsed values rather than schemas', () => {
    const app = new Elysia().model({
      User: t.Object({ id: t.Number(), name: t.String() }),
    });
    const model = app.models.User;
    expect(model.parse({ id: 1, name: 'Ada' })).toEqual({ id: 1, name: 'Ada' });
    expect(model.safeParse({ id: 'invalid' }).success).toBe(false);
    expect(() => model.parse({ id: 'invalid' })).toThrow();
  });

  test.each([false, true])('rejects invalid TypeBox data with dynamic=%s', dynamic => {
    const validator = getSchemaValidator(t.Object({ id: t.Number() }), { dynamic });
    expect(validator.parse({ id: 1 })).toEqual({ id: 1 });
    expect(validator.safeParse({ id: 'invalid' }).success).toBe(false);
  });

  test.each([false, true])('parses Standard Schema values and rejects invalid data with dynamic=%s', dynamic => {
    const validator = getSchemaValidator(z.object({ id: z.number() }), { dynamic });
    expect(validator.parse({ id: 1 })).toEqual({ id: 1 });
    expect(validator.safeParse({ id: 1 })).toEqual({ success: true, data: { id: 1 }, error: null });
    expect(validator.safeParse({ id: 'invalid' })).toMatchObject({
      success: false,
      data: null,
      errors: [{ path: '/id', message: expect.any(String), summary: expect.any(String) }],
    });
    expect(() => validator.parse({ id: 'invalid' })).toThrow();
    expect([...validator.Errors({ id: 'invalid' })]).toMatchObject([{ path: '/id' }]);
  });

  test('supports mixed model registries without importing Standard Schema into TypeBox', () => {
    const app = new Elysia().model({
      User: t.Object({ id: t.Number() }),
      Label: z.string().transform(value => value.length),
    });
    expect(app.models.User.parse({ id: 1 })).toEqual({ id: 1 });
    expect(app.models.Label.parse('label')).toBe(5);
    expect(app.models.Label.safeParse(123).success).toBe(false);
    expect(app.models.modules.Import('User')).toHaveProperty('$ref', 'User');
  });

  test('passes actual schemas to model mappers and resolves TypeBox references', () => {
    const app = new Elysia().model({ User: t.Object({ id: t.Number(), name: t.String() }) });
    const reference = app.Ref('User');
    const withReferences = app.model('Copy', t.Object({ user: reference }));
    expect(withReferences.models.Copy.parse({ user: { id: 1, name: 'Ada' } })).toEqual({
      user: { id: 1, name: 'Ada' },
    });
    const mapped = new Elysia()
      .model({ User: t.Object({ id: t.Number(), name: t.String() }) })
      .model(models => ({ UserId: t.Pick(models.User, ['id']) }));
    expect(mapped.models.UserId.parse({ id: 1 })).toEqual({ id: 1 });
  });

  test('requires async schemas to use Validate instead of returning promises as parsed data', async () => {
    const validator = getSchemaValidator(z.string().refine(async value => value.length > 0));
    expect(() => validator.parse('value')).toThrow('Use Validate');
    expect(() => validator.safeParse('value')).toThrow('Use Validate');
    if (!validator.Validate) throw new Error('Expected a Standard Schema validator');
    expect(await validator.Validate('value')).toEqual({ value: 'value' });
    expect(await validator.Validate('')).toHaveProperty('issues');
  });

  test('combines nested macros and resolver arrays', async () => {
    const app = new Elysia()
      .macro({ identity: { resolve: [() => ({ user: { id: 7 } }), () => ({ enabled: true })] } })
      .macro({ audit: { identity: true, resolve: () => ({ trace: 'trace' }) } })
      .get('/nested', ({ user, enabled, trace }) => ({ id: user.id, enabled, trace }), { audit: true });
    expect(await (await app.handle(new Request('http://localhost/nested'))).json()).toEqual({
      id: 7, enabled: true, trace: 'trace',
    });
  });

  test('returns decoded TypeBox transform values', () => {
    const app = new Elysia().model('Length',
      t.Transform(t.String()).Decode(value => value.length).Encode(value => String(value)));
    expect(app.models.Length.parse('text')).toBe(4);
  });

  test('does not make inner model properties optional merely because a request schema is optional', () => {
    const model = new Elysia().model('Optional', t.Optional(t.Object({ id: t.Number() }))).models.Optional;
    expect(model.parse({ id: 1 })).toEqual({ id: 1 });
    expect(model.safeParse({}).success).toBe(false);
  });

  test('normalizes Standard Schema issue paths without retaining extra payload fields', () => {
    const validator = getSchemaValidator({
      '~standard': {
        ...z.never()['~standard'],
        validate: () => ({
          issues: [{ message: 'Invalid field', path: [{ key: 'a/b' }, '~name', 0], input: 'private-payload' }],
        }),
      },
    });
    const failure = validator.safeParse({});
    expect(failure).toEqual({
      success: false,
      data: null,
      error: 'Invalid field',
      errors: [{ message: 'Invalid field', summary: 'Invalid field', path: '/a~1b/~0name/0' }],
    });
    expect(JSON.stringify(failure)).not.toContain('private-payload');
  });

  test.each([
    ['private-payload'],
    [null],
    [{ message: 1 }],
    [{ message: 'Invalid', path: true }],
    [{ message: 'Invalid', path: [{}] }],
    'private-payload',
  ].map(issues => ({ issues })))('rejects malformed Standard Schema issues %#', ({ issues }) => {
    const validator = getSchemaValidator({
      '~standard': { ...z.never()['~standard'], validate: () => ({ issues }) },
    });
    expect(() => validator.safeParse({})).toThrow(TypeError);
  });

  test('represents an unset cookie secret without changing its accepted values', () => {
    const cookie = new Cookie<string>('session', {});
    expect(cookie.secrets).toBeUndefined();
    cookie.secrets = ['next', null, 'previous'];
    expect(cookie.secrets).toEqual(['next', null, 'previous']);
    cookie.secrets = undefined;
    expect(cookie.secrets).toBeUndefined();
  });

  test('passes registered errors to scoped guard handlers', async () => {
    class DeniedError extends Error {
      readonly reason = 'denied';
    }
    const app = new Elysia().error({ Denied: DeniedError }).guard({
      error({ code, error, status }) {
        if (code === 'Denied') return status(403, { reason: error.reason });
        return status(500, { reason: 'unexpected' });
      },
    }, guarded => guarded.get('/guarded', () => { throw new DeniedError(); }));
    const response = await app.handle(new Request('http://localhost/guarded'));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ reason: 'denied' });
  });

  test('preserves CommonJS parsing and routing contracts in a standalone Node process', () => {
    const result = spawnSync(process.env['NODE_BINARY'] ?? 'node', [
      fileURLToPath(new URL('../test/commonjs-contract.mts', import.meta.url)),
    ], { encoding: 'utf8' });
    if (result.error) throw result.error;
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
  });
});
