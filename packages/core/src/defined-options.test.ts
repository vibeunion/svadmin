import { describe,expect,test } from 'bun:test';
import { definedOptions, definedReactiveOptions } from './defined-options';

describe('defined options',() => {
  test('omits only undefined fields without changing the input',() => {
    const input={ missing: undefined,nil: null,flag: false,count: 0,text: '' };
    const output=definedOptions(input);
    expect(output).toEqual({ nil: null,flag: false,count: 0,text: '' });
    expect(Object.hasOwn(output,'missing')).toBe(false);
    expect(Object.hasOwn(input,'missing')).toBe(true);
  });

  test('preserves references and reads getters once',() => {
    const payload={ nested: undefined };
    let reads=0;
    const output=definedOptions({ get value() { reads++; return payload; } });
    expect(output.value).toBe(payload);
    expect(reads).toBe(1);
    expect(Object.hasOwn(output.value,'nested')).toBe(true);
  });

  test('handles symbol and prototype-named keys as ordinary own data',() => {
    const key=Symbol('key');
    const output=definedOptions({
      [key]: 'value',
      ['__proto__']: { polluted: true },
    });
    expect(output[key]).toBe('value');
    expect(Object.hasOwn(output,'__proto__')).toBe(true);
    expect(Object.getPrototypeOf(output)).toBe(Object.prototype);
    expect(Reflect.get(output,'polluted')).toBeUndefined();
  });

  test('keeps getters live while membership and snapshots track defined values', () => {
    let current: string | undefined;
    let reads = 0;
    const output = definedReactiveOptions({
      get value() { reads++; return current; },
      nil: null,
      flag: false,
      zero: 0,
    });
    expect(reads).toBe(0);
    expect(output.value).toBeUndefined();
    expect(Object.hasOwn(output, 'value')).toBe(false);
    expect('value' in output).toBe(false);
    current = 'ready';
    expect(output.value).toBe('ready');
    expect(Object.hasOwn(output, 'value')).toBe(true);
    expect({ ...output }).toEqual({ value: 'ready', nil: null, flag: false, zero: 0 });
    current = undefined;
    expect(output.value).toBeUndefined();
    expect({ ...output }).toEqual({ nil: null, flag: false, zero: 0 });
  });

  test('delegates writable reactive options and preserves symbol keys', () => {
    const key = Symbol('option');
    const source = { count: 1, [key]: false };
    const output = definedReactiveOptions(source);
    output.count = 2;
    expect(source.count).toBe(2);
    expect(output[key]).toBe(false);
    expect(Reflect.ownKeys(output)).toEqual(['count', key]);
    Reflect.deleteProperty(output, key);
    expect(Object.hasOwn(source, key)).toBe(false);
  });

  test('keeps accessor receivers and callbacks reactive after an absent value', () => {
    let handler: (() => string) | undefined;
    const source = {
      prefix: 'current',
      get callback() { return handler; },
      set callback(next: (() => string) | undefined) { handler = next; },
      get label() { return this.prefix; },
    };
    const output = definedReactiveOptions(source);
    expect(Object.hasOwn(output, 'callback')).toBe(false);
    output.callback = () => 'ready';
    expect(output.callback?.()).toBe('ready');
    expect(Object.hasOwn(output, 'callback')).toBe(true);
    source.prefix = 'updated';
    expect(output.label).toBe('updated');
    source.callback = undefined;
    expect(Object.hasOwn(output, 'callback')).toBe(false);
  });
});
