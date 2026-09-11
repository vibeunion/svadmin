import type { FlowPaletteItem } from './types.js';
import { parsePaletteRecord } from './palette-schema.js';

/** The private browser drag payload shared by `FlowPalette` and `FlowCanvas`. */
export const FLOW_PALETTE_MIME_TYPE = 'application/x-svadmin-flow-palette-item';

/** Validates and serializes plain palette data for a browser `DataTransfer`. */
export function encodeFlowPaletteItem(paletteItem: unknown): string {
  const validated = parsePaletteRecord(paletteItem);
  if (!validated) throw new TypeError('Invalid flow palette item');
  const serialized: unknown = JSON.stringify(validated);
  if (typeof serialized !== 'string') throw new TypeError('Invalid flow palette item');
  return serialized;
}

/**
 * Decodes only the serializable palette shape that this package understands.
 * This validates the transport shape, not host-specific business rules.
 */
export function decodeFlowPaletteItem(serializedItem: string): FlowPaletteItem | null {
  try {
    const parsed: unknown = JSON.parse(serializedItem);
    return parsePaletteRecord(parsed);
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
