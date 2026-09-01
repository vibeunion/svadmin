import type { TObject } from '@sinclair/typebox';
import type { Component, Snippet } from 'svelte';
import {
  decodeGeneratedObjectProps,
  type GeneratedComponentSchemaProps,
} from '../../generated-components.js';

export interface JSXPreviewComponentProps {
  children?: Snippet;
}

export type JSXPreviewSchemaProps<Schema extends TObject> =
  GeneratedComponentSchemaProps<Schema> & JSXPreviewComponentProps;

type RuntimeJSXPreviewComponentProps = Record<string, unknown> & JSXPreviewComponentProps;

export interface JSXPreviewSvelteComponentDefinition<Schema extends TObject = TObject> {
  readonly component: Component<JSXPreviewSchemaProps<Schema>>;
  readonly schema: Schema;
}

export interface JSXPreviewSnippetDefinition<Schema extends TObject = TObject> {
  readonly snippet: Snippet<[JSXPreviewSchemaProps<Schema>]>;
  readonly schema: Schema;
}

export type JSXPreviewComponentDefinition =
  | { readonly component: Component<never>; readonly schema: TObject }
  | { readonly snippet: Snippet<[never]>; readonly schema: TObject };

export type JSXPreviewComponents = Record<string, JSXPreviewComponentDefinition>;
export type JSXPreviewBindings = Record<string, unknown>;

export type JSXPreviewNode = JSXPreviewTextNode | JSXPreviewElementNode;

export interface JSXPreviewTextNode {
  type: 'text';
  value: string;
}

export interface JSXPreviewElementNode {
  type: 'element';
  name: string;
  target: JSXPreviewElementTarget;
  props: Record<string, unknown>;
  children: JSXPreviewNode[];
}

export type JSXPreviewElementTarget =
  | { type: 'intrinsic'; tag: keyof HTMLElementTagNameMap }
  | { type: 'component'; component: Component<RuntimeJSXPreviewComponentProps>; schema: TObject }
  | { type: 'snippet'; snippet: Snippet<[RuntimeJSXPreviewComponentProps]>; schema: TObject };

export type JSXPreviewParseResult =
  | { ok: true; nodes: JSXPreviewNode[] }
  | { ok: false; error: Error };

interface ParsedAttribute {
  name: string;
  value: unknown;
  expression: boolean;
}

export interface JSXPreviewParserOptions {
  bindings?: JSXPreviewBindings;
  components?: JSXPreviewComponents;
}

const INTRINSIC_TAGS = new Set<keyof HTMLElementTagNameMap>([
  'a', 'abbr', 'address', 'article', 'aside', 'b', 'blockquote', 'br', 'button',
  'caption', 'cite', 'code', 'col', 'colgroup', 'data', 'datalist', 'dd', 'del',
  'details', 'dfn', 'dialog', 'div', 'dl', 'dt', 'em', 'fieldset', 'figcaption',
  'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr',
  'i', 'img', 'input', 'ins', 'kbd', 'label', 'legend', 'li', 'main', 'mark',
  'menu', 'meter', 'nav', 'ol', 'optgroup', 'option', 'output', 'p', 'picture',
  'pre', 'progress', 'q', 's', 'samp', 'section', 'select', 'small', 'source',
  'span', 'strong', 'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'textarea',
  'tfoot', 'th', 'thead', 'time', 'tr', 'u', 'ul', 'var', 'wbr',
]);

const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
  'param', 'source', 'track', 'wbr',
]);

const BLOCKED_ATTRIBUTE_NAMES = new Set([
  '__proto__', 'autofocus', 'children', 'command', 'commandfor', 'constructor',
  'dangerouslysetinnerhtml', 'formaction', 'innerhtml', 'outerhtml',
  'popovertarget', 'popovertargetaction', 'prototype', 'srcdoc', 'style',
]);

// Generated JSX must not associate controls with a host form or target host labels.
const NEUTRALIZED_FORM_ATTRIBUTE_NAMES = new Set([
  'form', 'formenctype', 'formmethod', 'formnovalidate', 'formtarget', 'name',
  'for', 'htmlfor',
]);

const URL_ATTRIBUTE_NAMES = new Set([
  'action', 'cite', 'href', 'poster', 'src',
]);

const ATTRIBUTE_ALIASES: Record<string, string> = {
  autoComplete: 'autocomplete',
  autoPlay: 'autoplay',
  className: 'class',
  colSpan: 'colspan',
  dateTime: 'datetime',
  htmlFor: 'for',
  maxLength: 'maxlength',
  minLength: 'minlength',
  readOnly: 'readonly',
  rowSpan: 'rowspan',
  tabIndex: 'tabindex',
};

const EVENT_ALIASES: Record<string, string> = {
  onDoubleClick: 'ondblclick',
};

const ALLOWED_EVENTS = new Set([
  'onblur', 'onchange', 'onclick', 'ondblclick', 'onfocus', 'oninput', 'onkeydown',
  'onkeypress', 'onkeyup', 'onmousedown', 'onmouseenter', 'onmouseleave',
  'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'onpointercancel',
  'onpointerdown', 'onpointerenter', 'onpointerleave', 'onpointermove',
  'onpointerup', 'onsubmit', 'ontouchcancel', 'ontouchend', 'ontouchmove',
  'ontouchstart',
]);

const FORBIDDEN_PATH_PARTS = new Set(['__proto__', 'constructor', 'prototype']);
const NAME_PATTERN = /[A-Za-z_$][A-Za-z0-9_$.-]*/y;
const ATTRIBUTE_PATTERN = /[A-Za-z_$][A-Za-z0-9_$:.-]*/y;

export function defineJSXPreviewComponent<const Schema extends TObject>(
  definition: JSXPreviewSvelteComponentDefinition<Schema>,
): JSXPreviewSvelteComponentDefinition<Schema> {
  return definition;
}

export function defineJSXPreviewSnippet<const Schema extends TObject>(
  definition: JSXPreviewSnippetDefinition<Schema>,
): JSXPreviewSnippetDefinition<Schema> {
  return definition;
}

export function parseJSXPreview(
  source: string,
  options: JSXPreviewParserOptions = {},
): JSXPreviewParseResult {
  try {
    return {
      ok: true,
      nodes: new JSXParser(source, {
        bindings: options.bindings ?? {},
        components: options.components ?? {},
      }).parse(),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

class JSXParser {
  private index = 0;

  constructor(
    private readonly source: string,
    private readonly options: Required<JSXPreviewParserOptions>,
  ) {}

  parse(): JSXPreviewNode[] {
    const nodes = this.parseChildren();
    if (this.index !== this.source.length) this.fail('Unexpected trailing JSX');
    return nodes;
  }

  private parseChildren(closingName?: string): JSXPreviewNode[] {
    const nodes: JSXPreviewNode[] = [];

    while (this.index < this.source.length) {
      if (closingName !== undefined && this.isClosingTag(closingName)) break;
      if (this.source.startsWith('</', this.index)) this.fail('Unexpected closing tag');

      const character = this.source[this.index];
      if (character === '<') {
        nodes.push(...this.parseElement());
      } else if (character === '{') {
        this.appendExpressionChildren(nodes, this.parseExpressionContainer());
      } else {
        const text = this.parseText();
        if (text) nodes.push({ type: 'text', value: text });
      }
    }

    return nodes;
  }

  private parseElement(): JSXPreviewNode[] {
    if (this.source.startsWith('<>', this.index)) {
      this.index += 2;
      const children = this.parseChildren('');
      this.consume('</>');
      return children;
    }

    this.consume('<');
    const name = this.readName(NAME_PATTERN, 'element name');
    const target = this.resolveTarget(name);
    const attributes: ParsedAttribute[] = [];
    let selfClosing = false;

    while (this.index < this.source.length) {
      this.skipWhitespace();
      if (this.source.startsWith('/>', this.index)) {
        this.index += 2;
        selfClosing = true;
        break;
      }
      if (this.source[this.index] === '>') {
        this.index += 1;
        break;
      }
      if (this.source.startsWith('{...', this.index)) {
        this.fail('JSX spread attributes are not supported');
      }
      attributes.push(this.parseAttribute());
    }

    if (this.index > this.source.length) this.fail(`Unclosed opening tag: ${name}`);
    const props = decodeTargetProps(target, sanitizeProps(target, attributes));
    const intrinsicVoid = target.type === 'intrinsic' && VOID_TAGS.has(target.tag);

    if (selfClosing || intrinsicVoid) {
      return [{ type: 'element', name, target, props, children: [] }];
    }

    const children = this.parseChildren(name);
    if (!this.isClosingTag(name)) this.fail(`Unclosed JSX tag: ${name}`);
    this.consume(`</${name}`);
    this.skipWhitespace();
    this.consume('>');
    return [{ type: 'element', name, target, props, children }];
  }

  private parseAttribute(): ParsedAttribute {
    const name = this.readName(ATTRIBUTE_PATTERN, 'attribute name');
    this.skipWhitespace();
    if (this.source[this.index] !== '=') return { name, value: true, expression: false };

    this.index += 1;
    this.skipWhitespace();
    const quote = this.source[this.index];
    if (quote === '"' || quote === "'") {
      this.index += 1;
      const start = this.index;
      while (this.index < this.source.length && this.source[this.index] !== quote) this.index += 1;
      if (this.index >= this.source.length) this.fail(`Unclosed quoted attribute: ${name}`);
      const value = decodeEntities(this.source.slice(start, this.index));
      this.index += 1;
      return { name, value, expression: false };
    }
    if (quote === '{') {
      return { name, value: this.parseExpressionContainer(), expression: true };
    }

    this.fail(`Attribute ${name} must use a quoted or expression value`);
  }

  private parseExpressionContainer(): unknown {
    this.consume('{');
    if (this.source.startsWith('/*', this.index)) {
      const commentEnd = this.source.indexOf('*/', this.index + 2);
      if (commentEnd < 0) this.fail('Unclosed JSX comment');
      this.index = commentEnd + 2;
      this.skipWhitespace();
      this.consume('}');
      return null;
    }

    const start = this.index;
    let nestedBraces = 0;
    let quote: string | null = null;
    let escaped = false;

    while (this.index < this.source.length) {
      const character = this.source[this.index] ?? '';
      if (quote) {
        if (escaped) escaped = false;
        else if (character === '\\') escaped = true;
        else if (character === quote) quote = null;
      } else if (character === '"' || character === "'") {
        quote = character;
      } else if (character === '{') {
        nestedBraces += 1;
      } else if (character === '}') {
        if (nestedBraces === 0) {
          const expression = this.source.slice(start, this.index);
          this.index += 1;
          return new SafeExpressionParser(expression, this.options.bindings).parse();
        }
        nestedBraces -= 1;
      }
      this.index += 1;
    }

    this.fail('Unclosed JSX expression');
  }

  private appendExpressionChildren(nodes: JSXPreviewNode[], value: unknown): void {
    if (Array.isArray(value)) {
      for (const entry of value) this.appendExpressionChildren(nodes, entry);
      return;
    }
    if (value === null || value === undefined || typeof value === 'boolean') return;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint') {
      nodes.push({ type: 'text', value: String(value) });
      return;
    }
    this.fail('JSX children bindings must resolve to text, numbers, or arrays of those values');
  }

  private parseText(): string {
    const start = this.index;
    while (this.index < this.source.length) {
      const character = this.source[this.index];
      if (character === '<' || character === '{') break;
      this.index += 1;
    }
    return decodeEntities(this.source.slice(start, this.index));
  }

  private resolveTarget(name: string): JSXPreviewElementTarget {
    if (name === name.toLowerCase()) {
      if (!INTRINSIC_TAGS.has(name as keyof HTMLElementTagNameMap)) {
        this.fail(`Unsupported intrinsic element: ${name}`);
      }
      return { type: 'intrinsic', tag: name as keyof HTMLElementTagNameMap };
    }

    if (!Object.prototype.hasOwnProperty.call(this.options.components, name)) {
      this.fail(`Unknown JSX component: ${name}`);
    }
    const definition = this.options.components[name];
    if (definition && typeof definition === 'object' && 'component' in definition
      && typeof definition.component === 'function' && isObjectSchema(definition.schema)) {
      return {
        type: 'component',
        component: definition.component as Component<RuntimeJSXPreviewComponentProps>,
        schema: definition.schema,
      };
    }
    if (definition && typeof definition === 'object' && 'snippet' in definition
      && typeof definition.snippet === 'function' && isObjectSchema(definition.schema)) {
      return {
        type: 'snippet',
        snippet: definition.snippet as Snippet<[RuntimeJSXPreviewComponentProps]>,
        schema: definition.schema,
      };
    }
    this.fail(`Invalid JSX component definition: ${name}`);
  }

  private isClosingTag(name: string): boolean {
    if (name === '') return this.source.startsWith('</>', this.index);
    if (!this.source.startsWith(`</${name}`, this.index)) return false;
    const next = this.source[this.index + name.length + 2];
    return next === '>' || /\s/.test(next ?? '');
  }

  private readName(pattern: RegExp, label: string): string {
    pattern.lastIndex = this.index;
    const match = pattern.exec(this.source);
    if (!match) this.fail(`Expected ${label}`);
    this.index = pattern.lastIndex;
    return match[0];
  }

  private consume(expected: string): void {
    if (!this.source.startsWith(expected, this.index)) this.fail(`Expected ${expected}`);
    this.index += expected.length;
  }

  private skipWhitespace(): void {
    while (/\s/.test(this.source[this.index] ?? '')) this.index += 1;
  }

  private fail(message: string): never {
    throw new Error(`${message} at character ${this.index}`);
  }
}

class SafeExpressionParser {
  private index = 0;

  constructor(
    private readonly source: string,
    private readonly bindings: JSXPreviewBindings,
  ) {}

  parse(): unknown {
    const value = this.parseValue();
    this.skipWhitespace();
    if (this.index !== this.source.length) this.fail('Unsupported JSX expression');
    return value;
  }

  private parseValue(): unknown {
    this.skipWhitespace();
    const character = this.source[this.index];
    if (character === '"' || character === "'") return this.parseString();
    if (character === '[') return this.parseArray();
    if (character === '{') return this.parseObject();
    if (character === '(') {
      this.index += 1;
      const value = this.parseValue();
      this.skipWhitespace();
      this.consume(')');
      return value;
    }
    if (character === '-' || /[0-9]/.test(character ?? '')) return this.parseNumber();
    return this.parseIdentifierValue();
  }

  private parseIdentifierValue(): unknown {
    const name = this.readIdentifier();
    if (name === 'true') return true;
    if (name === 'false') return false;
    if (name === 'null') return null;
    if (name === 'undefined') return undefined;
    if (!Object.prototype.hasOwnProperty.call(this.bindings, name)) this.fail(`Unknown binding: ${name}`);

    let value = this.bindings[name];
    while (true) {
      this.skipWhitespace();
      if (this.source[this.index] === '.') {
        this.index += 1;
        value = readOwnProperty(value, this.readIdentifier(), () => this.fail('Unsafe binding path'));
        continue;
      }
      if (this.source[this.index] === '[') {
        this.index += 1;
        this.skipWhitespace();
        const key = this.source[this.index] === '"' || this.source[this.index] === "'"
          ? this.parseString()
          : this.parseNumber();
        this.skipWhitespace();
        this.consume(']');
        value = readOwnProperty(value, String(key), () => this.fail('Unsafe binding path'));
        continue;
      }
      break;
    }
    return value;
  }

  private parseArray(): unknown[] {
    const result: unknown[] = [];
    this.consume('[');
    this.skipWhitespace();
    while (this.source[this.index] !== ']') {
      result.push(this.parseValue());
      this.skipWhitespace();
      if (this.source[this.index] !== ',') break;
      this.index += 1;
      this.skipWhitespace();
    }
    this.consume(']');
    return result;
  }

  private parseObject(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    this.consume('{');
    this.skipWhitespace();
    while (this.source[this.index] !== '}') {
      const key = this.source[this.index] === '"' || this.source[this.index] === "'"
        ? this.parseString()
        : this.readIdentifier();
      if (FORBIDDEN_PATH_PARTS.has(key)) this.fail(`Unsafe object key: ${key}`);
      this.skipWhitespace();
      this.consume(':');
      result[key] = this.parseValue();
      this.skipWhitespace();
      if (this.source[this.index] !== ',') break;
      this.index += 1;
      this.skipWhitespace();
    }
    this.consume('}');
    return result;
  }

  private parseString(): string {
    const quote = this.source[this.index] ?? '';
    this.index += 1;
    let result = '';
    while (this.index < this.source.length) {
      const character = this.source[this.index] ?? '';
      this.index += 1;
      if (character === quote) return result;
      if (character !== '\\') {
        result += character;
        continue;
      }
      const escaped = this.source[this.index] ?? '';
      this.index += 1;
      result += ({ n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', v: '\v' } as Record<string, string>)[escaped] ?? escaped;
    }
    this.fail('Unclosed string literal');
  }

  private parseNumber(): number {
    const match = /^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i.exec(this.source.slice(this.index));
    if (!match) this.fail('Invalid number literal');
    this.index += match[0].length;
    const value = Number(match[0]);
    if (!Number.isFinite(value)) this.fail('Number literal must be finite');
    return value;
  }

  private readIdentifier(): string {
    const match = /^[A-Za-z_$][A-Za-z0-9_$]*/.exec(this.source.slice(this.index));
    if (!match) this.fail('Expected identifier');
    this.index += match[0].length;
    return match[0];
  }

  private consume(expected: string): void {
    if (!this.source.startsWith(expected, this.index)) this.fail(`Expected ${expected}`);
    this.index += expected.length;
  }

  private skipWhitespace(): void {
    while (/\s/.test(this.source[this.index] ?? '')) this.index += 1;
  }

  private fail(message: string): never {
    throw new Error(`${message} in expression at character ${this.index}`);
  }
}

function decodeTargetProps(
  target: JSXPreviewElementTarget,
  props: Record<string, unknown>,
): Record<string, unknown> {
  return target.type === 'intrinsic' ? props : decodeGeneratedObjectProps(target.schema, props);
}

function isObjectSchema(value: unknown): value is TObject {
  return Boolean(value && typeof value === 'object'
    && (value as { type?: unknown }).type === 'object'
    && (value as { properties?: unknown }).properties
    && typeof (value as { properties?: unknown }).properties === 'object');
}

function sanitizeProps(
  target: JSXPreviewElementTarget,
  attributes: ParsedAttribute[],
): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  const intrinsic = target.type === 'intrinsic';

  for (const attribute of attributes) {
    const lowerName = attribute.name.toLowerCase();
    if (attribute.name.includes(':') || attribute.name.includes('.')) {
      throw new Error(`JSX directives and namespaced attributes are not supported: ${attribute.name}`);
    }
    if (BLOCKED_ATTRIBUTE_NAMES.has(lowerName)) {
      throw new Error(`Unsafe JSX attribute: ${attribute.name}`);
    }
    if (intrinsic && NEUTRALIZED_FORM_ATTRIBUTE_NAMES.has(lowerName)) continue;

    const eventName = intrinsic ? normalizeEventName(attribute.name) : null;
    if (eventName) {
      if (!ALLOWED_EVENTS.has(eventName) || !attribute.expression || typeof attribute.value !== 'function') {
        throw new Error(`Event attribute ${attribute.name} must reference an allowed function binding`);
      }
      props[eventName] = attribute.value;
      continue;
    }

    if (intrinsic && typeof attribute.value === 'function') {
      throw new Error(`Function bindings are only allowed for event attributes: ${attribute.name}`);
    }
    if (intrinsic && attribute.value !== null && attribute.value !== undefined
      && !['string', 'number', 'boolean'].includes(typeof attribute.value)) {
      throw new Error(`Intrinsic attribute ${attribute.name} must resolve to a primitive value`);
    }

    const normalizedName = intrinsic ? (ATTRIBUTE_ALIASES[attribute.name] ?? attribute.name) : attribute.name;
    if (Object.prototype.hasOwnProperty.call(props, normalizedName)) {
      throw new Error(`Duplicate JSX attribute: ${normalizedName}`);
    }
    props[normalizedName] = URL_ATTRIBUTE_NAMES.has(normalizedName.toLowerCase())
      ? sanitizeUrlAttribute(normalizedName, attribute.value)
      : attribute.value;
  }

  if (intrinsic && target.tag === 'button') props.type = 'button';
  if (intrinsic && target.tag === 'input' && typeof props.type === 'string'
    && ['submit', 'reset', 'image'].includes(props.type.toLowerCase())) {
    props.type = 'text';
  }
  if (intrinsic && target.tag === 'img' && props.alt === undefined) props.alt = '';
  if (intrinsic && target.tag === 'a' && props.target === '_blank') {
    props.rel = mergeRel(props.rel);
  }
  if (intrinsic && target.tag === 'form') {
    delete props.onsubmit;
    delete props.action;
  }

  return props;
}

function normalizeEventName(name: string): string | null {
  if (EVENT_ALIASES[name]) return EVENT_ALIASES[name];
  if (!/^on[A-Z]/.test(name) && !/^on[a-z]/.test(name)) return null;
  return `on${name.slice(2).toLowerCase()}`;
}

function sanitizeUrlAttribute(name: string, value: unknown): unknown {
  if (value === undefined || value === null || value === '') return value;
  if (typeof value !== 'string') throw new Error(`URL attribute ${name} must resolve to a string`);

  let normalizedUrl = '';
  for (const character of value.trim()) {
    if (character.charCodeAt(0) > 0x20) normalizedUrl += character;
  }
  if (/^(?:javascript|vbscript|data):/i.test(normalizedUrl)) {
    throw new Error(`Unsafe URL in JSX attribute: ${name}`);
  }
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(normalizedUrl)
    && !/^(?:https?|mailto|tel|blob):/i.test(normalizedUrl)) {
    throw new Error(`Unsupported URL protocol in JSX attribute: ${name}`);
  }
  return value.trim();
}

function mergeRel(value: unknown): string {
  const values = new Set(typeof value === 'string' ? value.split(/\s+/).filter(Boolean) : []);
  values.add('noopener');
  values.add('noreferrer');
  return [...values].join(' ');
}

function readOwnProperty(value: unknown, key: string, fail: () => never): unknown {
  if (FORBIDDEN_PATH_PARTS.has(key) || (typeof value !== 'object' && typeof value !== 'function') || value === null) {
    return fail();
  }
  if (!Object.prototype.hasOwnProperty.call(value, key)) return fail();
  return (value as Record<string, unknown>)[key];
}

function decodeEntities(value: string): string {
  return value.replace(/&(?:#(\d+)|#x([\dA-Fa-f]+)|([A-Za-z]+));/g, (entity, decimal, hex, name) => {
    if (decimal) return safeCodePoint(Number.parseInt(decimal, 10), entity);
    if (hex) return safeCodePoint(Number.parseInt(hex, 16), entity);
    return ({ amp: '&', apos: "'", gt: '>', lt: '<', nbsp: '\u00a0', quot: '"' } as Record<string, string>)[name] ?? entity;
  });
}

function safeCodePoint(value: number, fallback: string): string {
  try {
    return String.fromCodePoint(value);
  } catch {
    return fallback;
  }
}
