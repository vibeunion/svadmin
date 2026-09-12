import { Type, type TObject, type TSchema } from '@sinclair/typebox';
import { TypeGuard } from '@sinclair/typebox/type';
import { checkExact } from './schema-validation';
import { closeContractSchema, type SafeSchema, type SchemaValue } from './resource-contract';
import { snapshotPlainData } from './plain-data';
import { HttpError, type DataProvider } from './types';

const brand: unique symbol = Symbol('CommandContract');
export interface CommandContract<I extends TObject = TObject, O extends TSchema = TSchema> {
  readonly name: string;
  readonly [brand]: { input: I; output: O };
}
export type CommandInput<I extends TObject> = SchemaValue<I> extends infer Input extends Record<string, unknown> ? Input : Record<string, unknown>;
export type CommandOutput<O extends TSchema> = SchemaValue<O>;
interface Definition {
  key: string;
  url: string;
  method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  input: TSchema;
  response: TSchema;
}
const definitions = new WeakMap<CommandContract, Definition>();
let nextKey = 0;

function invalidContract(): never {
  throw new HttpError('Invalid command contract', 400, undefined, { code: 'INVALID_COMMAND_CONTRACT' });
}

function matches(schema: TSchema, value: unknown): boolean {
  return checkExact(schema, value);
}

function inputSnapshot(definition: Definition, input: unknown): Record<string, unknown> {
  try {
    const candidate = snapshotPlainData(input);
    if (typeof candidate === 'object' && candidate !== null && !Array.isArray(candidate) &&
        matches(definition.input, candidate)) return candidate;
  } catch {
    // Reflection and validation errors must not expose submitted values.
  }
  throw new HttpError('Invalid command input', 422, undefined, { code: 'INVALID_COMMAND_INPUT' });
}

function responseSnapshot(definition: Definition, response: unknown): { data: unknown } {
  try {
    const candidate = snapshotPlainData(response);
    if (typeof candidate === 'object' && candidate !== null && !Array.isArray(candidate) &&
        Object.hasOwn(candidate, 'data') && matches(definition.response, candidate)) {
      return { data: candidate['data'] };
    }
  } catch {
    // Never retain a rejected response or execute its getters/serialization hooks.
  }
  throw new HttpError('Invalid command response', 502, undefined, {
    code: 'INVALID_COMMAND_RESPONSE',
    details: { writeMayHaveSucceeded: definition.method !== 'get' },
  });
}

function executionError(error: unknown, writeMayHaveSucceeded: boolean): HttpError {
  let status = 502;
  try {
    if (typeof error === 'object' && error !== null) {
      const candidate: unknown = Object.getOwnPropertyDescriptor(error, 'statusCode')?.value;
      if (typeof candidate === 'number' && Number.isInteger(candidate) && candidate >= 400 && candidate <= 599) {
        status = candidate;
      }
    }
  } catch {
    // Error reflection failures are not authentication instructions.
  }
  return new HttpError('Command execution failed', status, undefined, {
    code: 'COMMAND_FAILED', details: { writeMayHaveSucceeded },
  });
}

export function defineCommand<I extends TObject, O extends TSchema>(
  name: string,
  definition: {
    url: string;
    method: Definition['method'];
    input: I & SafeSchema<I>;
    output: O & SafeSchema<O>;
  },
): CommandContract<I, O>;
export function defineCommand(name: string, definition: {
  url: string; method: Definition['method']; input: TObject; output: TSchema;
}): CommandContract {
  try {
    if (typeof name !== 'string' || !name.trim() || typeof definition !== 'object' || definition === null) {
      return invalidContract();
    }
    const fields = Object.getOwnPropertyDescriptors(definition);
    for (const key of ['url', 'method', 'input', 'output']) {
      const descriptor = fields[key];
      if (!descriptor || !('value' in descriptor)) return invalidContract();
    }
    const url: unknown = fields['url']?.value;
    const method: unknown = fields['method']?.value;
    const inputSchema: unknown = fields['input']?.value;
    const outputSchema: unknown = fields['output']?.value;
    if (typeof url !== 'string' || !url.trim() ||
        (method !== 'get' && method !== 'post' && method !== 'put' && method !== 'patch' && method !== 'delete') ||
        !TypeGuard.IsObject(inputSchema) || !TypeGuard.IsSchema(outputSchema)) {
      return invalidContract();
    }
    const input = closeContractSchema(inputSchema);
    const response = Type.Object({ data: closeContractSchema(outputSchema) }, { additionalProperties: false });
    const contract: CommandContract = Object.freeze({
      name, [brand]: Object.freeze({ input: inputSchema, output: outputSchema }),
    });
    definitions.set(contract, {
      key: JSON.stringify([++nextKey, name, url, method, input, response]),
      url, method, input, response,
    });
    return contract;
  } catch {
    return invalidContract();
  }
}

function definitionOf(command: CommandContract): Definition {
  const definition = definitions.get(command);
  if (!definition) throw new HttpError('Use defineCommand to create a command contract', 400, undefined, { code: 'INVALID_COMMAND_CONTRACT' });
  return definition;
}

export function commandDefinition(command: CommandContract): Readonly<Pick<Definition, 'key' | 'url' | 'method'>> {
  const { key, url, method } = definitionOf(command);
  return Object.freeze({ key, url, method });
}

export function parseCommandInput<I extends TObject, O extends TSchema>(
  command: CommandContract<I, O>, input: unknown,
): CommandInput<I>;
export function parseCommandInput(command: CommandContract, input: unknown): Record<string, unknown> {
  return inputSnapshot(definitionOf(command), input);
}

export function parseCommandResponse<I extends TObject, O extends TSchema>(
  command: CommandContract<I, O>, response: unknown,
): { data: CommandOutput<O> };
export function parseCommandResponse(command: CommandContract, response: unknown): { data: unknown } {
  return responseSnapshot(definitionOf(command), response);
}

/** Capture transport and checked input before a scheduler can yield to another scope. */
export function prepareCommand<I extends TObject, O extends TSchema>(
  provider: DataProvider,
  command: CommandContract<I, O>,
  input: NoInfer<CommandInput<I>>,
): { readonly input: CommandInput<I>; execute(signal?: AbortSignal): Promise<{ data: CommandOutput<O> }> };
export function prepareCommand(
  provider: DataProvider,
  command: CommandContract,
  input: Record<string, unknown>,
): { readonly input: Record<string, unknown>; execute(signal?: AbortSignal): Promise<{ data: unknown }> } {
  const definition = definitionOf(command);
  const payload = inputSnapshot(definition, input);
  let custom: DataProvider['custom'];
  try {
    custom = provider.custom;
  } catch (error) {
    throw executionError(error, false);
  }
  if (typeof custom !== 'function') {
    throw new HttpError('Provider does not support commands', 400, undefined, { code: 'COMMAND_NOT_SUPPORTED' });
  }
  const dispatch = custom;
  return Object.freeze({
    get input() { return inputSnapshot(definition, payload); },
    async execute(signal?: AbortSignal) {
      let response: unknown;
      try {
        const input = inputSnapshot(definition, payload);
        const pending: unknown = Reflect.apply(dispatch, provider, [{
          url: definition.url, method: definition.method,
          ...(definition.method === 'get' ? { query: input } : { payload: input }),
          ...(signal ? { signal } : {}),
        }]);
        response = await pending;
      } catch (error) {
        throw executionError(error, definition.method !== 'get');
      }
      return responseSnapshot(definition, response);
    },
  });
}

export async function executeCommand<I extends TObject, O extends TSchema>(
  provider: DataProvider,
  command: CommandContract<I, O>,
  input: NoInfer<CommandInput<I>>,
): Promise<{ data: CommandOutput<O> }> {
  return prepareCommand(provider, command, input).execute();
}
