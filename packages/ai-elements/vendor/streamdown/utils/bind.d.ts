export type PropertyKeyOf<T extends object> = Extract<keyof T, string>;
export declare const defineGetter: <Target extends object, Key extends string, Value>(target: Target, key: Key, getValue: () => Value) => void;
export declare const defineGetterBackedProperties: <Target extends object, Shape extends object>(target: Target, getters: { [K in PropertyKeyOf<Shape>]: () => Shape[K]; }, keys: readonly PropertyKeyOf<Shape>[]) => void;
export declare const defineForwardedProperties: <Target extends object, Source extends object>(target: Target, getSource: () => Source, keys: readonly PropertyKeyOf<Source>[]) => void;
/**
 * @deprecated Prefer explicit getter wiring so runtime bridges stay visible.
 */
export declare const bind: <Target extends object, Source extends object>(target: Target, source: Source) => void;
