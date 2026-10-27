import { SURFACE_AGENT_LIMITS } from './agent-contract.js';

/** 聊天回答里标记界面提案的围栏标签，例如 ```surface。 */
export const SURFACE_AGENT_FENCE_TAG = 'surface';

/** 聊天回答切分后的片段：普通正文，或一段待校验的界面提案 JSON。 */
export type SurfaceAgentTextSegment =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'proposal'; readonly json: string; readonly complete: boolean };

export interface SurfaceAgentTextOptions {
  /** 生成尚未结束时，未闭合的 surface 围栏作为未完成提案返回。 */
  readonly streaming?: boolean;
}

interface OpenFence {
  readonly marker: string;
  readonly tag: string;
  readonly line: string;
}

const OPEN_FENCE = /^ {0,3}(`{3,}|~{3,})[ \t]*([^\s`]*)[^`]*$/u;
const CLOSE_FENCE = /^ {0,3}(`{3,}|~{3,})[ \t]*$/u;

function openingFence(line: string): OpenFence | undefined {
  const match = OPEN_FENCE.exec(line);
  if (!match?.[1]) return undefined;
  return { marker: match[1], tag: (match[2] ?? '').toLowerCase(), line };
}

function closesFence(line: string, fence: OpenFence): boolean {
  const match = CLOSE_FENCE.exec(line);
  if (!match?.[1]) return false;
  return match[1][0] === fence.marker[0] && match[1].length >= fence.marker.length;
}

/**
 * 把聊天回答切成正文与界面提案，供宿主内联渲染。
 *
 * 只识别 `surface` 标签的围栏；其它围栏（例如 json 代码块）原样留在正文里，
 * 避免把普通代码误当成界面提案。片段内容不做校验，宿主仍需按 catalog 和
 * policy 调用 `parseSurfaceAgentResponse()` 或 `parseSurfaceAgentProposal()`。
 *
 * @param text 模型输出的完整或增量文本。
 * @param options 生成中时传入 `streaming: true`，未闭合围栏按未完成提案返回。
 * @returns 按出现顺序排列的片段；正文与提案互不重叠，围栏行不出现在正文里。
 */
export function splitSurfaceAgentText(
  text: string,
  options: SurfaceAgentTextOptions = {},
): readonly SurfaceAgentTextSegment[] {
  if (typeof text !== 'string' || text.length === 0) return [];
  // 超长输入按上限截断扫描，其余内容作为正文交还宿主，避免无界遍历。
  const bounded = text.slice(0, SURFACE_AGENT_LIMITS.maxInputCharacters);
  const overflow = text.slice(bounded.length);
  const segments: SurfaceAgentTextSegment[] = [];
  let prose: string[] = [];
  let fence: OpenFence | undefined;
  let proposal: string[] | undefined;

  const flushProse = (): void => {
    const value = prose.join('\n');
    prose = [];
    if (value === '') return;
    segments.push({ kind: 'text', text: value });
  };
  const flushProposal = (complete: boolean): void => {
    if (proposal === undefined || fence === undefined) return;
    flushProse();
    segments.push({ kind: 'proposal', json: proposal.join('\n').trim(), complete });
    proposal = undefined;
    fence = undefined;
  };

  for (const line of bounded.split(/\r?\n/u)) {
    if (proposal !== undefined && fence !== undefined) {
      if (closesFence(line, fence)) flushProposal(true);
      else proposal.push(line);
      continue;
    }
    if (fence !== undefined) {
      // 其它围栏内的内容原样保留，围栏内的 surface 字样不是提案。
      prose.push(line);
      if (closesFence(line, fence)) fence = undefined;
      continue;
    }
    const open = openingFence(line);
    if (open === undefined) {
      prose.push(line);
      continue;
    }
    fence = open;
    if (open.tag === SURFACE_AGENT_FENCE_TAG) proposal = [];
    else prose.push(line);
  }

  if (proposal !== undefined && fence !== undefined) {
    if (options.streaming === true) flushProposal(false);
    else {
      // 非流式输出里未闭合的围栏是残缺内容，交还正文而不是静默丢弃。
      prose.push(fence.line, ...proposal);
      fence = undefined;
      proposal = undefined;
    }
  }
  flushProse();
  if (overflow.length > 0) segments.push({ kind: 'text', text: overflow });
  return segments;
}