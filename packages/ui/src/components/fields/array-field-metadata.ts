export const arrayFieldRowKey = Symbol('array-field-row');
export const arrayFieldOrderKey = Symbol('array-field-order');

/** 仅剥离 UI 行身份；保留其他描述符，让 Core 继续拒绝非法业务数据。 */
export function withoutArrayFieldMetadata(value: unknown): unknown {
  const copies = new Map<object, object>();
  function copy(input: unknown): unknown {
    if (typeof input !== 'object' || input === null) return input;
    const prototype = Object.getPrototypeOf(input) as object | null;
    if (!Array.isArray(input) && prototype !== Object.prototype && prototype !== null) return input;
    const previous = copies.get(input);
    if (previous) return previous;
    const output: object = Array.isArray(input) ? [] : Object.create(prototype);
    copies.set(input, output);
    for (const key of Reflect.ownKeys(input)) {
      if (key === arrayFieldRowKey || key === arrayFieldOrderKey) continue;
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (!descriptor) continue;
      if ('value' in descriptor) descriptor.value = copy(descriptor.value);
      Object.defineProperty(output, key, descriptor);
    }
    return output;
  }
  try {
    return copy(value);
  } catch {
    // 由 Core 归一化拒绝，不能把无法读取的数据替换成可提交的空值。
    return value;
  }
}
