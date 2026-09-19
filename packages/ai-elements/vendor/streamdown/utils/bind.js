export const defineGetter = (target, key, getValue) => {
    Object.defineProperty(target, key, {
        configurable: true,
        enumerable: true,
        get: getValue
    });
};
export const defineGetterBackedProperties = (target, getters, keys) => {
    for (const key of keys) {
        defineGetter(target, key, getters[key]);
    }
};
export const defineForwardedProperties = (target, getSource, keys) => {
    for (const key of keys) {
        defineGetter(target, key, () => getSource()[key]);
    }
};
/**
 * @deprecated Prefer explicit getter wiring so runtime bridges stay visible.
 */
export const bind = (target, source) => {
    const descriptors = Object.getOwnPropertyDescriptors(source);
    for (const [key, descriptor] of Object.entries(descriptors)) {
        Object.defineProperty(target, key, descriptor);
    }
};
