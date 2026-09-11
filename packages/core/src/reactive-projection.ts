/** Project members without snapshotting reactive getters or changing the source object. */
function project(source: object, replacement: object, omitted: readonly PropertyKey[]): object {
  const hidden = new Set(omitted);
  return new Proxy({}, {
    get(_target, key): unknown {
      if (Reflect.has(replacement, key)) return Reflect.get(replacement, key, replacement);
      if (hidden.has(key)) return undefined;
      return Reflect.get(source, key, source);
    },
    set(_target, key, value: unknown): boolean {
      if (Reflect.has(replacement, key)) return Reflect.set(replacement, key, value, replacement);
      return !hidden.has(key) && Reflect.set(source, key, value, source);
    },
    has(_target, key): boolean {
      return Reflect.has(replacement, key) || !hidden.has(key) && Reflect.has(source, key);
    },
    ownKeys(): (string | symbol)[] {
      return [...new Set([...Reflect.ownKeys(source).filter(key => !hidden.has(key)), ...Reflect.ownKeys(replacement)])];
    },
    getOwnPropertyDescriptor(_target, key): PropertyDescriptor | undefined {
      const descriptor = Reflect.getOwnPropertyDescriptor(replacement, key)
        ?? (hidden.has(key) ? undefined : Reflect.getOwnPropertyDescriptor(source, key));
      return descriptor ? { ...descriptor, configurable: true } : undefined;
    },
  });
}

// Each retained member delegates to the source; replacement members delegate to their own object.
export function replaceReactiveMembers<T extends object, R extends object>(source: T, replacement: R): Omit<T, keyof R> & R;
export function replaceReactiveMembers(source: object, replacement: object): object {
  return project(source, replacement, []);
}

type ReplaceUnion<T, R> = T extends object ? Omit<T, keyof R> & R : never;

/** Preserve each result-state branch when projecting a discriminated runtime result. */
export function replaceReactiveUnionMembers<T extends object, R extends object>(source: T, replacement: R): ReplaceUnion<T, R>;
export function replaceReactiveUnionMembers(source: object, replacement: object): object {
  return project(source, replacement, []);
}

/** Add only new members so source discriminants and their correlated values remain intact. */
export function extendReactiveMembers<T extends object, R extends object>(
  source: T, extension: R & Record<Extract<keyof R, keyof NoInfer<T>>, never>,
): T & R;
export function extendReactiveMembers(source: object, extension: object): object {
  return project(source, extension, []);
}

export function omitReactiveMembers<T extends object, K extends keyof T>(source: T, omitted: readonly K[]): Omit<T, K>;
export function omitReactiveMembers(source: object, omitted: readonly PropertyKey[]): object {
  return project(source, {}, omitted);
}
