import type {
  JsonValue,
  SurfaceSourceDataState,
  SurfaceWidget,
  SurfaceWidgetDataState,
} from './types.js';
import { decodedJsonPointerToken } from './json.js';

function readJsonPointer(root: JsonValue, pointer: string): JsonValue | undefined {
  if (pointer === '') return root;
  if (!pointer.startsWith('/')) return undefined;

  let current: JsonValue = root;
  for (const encodedToken of pointer.slice(1).split('/')) {
    const token = decodedJsonPointerToken(encodedToken);
    if (token === null || current === null || typeof current !== 'object') return undefined;
    if (Array.isArray(current)) {
      if (!/^(?:0|[1-9][0-9]*)$/u.test(token)) return undefined;
      const index = Number(token);
      if (index >= current.length) return undefined;
      current = current[index];
      continue;
    }
    const objectValue = current as { readonly [key: string]: JsonValue };
    if (!Object.hasOwn(objectValue, token)) return undefined;
    current = objectValue[token];
  }
  return current;
}

function missingPointerState(sourceId: string): SurfaceWidgetDataState {
  return {
    status: 'error',
    sourceId,
    error: {
      code: 'binding_pointer_not_found',
      sourceId,
      message: 'The validated binding pointer was not found in the provider result',
    },
  };
}

export function resolveSurfaceWidgetData(
  widget: SurfaceWidget,
  sourceStates: Readonly<Record<string, SurfaceSourceDataState>>,
): SurfaceWidgetDataState {
  if (!widget.binding) return { status: 'unbound' };

  const sourceId = widget.binding.sourceId;
  const sourceState = Object.hasOwn(sourceStates, sourceId) ? sourceStates[sourceId] : undefined;
  if (!sourceState) return { status: 'loading', sourceId };
  if (sourceState.status !== 'ready') return sourceState;

  const value = readJsonPointer(sourceState.value, widget.binding.pointer ?? '');
  if (value === undefined) return missingPointerState(sourceId);
  if (value === null || (Array.isArray(value) && value.length === 0)) {
    return { status: 'empty', sourceId };
  }
  return { status: 'ready', sourceId, value };
}
