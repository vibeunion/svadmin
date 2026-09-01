export type AnsiColor = 'black' | 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'white';

export interface AnsiSegment {
  text: string;
  foreground?: AnsiColor;
  background?: AnsiColor;
  bold?: boolean;
  dim?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
}

type AnsiStyle = Omit<AnsiSegment, 'text'>;

const ANSI_ESCAPE = String.fromCharCode(27);
const ANSI_SGR_PATTERN = new RegExp(`${ANSI_ESCAPE}\\[([0-9;]*)m`, 'g');
const ANSI_COLORS: readonly AnsiColor[] = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];

function resetStyle(style: AnsiStyle): void {
  for (const key of Object.keys(style) as Array<keyof AnsiStyle>) style[key] = undefined;
}

function setColor(style: AnsiStyle, target: 'foreground' | 'background', code: number): void {
  const offset = target === 'foreground' ? (code >= 90 ? 90 : 30) : (code >= 100 ? 100 : 40);
  style[target] = ANSI_COLORS[code - offset];
}

function applyExtendedColor(style: AnsiStyle, target: 'foreground' | 'background', codes: number[], index: number): number {
  if (codes[index + 1] === 5) {
    const colorIndex = codes[index + 2];
    if (colorIndex !== undefined && colorIndex < ANSI_COLORS.length) style[target] = ANSI_COLORS[colorIndex];
    return index + 2;
  }
  return codes[index + 1] === 2 ? index + 4 : index;
}

function applyCode(style: AnsiStyle, codes: number[], index: number): number {
  const code = codes[index] ?? 0;
  if (code === 0) resetStyle(style);
  else if (code === 1) style.bold = true;
  else if (code === 2) style.dim = true;
  else if (code === 3) style.italic = true;
  else if (code === 4) style.underline = true;
  else if (code === 9) style.strikethrough = true;
  else if (code === 22) { style.bold = false; style.dim = false; }
  else if (code === 23) style.italic = false;
  else if (code === 24) style.underline = false;
  else if (code === 29) style.strikethrough = false;
  else if ((code >= 30 && code <= 37) || (code >= 90 && code <= 97)) setColor(style, 'foreground', code);
  else if (code === 39) style.foreground = undefined;
  else if ((code >= 40 && code <= 47) || (code >= 100 && code <= 107)) setColor(style, 'background', code);
  else if (code === 49) style.background = undefined;
  else if (code === 38) return applyExtendedColor(style, 'foreground', codes, index);
  else if (code === 48) return applyExtendedColor(style, 'background', codes, index);
  return index;
}

export function parseAnsi(text: string): AnsiSegment[] {
  const segments: AnsiSegment[] = [];
  const style: AnsiStyle = {};
  let cursor = 0;
  let match: RegExpExecArray | null;

  ANSI_SGR_PATTERN.lastIndex = 0;
  while ((match = ANSI_SGR_PATTERN.exec(text))) {
    if (match.index > cursor) segments.push({ text: text.slice(cursor, match.index), ...style });
    const codes = match[1] ? match[1].split(';').map(Number) : [0];
    for (let index = 0; index < codes.length; index += 1) index = applyCode(style, codes, index);
    cursor = ANSI_SGR_PATTERN.lastIndex;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), ...style });
  return segments.length ? segments : [{ text: '' }];
}
