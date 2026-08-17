import { describe, expect, it } from 'vitest';
import {
  decodeFlowPaletteItem,
  encodeFlowPaletteItem,
  FLOW_PALETTE_MIME_TYPE,
  readFlowPaletteItem,
} from './flow-dnd.js';

const template = {
  id: 'review',
  type: 'default',
  label: 'Review',
  description: 'A manual review step',
  data: { kind: 'review' },
};

describe('flow palette drag data', () => {
  it('round-trips a serializable palette template', () => {
    expect(decodeFlowPaletteItem(encodeFlowPaletteItem(template))).toEqual(template);
  });

  it('rejects malformed and incomplete drag payloads', () => {
    expect(decodeFlowPaletteItem('{')).toBeNull();
    expect(decodeFlowPaletteItem(JSON.stringify({ id: 'review', type: 'default', label: 'Review' }))).toBeNull();
    expect(decodeFlowPaletteItem(JSON.stringify({ id: 'review', type: 'default', label: 'Review', data: [] }))).toBeNull();
  });

  it('reads only the package-specific browser drag MIME type', () => {
    const dataTransfer = {
      types: [FLOW_PALETTE_MIME_TYPE],
      getData: (type: string) => (type === FLOW_PALETTE_MIME_TYPE ? encodeFlowPaletteItem(template) : ''),
    } as unknown as DataTransfer;

    expect(readFlowPaletteItem(dataTransfer)).toEqual(template);
    expect(readFlowPaletteItem({ types: ['text/plain'], getData: () => encodeFlowPaletteItem(template) } as unknown as DataTransfer)).toBeNull();
  });
});
