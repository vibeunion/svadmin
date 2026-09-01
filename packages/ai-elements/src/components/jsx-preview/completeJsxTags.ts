const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
  'param', 'source', 'track', 'wbr',
]);

interface ScannedTag {
  end: number;
  name: string;
  type: 'opening' | 'closing' | 'self-closing';
}

export function completeJsxTags(source: string): string {
  const stack: string[] = [];
  let index = 0;
  let visibleEnd = source.length;

  while (index < source.length) {
    if (source[index] === '{') {
      index = skipExpression(source, index);
      continue;
    }
    if (source[index] !== '<') {
      index += 1;
      continue;
    }

    const tag = scanTag(source, index);
    if (!tag) {
      visibleEnd = index;
      break;
    }
    updateStack(stack, tag);
    index = tag.end;
  }

  const closingTags = [...stack].reverse().map((name) => name ? `</${name}>` : '</>').join('');
  return `${source.slice(0, visibleEnd)}${closingTags}`;
}

function scanTag(source: string, start: number): ScannedTag | null {
  let index = start + 1;
  let quote = '';
  while (index < source.length) {
    const character = source[index] ?? '';
    if (quote) {
      if (character === '\\') index += 1;
      else if (character === quote) quote = '';
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === '>') {
      return describeTag(source.slice(start, index + 1), index + 1);
    }
    index += 1;
  }
  return null;
}

function describeTag(tag: string, end: number): ScannedTag {
  if (tag === '<>') return { end, name: '', type: 'opening' };
  if (tag === '</>') return { end, name: '', type: 'closing' };

  const match = /^<\/?\s*([A-Za-z][A-Za-z0-9_$.-]*)/.exec(tag);
  if (!match) return { end, name: '', type: 'self-closing' };
  const name = match[1] ?? '';
  if (tag.startsWith('</')) return { end, name, type: 'closing' };
  if (/\/\s*>$/.test(tag) || VOID_TAGS.has(name.toLowerCase())) {
    return { end, name, type: 'self-closing' };
  }
  return { end, name, type: 'opening' };
}

function updateStack(stack: string[], tag: ScannedTag): void {
  if (tag.type === 'opening') {
    stack.push(tag.name);
    return;
  }
  if (tag.type === 'closing' && stack.at(-1) === tag.name) stack.pop();
}

function skipExpression(source: string, start: number): number {
  let index = start + 1;
  let depth = 0;
  let quote = '';
  while (index < source.length) {
    const character = source[index] ?? '';
    if (quote) {
      if (character === '\\') index += 1;
      else if (character === quote) quote = '';
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === '{') {
      depth += 1;
    } else if (character === '}') {
      if (depth === 0) return index + 1;
      depth -= 1;
    }
    index += 1;
  }
  return source.length;
}

export function validateJsx(source: string): Error | null {
  const stack: string[] = [];
  let index = 0;
  while (index < source.length) {
    if (source[index] === '{') {
      index = skipExpression(source, index);
      continue;
    }
    if (source[index] !== '<') {
      index += 1;
      continue;
    }
    const tag = scanTag(source, index);
    if (!tag) return new Error('JSX contains an incomplete tag');
    if (tag.type === 'opening') stack.push(tag.name);
    else if (tag.type === 'closing' && stack.pop() !== tag.name) {
      return new Error(`Mismatched JSX closing tag: ${tag.name}`);
    }
    index = tag.end;
  }
  return stack.length > 0 ? new Error(`Unclosed JSX tag: ${stack.at(-1) || 'fragment'}`) : null;
}
