import { describe, expect, test } from 'vitest';
import { Type } from 'typebox';
import {
  SURFACE_AGENT_FENCE_TAG,
  splitSurfaceAgentText,
} from './agent-text.js';
import {
  buildSurfaceAgentMessages,
  parseSurfaceAgentResponse,
} from './agent.js';
import { SURFACE_AGENT_LIMITS } from './agent-contract.js';
import type { SurfaceCatalog } from './types.js';

const catalog = { version: 'chat/v1', widgets: [{
  type: 'note', dataKind: 'none', description: 'A short note',
  propsSchema: Type.Object({ text: Type.String({ minLength: 1 }) }, { additionalProperties: false }),
}] } satisfies SurfaceCatalog;
const policy = { resources: {} };
const proposal = {
  schemaVersion: 'surface-agent/v2', action: 'propose', spec: {
    schemaVersion: 'surface/v1', catalogVersion: catalog.version, surfaceId: 'notes', title: 'Notes',
    layout: { type: 'grid', columns: 12 }, dataSources: [],
    widgets: [{ id: 'note', type: 'note', props: { text: 'Ready' } }],
  },
};
const json = JSON.stringify(proposal);
const fence = (body: string, tag = SURFACE_AGENT_FENCE_TAG) => `\`\`\`${tag}\n${body}\n\`\`\``;

describe('chat surface text segmentation', () => {
  test('splits prose from a complete proposal fence', () => {
    const segments = splitSurfaceAgentText(`先看结论：\n\n${fence(json)}\n\n还可以继续调整。`);
    expect(segments).toHaveLength(3);
    expect(segments[0]).toEqual({ kind: 'text', text: '先看结论：\n' });
    expect(segments[1]).toEqual({ kind: 'proposal', json, complete: true });
    expect(segments[2]).toEqual({ kind: 'text', text: '\n还可以继续调整。' });
  });

  test('keeps each fence payload parseable by the response parser', () => {
    const [segment] = splitSurfaceAgentText(fence(json, 'surface')).slice(0, 1);
    expect(segment?.kind).toBe('proposal');
    if (segment?.kind !== 'proposal') throw new Error('expected a proposal segment');
    expect(parseSurfaceAgentResponse(segment.json, catalog, policy).ok).toBe(true);
  });

  test('leaves other fences in prose so ordinary code blocks are not proposals', () => {
    const text = `用法如下：\n\n\`\`\`json\n${json}\n\`\`\`\n\n${fence(json)}`;
    const segments = splitSurfaceAgentText(text);
    expect(segments.map((segment) => segment.kind)).toEqual(['text', 'proposal']);
    expect(segments[0]).toMatchObject({ kind: 'text' });
    if (segments[0]?.kind !== 'text') throw new Error('expected text');
    expect(segments[0].text).toContain('```json');
    expect(segments[0].text).not.toContain('```' + SURFACE_AGENT_FENCE_TAG);
  });

  test('ignores surface fences nested inside another code block', () => {
    const text = `\`\`\`md\n${fence(json)}\n\`\`\`\n尾部说明`;
    const segments = splitSurfaceAgentText(text);
    expect(segments).toHaveLength(1);
    expect(segments[0]).toMatchObject({ kind: 'text' });
  });

  test('reports an unterminated fence as incomplete only while streaming', () => {
    const partial = `准备中\n\`\`\`surface\n{"schemaVersion":"surface-agent/v2"`;
    expect(splitSurfaceAgentText(partial, { streaming: true })).toEqual([
      { kind: 'text', text: '准备中' },
      { kind: 'proposal', json: '{"schemaVersion":"surface-agent/v2"', complete: false },
    ]);
    const settled = splitSurfaceAgentText(partial);
    expect(settled).toHaveLength(1);
    expect(settled[0]).toMatchObject({ kind: 'text' });
    if (settled[0]?.kind !== 'text') throw new Error('expected text');
    expect(settled[0].text).toContain('```surface');
    expect(settled[0].text).toContain('"schemaVersion"');
  });

  test('preserves multiple proposals and the prose between them', () => {
    const segments = splitSurfaceAgentText(`甲\n${fence(json)}\n乙\n${fence('{}')}\n丙`);
    expect(segments.map((segment) => segment.kind)).toEqual(['text', 'proposal', 'text', 'proposal', 'text']);
  });

  test('supports tilde fences, closing fences longer than the opener and CRLF text', () => {
    const crlf = `说明\r\n~~~surface\r\n${json}\r\n~~~~\r\n`;
    const segments = splitSurfaceAgentText(crlf);
    expect(segments.map((segment) => segment.kind)).toEqual(['text', 'proposal']);
    expect(segments[1]).toMatchObject({ kind: 'proposal', complete: true });
    if (segments[1]?.kind !== 'proposal') throw new Error('expected proposal');
    expect(segments[1].json).toBe(json);
  });

  test('returns no segments for empty input and fails closed for oversized input', () => {
    expect(splitSurfaceAgentText('')).toEqual([]);
    const oversized = `${fence(json)}\n${'x'.repeat(SURFACE_AGENT_LIMITS.maxInputCharacters)}`;
    const segments = splitSurfaceAgentText(oversized);
    expect(segments[0]).toMatchObject({ kind: 'proposal', complete: true });
    expect(segments.at(-1)).toMatchObject({ kind: 'text' });
  });

  test('chat presentation keeps the single-envelope default intact', () => {
    const chat = buildSurfaceAgentMessages('Show a note', catalog, policy, { presentation: 'chat' });
    expect(chat.map((message) => message.role)).toEqual(['system', 'user']);
    expect(chat[0]?.content).toContain('```surface');
    expect(chat[0]?.content).toContain('"required":["text"]');
    expect(chat[0]?.content).not.toContain('without markdown or prose');
    const envelope = buildSurfaceAgentMessages('Show a note', catalog, policy);
    expect(envelope[0]?.content).toContain('without markdown or prose');
    expect(envelope[0]?.content).not.toContain('```surface');
  });
});