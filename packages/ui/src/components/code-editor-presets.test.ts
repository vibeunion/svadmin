import { describe, expect, it } from 'vitest';
import { javascript, json, markdown, sql } from './code-editor-presets.js';

describe('code editor language presets', () => {
  it('exports CodeMirror language support for each preset', () => {
    expect(json().extension).toBeDefined();
    expect(javascript().language).toBeDefined();
    expect(javascript({ typescript: true }).extension).toBeDefined();
    expect(sql().language).toBeDefined();
    expect(markdown().language).toBeDefined();
  });
});