import { describe, expect, it } from 'bun:test';
import {
  ok,
  err,
  isOk,
  isErr,
  unwrapResult,
  unwrapOr,
  mapResult,
  mapErr,
  flatMapResult,
  matchResult,
  fromThrowable,
  fromPromise,
} from './result';

describe('Result<T, E>', () => {
  it('creates ok and err correctly', () => {
    const success = ok(42);
    const failure = err('something went wrong');

    expect(isOk(success)).toBe(true);
    expect(isErr(success)).toBe(false);
    expect(isOk(failure)).toBe(false);
    expect(isErr(failure)).toBe(true);

    expect(unwrapResult(success)).toBe(42);
    expect(() => unwrapResult(failure)).toThrow('something went wrong');
  });

  it('supports unwrapOr', () => {
    expect(unwrapOr(ok(10), 0)).toBe(10);
    expect(unwrapOr(err('err'), 0)).toBe(0);
  });

  it('maps value and error', () => {
    const success = ok(10);
    const failure = err('bad');

    const mappedSuccess = mapResult(success, (x) => x * 2);
    expect(unwrapResult(mappedSuccess)).toBe(20);

    const mappedFail = mapErr(failure, (e) => `mapped: ${e}`);
    expect(isErr(mappedFail) && mappedFail.error).toBe('mapped: bad');
  });

  it('flatMaps correctly', () => {
    const success = ok(10);
    const nextSuccess = flatMapResult(success, (x) => ok(x + 5));
    const nextFail = flatMapResult(success, (_) => err('chained error'));

    expect(unwrapResult(nextSuccess)).toBe(15);
    expect(isErr(nextFail) && nextFail.error).toBe('chained error');
  });

  it('matches result exhaustively', () => {
    const success = ok('hello');
    const failure = err(500);

    const res1 = matchResult(success, {
      ok: (val) => `ok: ${val}`,
      err: (e) => `err: ${e}`,
    });
    expect(res1).toBe('ok: hello');

    const res2 = matchResult(failure, {
      ok: (val) => `ok: ${val}`,
      err: (e) => `err: ${e}`,
    });
    expect(res2).toBe('err: 500');
  });

  it('fromThrowable captures sync errors', () => {
    const okRes = fromThrowable(
      () => JSON.parse('{"a": 1}'),
      (e) => `Failed parse: ${e}`,
    );
    expect(unwrapResult(okRes)).toEqual({ a: 1 });

    const errRes = fromThrowable(
      () => JSON.parse('{invalid}'),
      (e) => `Failed parse: ${(e as Error).name}`,
    );
    expect(isErr(errRes)).toBe(true);
    expect(errRes.error).toBe('Failed parse: SyntaxError');
  });

  it('fromPromise captures async errors', async () => {
    const okRes = await fromPromise(
      Promise.resolve({ id: 1 }),
      (e) => `Async error: ${e}`,
    );
    expect(unwrapResult(okRes)).toEqual({ id: 1 });

    const errRes = await fromPromise(
      Promise.reject(new Error('Network down')),
      (e) => (e as Error).message,
    );
    expect(isErr(errRes)).toBe(true);
    expect(errRes.error).toBe('Network down');
  });
});
