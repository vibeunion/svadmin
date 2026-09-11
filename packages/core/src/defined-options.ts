type OptionalKeys<T extends Record<PropertyKey,unknown>>={
  [K in keyof T]-?: undefined extends T[K]? K:never;
}[keyof T];

export type DefinedOptions<T extends Record<PropertyKey,unknown>>=
  Omit<T,OptionalKeys<T>>&{
    [K in OptionalKeys<T>]?: Exclude<T[K],undefined>;
  };

/** Construct an options record with absent values omitted; null and falsy values are retained. */
export function definedOptions<const T extends Record<PropertyKey,unknown>>(options: T): DefinedOptions<T>;
export function definedOptions(options: Record<PropertyKey,unknown>): object {
  const result: Record<PropertyKey,unknown>={};
  for(const key of Reflect.ownKeys(options)) {
    const value=options[key];
    if(value!==undefined) {
      Object.defineProperty(result,key,{
        value,writable: true,enumerable: true,configurable: true,
      });
    }
  }
  return result;
}

/** Keep reactive getters live while exposing undefined members as absent options. */
export function definedReactiveOptions<const T extends Record<PropertyKey, unknown>>(options: T): DefinedOptions<T>;
export function definedReactiveOptions(options: Record<PropertyKey, unknown>): object {
  return new Proxy({}, {
    get(_target, key): unknown {
      return Reflect.get(options, key, options);
    },
    set(_target, key, value: unknown): boolean {
      return Reflect.set(options, key, value, options);
    },
    has(_target, key): boolean {
      return Reflect.has(options, key) && Reflect.get(options, key, options) !== undefined;
    },
    ownKeys(): (string | symbol)[] {
      return Reflect.ownKeys(options).filter((key) => Reflect.get(options, key, options) !== undefined);
    },
    getOwnPropertyDescriptor(_target, key): PropertyDescriptor | undefined {
      const descriptor = Reflect.getOwnPropertyDescriptor(options, key);
      if (!descriptor || Reflect.get(options, key, options) === undefined) return undefined;
      return { ...descriptor, configurable: true };
    },
    deleteProperty(_target, key): boolean {
      return Reflect.deleteProperty(options, key);
    },
  });
}
