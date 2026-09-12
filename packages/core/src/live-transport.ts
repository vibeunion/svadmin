import { Type, type Static } from '@sinclair/typebox';
import { checkExact } from './schema-validation';
import { snapshotPlainData, type JsonValue } from './plain-data';
import { definedOptions } from './defined-options';

const eventFields = {
  type: Type.Union([Type.Literal('INSERT'), Type.Literal('UPDATE'), Type.Literal('DELETE')]),
  resource: Type.String({ minLength: 1 }),
  payload: Type.Record(Type.String(), Type.Unknown()),
};
const eventSchema = Type.Object(eventFields, { additionalProperties: false });
const namedEventSchema = Type.Object({
  ...eventFields, resource: Type.Optional(eventFields.resource),
}, { additionalProperties: false });
export type LiveEvent = Static<typeof eventSchema>;

export function snapshotLiveEvent(value: unknown): LiveEvent | undefined {
  try {
    const event = snapshotPlainData(value);
    return checkExact(eventSchema, event) ? event : undefined;
  } catch { return undefined; }
}

/** Only a checked event envelope crosses the transport; business payloads stay unknown. */
export function decodeLiveMessage(data: unknown, channel?: string): LiveEvent | undefined {
  if (typeof data !== 'string') return undefined;
  try {
    const parsed: unknown = JSON.parse(data);
    const value: unknown = snapshotPlainData(parsed);
    if (channel === undefined) return checkExact(eventSchema, value) ? value : undefined;
    if (!checkExact(namedEventSchema, value) || (value.resource !== undefined && value.resource !== channel)) return undefined;
    const event = { ...value, resource: channel };
    return checkExact(eventSchema, event) ? event : undefined;
  } catch { return undefined; }
}

export function notifyLiveObserver<T>(callback: ((value: T) => unknown) | undefined, value: T): void {
  try { void Promise.resolve(callback?.(value)).catch(() => {}); }
  catch { /* Observers do not own transport delivery or cleanup. */ }
}

export function readLiveOptions(value: unknown, allowed: readonly string[]): Record<string, unknown> {
  try {
    if (typeof value !== 'object' || value === null || Object.getOwnPropertySymbols(value).length) throw new TypeError();
    const prototype: unknown = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) throw new TypeError();
    const entries: [string, unknown][] = Object.entries(Object.getOwnPropertyDescriptors(value)).map(([key, descriptor]) => {
      if (!allowed.includes(key) || !descriptor.enumerable || !('value' in descriptor)) throw new TypeError();
      const input: unknown = descriptor.value;
      if (input === undefined) throw new TypeError();
      return [key, input];
    });
    return Object.fromEntries(entries);
  } catch { throw new TypeError('Invalid live options'); }
}

export function captureLiveObserver(value: unknown): ((event: unknown) => unknown) | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'function') throw new TypeError('Invalid live observer');
  return event => value(event);
}

function subscription(value: unknown) {
  try {
    const fields = readLiveOptions(value, ['resource', 'liveParams', 'callback']);
    const resource = fields['resource'];
    const callback = fields['callback'];
    if (typeof resource !== 'string' || resource.length === 0 || typeof callback !== 'function') throw new TypeError();
    const liveParams = fields['liveParams'] === undefined ? undefined : snapshotPlainData(fields['liveParams']);
    if (liveParams !== undefined && !checkExact(eventFields.payload, liveParams)) throw new TypeError();
    return { resource, ...definedOptions({ liveParams }), callback: (event: LiveEvent): unknown => callback(event) };
  } catch { throw new TypeError('Invalid live subscription'); }
}

function ordered(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(ordered);
  if (typeof value !== 'object' || value === null) return value;
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([key, child]) => [key, ordered(child)]));
}

/** Each registration owns its own cleanup, even when two callbacks are identical. */
export function createLiveSubscribers() {
  type Entry = ReturnType<typeof subscription>;
  const resources = new Map<string, { paramsKey: string; input: Entry; entries: Set<Entry> }>();
  return {
    add(value: unknown, supportsParams = true) {
      const input = subscription(value);
      if (!supportsParams && input.liveParams !== undefined) throw new TypeError('SSE live parameters are unsupported');
      const paramsKey = JSON.stringify(ordered(snapshotPlainData(input.liveParams ?? null)));
      let group = resources.get(input.resource);
      if (group && group.paramsKey !== paramsKey) throw new TypeError('Conflicting live subscription parameters');
      const first = group === undefined;
      if (!group) {
        group = { paramsKey, input, entries: new Set() };
        resources.set(input.resource, group);
      }
      const owner = group;
      group.entries.add(input);
      return {
        resource: input.resource, first,
        remove() {
          if (!owner.entries.delete(input) || owner.entries.size > 0) return false;
          resources.delete(input.resource);
          return true;
        },
      };
    },
    get empty() { return resources.size === 0; },
    channels() {
      return [...resources.values()].map(({ input }) => ({
        resource: input.resource,
        ...definedOptions({ liveParams: input.liveParams === undefined ? undefined : snapshotPlainData(input.liveParams) }),
      }));
    },
    notify(event: LiveEvent, current: () => boolean) {
      const groups = new Set([resources.get(event.resource), resources.get('*')]);
      const recipients = [...groups].flatMap(group => group ? [...group.entries].map(entry => ({ group, entry })) : []);
      for (const { group, entry } of recipients) {
        if (!current()) return;
        if (!group.entries.has(entry)) continue;
        const detached = snapshotPlainData(event);
        if (checkExact(eventSchema, detached)) notifyLiveObserver(entry.callback, detached);
      }
    },
  };
}
