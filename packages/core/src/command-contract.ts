import { Type, type TObject, type TSchema } from 'typebox';
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
/** The only provider diagnostic fields that may cross the command boundary. */
export interface CommandErrorDiagnostic {
  readonly code: string;
  readonly message: string;
}
/** A fixed business error code to UI message mapping declared at registration. */
export type CommandErrorDiagnostics = Readonly<Record<string, string>>;
/** Command diagnostics are declarative, static and limited to safe business codes. */
export interface CommandDiagnostics {
  readonly safe: CommandErrorDiagnostics;
}
interface Definition {
  key: string;
  url: string;
  method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  input: TSchema;
  response: TSchema;
  diagnostics: CommandErrorDiagnostics | undefined;
}
const definitions = new WeakMap<CommandContract, Definition>();
let nextKey = 0;

function invalidContract(): never {
  throw new HttpError('Invalid command contract', 400, undefined, { code: 'INVALID_COMMAND_CONTRACT' });
}

const diagnosticCode = /^[A-Z][A-Z0-9_]{1,63}$/;

/** 诊断文案长度 1–200，且拒绝 C0 控制符与 DEL。按码元判断，避免 no-control-regex。 */
function safeDiagnosticMessage(message: string): boolean {
  if (message.length < 1 || message.length > 200) return false;
  for (let index = 0; index < message.length; index += 1) {
    const code = message.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) return false;
  }
  return true;
}

function ownData(target: object, key: string): unknown {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(target, key);
    return descriptor && 'value' in descriptor ? descriptor.value : undefined;
  } catch {
    return undefined;
  }
}

function diagnosticMapping(value: unknown): CommandErrorDiagnostics {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return invalidContract();
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return invalidContract();
  if (Object.getOwnPropertySymbols(value).length) return invalidContract();
  const entries: [string, string][] = [];
  for (const [code, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    const message: unknown = 'value' in descriptor ? descriptor.value : undefined;
    if (!descriptor.enumerable || !('value' in descriptor) || !diagnosticCode.test(code) ||
        typeof message !== 'string' || !safeDiagnosticMessage(message) || message !== message.trim()) {
      return invalidContract();
    }
    entries.push([code, message]);
  }
  if (!entries.length) return invalidContract();
  entries.sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
  return Object.freeze(Object.fromEntries(entries));
}

function parseDiagnostics(value: unknown): CommandErrorDiagnostics | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return invalidContract();
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return invalidContract();
  const keys = Reflect.ownKeys(value);
  if (keys.length !== 1 || keys[0] !== 'safe') return invalidContract();
  const descriptor = Object.getOwnPropertyDescriptor(value, 'safe');
  if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) return invalidContract();
  return diagnosticMapping(descriptor.value);
}

/** Read only a provider-owned code and resolve it against the declared static mapping. */
export function safeCommandDiagnostic(
  cause: unknown,
  diagnostics: CommandErrorDiagnostics | undefined,
): CommandErrorDiagnostic | undefined {
  if (!diagnostics || typeof cause !== 'object' || cause === null) return undefined;
  const code = ownData(cause, 'code');
  if (typeof code !== 'string' || !Object.hasOwn(diagnostics, code)) return undefined;
  const message = diagnostics[code];
  return typeof message === 'string' ? Object.freeze({ code, message }) : undefined;
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

function executionError(error: unknown, writeMayHaveSucceeded: boolean,
  diagnostics: CommandErrorDiagnostics | undefined): HttpError {
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
  const diagnostic = safeCommandDiagnostic(error, diagnostics);
  return new HttpError(diagnostic?.message ?? 'Command execution failed', status, undefined, {
    code: diagnostic?.code ?? 'COMMAND_FAILED', details: { writeMayHaveSucceeded },
  });
}

export function defineCommand<I extends TObject, O extends TSchema>(
  name: string,
  definition: {
    url: string;
    method: Definition['method'];
    input: I & SafeSchema<I>;
    output: O & SafeSchema<O>;
    diagnostics?: CommandDiagnostics;
  },
): CommandContract<I, O>;
export function defineCommand(name: string, definition: {
  url: string; method: Definition['method']; input: TObject; output: TSchema;
  diagnostics?: CommandDiagnostics;
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
    const diagnosticsField = fields['diagnostics'];
    if (diagnosticsField && !('value' in diagnosticsField)) return invalidContract();
    const diagnostics = parseDiagnostics(diagnosticsField?.value);
    if (typeof url !== 'string' || !url.trim() ||
        (method !== 'get' && method !== 'post' && method !== 'put' && method !== 'patch' && method !== 'delete') ||
        !Type.IsObject(inputSchema) || !Type.IsSchema(outputSchema)) {
      return invalidContract();
    }
    const input = closeContractSchema(inputSchema);
    const response = Type.Object({ data: closeContractSchema(outputSchema) }, { additionalProperties: false });
    const contract: CommandContract = Object.freeze({
      name, [brand]: Object.freeze({ input: inputSchema, output: outputSchema }),
    });
    definitions.set(contract, {
      key: JSON.stringify([++nextKey, name, url, method, input, response,
        diagnostics ? Object.entries(diagnostics) : null]),
      url, method, input, response, diagnostics,
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

export function commandDefinition(
  command: CommandContract,
): Readonly<Pick<Definition, 'key' | 'url' | 'method' | 'diagnostics'>> {
  const { key, url, method, diagnostics } = definitionOf(command);
  return Object.freeze({ key, url, method, diagnostics });
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
): { readonly input: CommandInput<I>; execute(): Promise<{ data: CommandOutput<O> }> };
export function prepareCommand(
  provider: DataProvider,
  command: CommandContract,
  input: Record<string, unknown>,
): { readonly input: Record<string, unknown>; execute(): Promise<{ data: unknown }> } {
  const definition = definitionOf(command);
  const payload = inputSnapshot(definition, input);
  let custom: DataProvider['custom'];
  try {
    custom = provider.custom;
  } catch (error) {
    throw executionError(error, false, definition.diagnostics);
  }
  if (typeof custom !== 'function') {
    throw new HttpError('Provider does not support commands', 400, undefined, { code: 'COMMAND_NOT_SUPPORTED' });
  }
  const dispatch = custom;
  return Object.freeze({
    get input() { return inputSnapshot(definition, payload); },
    async execute() {
      let response: unknown;
      try {
        const input = inputSnapshot(definition, payload);
        const pending: unknown = Reflect.apply(dispatch, provider, [{
          url: definition.url, method: definition.method,
          ...(definition.method === 'get' ? { query: input } : { payload: input }),
        }]);
        response = await pending;
      } catch (error) {
        throw executionError(error, definition.method !== 'get', definition.diagnostics);
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
