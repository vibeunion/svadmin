import type { FlowPaletteItem } from './types.js';

/** The private browser drag payload shared by `FlowPalette` and `FlowCanvas`. */
export const FLOW_PALETTE_MIME_TYPE = 'application/x-svadmin-flow-palette-item';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Serializes a palette template for a browser `DataTransfer`. */
export function encodeFlowPaletteItem(paletteItem: FlowPaletteItem): string {
  return JSON.stringify(paletteItem);
}

/**
 * Decodes only the serializable palette shape that this package understands.
 * The returned value is UI state, not a server-side validation boundary.
 */
export function decodeFlowPaletteItem(serializedItem: string): FlowPaletteItem | null {
  try {
    const parsed: unknown = JSON.parse(serializedItem);
    if (!isRecord(parsed)) return null;

    const { id, type, label, description, data: nodeData, disabled } = parsed;
    if (typeof id !== 'string' || typeof type !== 'string' || typeof label !== 'string' || !isRecord(nodeData)) {
      return null;
    }
    if (description !== undefined && typeof description !== 'string') return null;
    if (disabled !== undefined && typeof disabled !== 'boolean') return null;

    return {
      id,
      type,
      label,
      ...(description === undefined ? {} : { description }),
      data: nodeData,
      ...(disabled === undefined ? {} : { disabled }),
    };
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
}

/** Reads a valid svadmin flow payload from a browser drag operation. */
export function readFlowPaletteItem(browserTransfer: DataTransfer | null): FlowPaletteItem | null {
  if (!browserTransfer || !Array.from(browserTransfer.types).includes(FLOW_PALETTE_MIME_TYPE)) return null;
  return decodeFlowPaletteItem(browserTransfer.getData(FLOW_PALETTE_MIME_TYPE));
}
