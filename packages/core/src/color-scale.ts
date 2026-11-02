/**
 * Color scale generation and theme-token exchange.
 *
 * Capability parity with the Arco ecosystem's `@arco-design/color` + theme
 * editor: derive a tonal scale from one brand color, build light/dark CSS
 * variable bundles, and exchange presets as portable JSON.
 *
 * Boundaries (intentional):
 * - no Less/`modifyVars` layer; output is CSS custom properties only;
 * - no arbitrary expression or code compilation in the payload;
 * - gamut mapping happens in OKLCH so generated values stay valid sRGB.
 */

export interface ColorScaleStep {
  /** 1 = lightest, 10 = darkest. */
  step: number;
  /** `oklch(L C H)` string, directly assignable to a CSS variable. */
  value: string;
  /** Clamped sRGB hex, for swatches and contrast checks. */
  hex: string;
}

/** Structural subset of `ColorPreset`; keeps this module rune-free. */
export interface DerivedColorPreset {
  name: string;
  label: string;
  color: string;
  light: Record<string, string>;
  dark: Record<string, string>;
}

export interface ThemeTokenDocument {
  version: 1;
  presets: DerivedColorPreset[];
}

const HEX_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const MAX_PRESETS = 64;
const MAX_VARIABLES = 64;

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function srgbToLinear(channel: number): number {
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(channel: number): number {
  return channel <= 0.0031308 ? channel * 12.92 : 1.055 * channel ** (1 / 2.4) - 0.055;
}

export function parseHex(hex: string): { r: number; g: number; b: number } {
  if (typeof hex !== 'string' || !HEX_PATTERN.test(hex.trim())) {
    throw new TypeError(`Expected a 3- or 6-digit hex color, received: ${String(hex)}`);
  }
  let body = hex.trim().slice(1);
  if (body.length === 3) body = body.split('').map((digit) => digit + digit).join('');
  return {
    r: parseInt(body.slice(0, 2), 16) / 255,
    g: parseInt(body.slice(2, 4), 16) / 255,
    b: parseInt(body.slice(4, 6), 16) / 255,
  };
}

export function hexToOklch(hex: string): { l: number; c: number; h: number } {
  const { r, g, b } = parseHex(hex);
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
  const l3 = Math.cbrt(l);
  const m3 = Math.cbrt(m);
  const s3 = Math.cbrt(s);
  const okL = 0.2104542553 * l3 + 0.793617785 * m3 - 0.0040720468 * s3;
  const okA = 1.9779984951 * l3 - 2.428592205 * m3 + 0.4505937099 * s3;
  const okB = 0.0259040371 * l3 + 0.7827717662 * m3 - 0.808675766 * s3;
  const hue = (Math.atan2(okB, okA) * 180) / Math.PI;
  return { l: okL, c: Math.hypot(okA, okB), h: hue < 0 ? hue + 360 : hue };
}

/** Convert OKLCH to sRGB channels, or `undefined` when the color is out of gamut. */
function oklchToRgbUnclamped(l: number, c: number, h: number): { r: number; g: number; b: number } | undefined {
  const radians = (h * Math.PI) / 180;
  const okA = c * Math.cos(radians);
  const okB = c * Math.sin(radians);
  const l3 = l + 0.3963377774 * okA + 0.2158037573 * okB;
  const m3 = l - 0.1055613458 * okA - 0.0638541728 * okB;
  const s3 = l - 0.0894841775 * okA - 1.291485548 * okB;
  const lCube = l3 ** 3;
  const mCube = m3 ** 3;
  const sCube = s3 ** 3;
  const linearR = 4.0767416621 * lCube - 3.3077115913 * mCube + 0.2309699292 * sCube;
  const linearG = -1.2684380046 * lCube + 2.6097574011 * mCube - 0.3413193965 * sCube;
  const linearB = -0.0041960863 * lCube - 0.7034186147 * mCube + 1.707614701 * sCube;
  const epsilon = 1e-6;
  if ([linearR, linearG, linearB].some((channel) => channel < -epsilon || channel > 1 + epsilon)) return undefined;
  return {
    r: clamp01(linearToSrgb(clamp01(linearR))),
    g: clamp01(linearToSrgb(clamp01(linearG))),
    b: clamp01(linearToSrgb(clamp01(linearB))),
  };
}

/** Map an OKLCH color into sRGB by reducing chroma until it fits the gamut. */
function oklchToRgb(l: number, c: number, h: number): { r: number; g: number; b: number } {
  const lightness = clamp01(l);
  const direct = oklchToRgbUnclamped(lightness, c, h);
  if (direct) return direct;
  let low = 0;
  let high = c;
  let result = oklchToRgbUnclamped(lightness, 0, h) ?? { r: 0, g: 0, b: 0 };
  for (let index = 0; index < 24; index += 1) {
    const mid = (low + high) / 2;
    const candidate = oklchToRgbUnclamped(lightness, mid, h);
    if (candidate) {
      result = candidate;
      low = mid;
    } else {
      high = mid;
    }
  }
  return result;
}

function toHex(channels: { r: number; g: number; b: number }): string {
  const part = (value: number): string => Math.round(clamp01(value) * 255).toString(16).padStart(2, '0');
  return `#${part(channels.r)}${part(channels.g)}${part(channels.b)}`.toUpperCase();
}

export function formatOklch(l: number, c: number, h: number): string {
  const roundedHue = Math.round((((h % 360) + 360) % 360) * 10) / 10;
  return `oklch(${Math.round(l * 1000) / 1000} ${Math.round(c * 1000) / 1000} ${roundedHue})`;
}

function relativeLuminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

function contrastRatio(a: string, b: string): number {
  const first = relativeLuminance(a);
  const second = relativeLuminance(b);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Pick the foreground with the higher contrast ratio (WCAG relative luminance). */
export function pickReadableForeground(backgroundHex: string): string {
  return contrastRatio(backgroundHex, '#FFFFFF') >= contrastRatio(backgroundHex, '#111111')
    ? '#FFFFFF'
    : '#111111';
}

/**
 * Derive a 10-step tonal scale from a brand color.
 * Step 1 is the lightest tint, step 10 the darkest shade; hue is preserved.
 */
export function generateColorScale(color: string): ColorScaleStep[] {
  const { c: baseChroma, h } = hexToOklch(color);
  const lightest = 0.975;
  const darkest = 0.26;
  const steps: ColorScaleStep[] = [];
  for (let step = 1; step <= 10; step += 1) {
    const ratio = (step - 1) / 9;
    const lightness = lightest - (lightest - darkest) * ratio;
    // Chroma peaks in the mid tones so the endpoints stay near-neutral.
    const chroma = baseChroma * (0.35 + 0.65 * Math.sin(Math.PI * (0.15 + 0.7 * ratio)));
    const rgb = oklchToRgb(lightness, chroma, h);
    steps.push({ step, value: formatOklch(lightness, chroma, h), hex: toHex(rgb) });
  }
  return steps;
}

function chartPalette(scale: ColorScaleStep[], hue: number, chroma: number, lightness: number): Record<string, string> {
  const offsets = [0, 32, -32, 64, -64];
  return Object.fromEntries(offsets.map((offset, index) => [
    `--chart-${index + 1}`,
    index === 0 ? scale[5]?.value as string : formatOklch(lightness, chroma, hue + offset),
  ]));
}

/**
 * Build light/dark CSS variable bundles for one brand color.
 * Keys mirror the built-in presets so `registerColorPreset` can consume it.
 */
export function deriveColorPreset(input: { name: string; label?: string; color: string }): DerivedColorPreset {
  const name = input.name?.trim();
  if (!name) throw new TypeError('deriveColorPreset requires a non-empty name');
  const color = input.color?.trim();
  const source = hexToOklch(color);
  const scale = generateColorScale(color);
  const lightPrimary = scale[5] as ColorScaleStep;
  const darkPrimary = scale[3] as ColorScaleStep;
  const lightForeground = pickReadableForeground(lightPrimary.hex);
  const darkForeground = pickReadableForeground(darkPrimary.hex);

  return {
    name,
    label: input.label?.trim() || name,
    color: color.toUpperCase(),
    light: {
      '--primary': lightPrimary.value,
      '--primary-foreground': lightForeground,
      '--ring': lightPrimary.value,
      '--sidebar-primary': lightPrimary.value,
      '--sidebar-primary-foreground': lightForeground,
      '--sidebar-ring': lightPrimary.value,
      ...chartPalette(scale, source.h, source.c, source.l),
    },
    dark: {
      '--primary': darkPrimary.value,
      '--primary-foreground': darkForeground,
      '--ring': scale[4]?.value as string,
      '--sidebar-primary': darkPrimary.value,
      '--sidebar-primary-foreground': darkForeground,
      '--sidebar-ring': scale[4]?.value as string,
      ...chartPalette(scale, source.h, source.c * 1.05, Math.min(0.82, source.l + 0.12)),
    },
  };
}

function assertVariableMap(value: unknown, label: string): asserts value is Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object of CSS variable values`);
  }
  const entries = Object.entries(value);
  if (entries.length === 0 || entries.length > MAX_VARIABLES) {
    throw new TypeError(`${label} must declare between 1 and ${MAX_VARIABLES} variables`);
  }
  for (const [key, variable] of entries) {
    if (!/^--[a-z0-9-]{1,64}$/i.test(key)) throw new TypeError(`${label} has an invalid CSS variable name: ${key}`);
    if (typeof variable !== 'string' || variable.trim() === '' || variable.length > 200) {
      throw new TypeError(`${label}.${key} must be a non-empty string`);
    }
    // Token exchange is a data contract: only color syntax, never arbitrary CSS.
    if (!/^(?:oklch\(|#|rgb\(|hsl\(|var\(--)/i.test(variable.trim()) || /[;{}]/.test(variable)) {
      throw new TypeError(`${label}.${key} is not a color token value: ${variable}`);
    }
  }
}

/** Serialize presets into a portable, versioned document. */
export function exportThemeTokens(presets: readonly DerivedColorPreset[]): ThemeTokenDocument {
  return {
    version: 1,
    presets: presets.map((preset) => ({
      name: preset.name,
      label: preset.label,
      color: preset.color,
      light: { ...preset.light },
      dark: { ...preset.dark },
    })),
  };
}

/** Validate and clone a token document without mutating shared state. */
export function parseThemeTokens(payload: unknown): DerivedColorPreset[] {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new TypeError('Theme token document must be an object');
  }
  const document = payload as Partial<ThemeTokenDocument>;
  if (document.version !== 1) throw new TypeError('Unsupported theme token document version; expected 1');
  if (!Array.isArray(document.presets) || document.presets.length === 0 || document.presets.length > MAX_PRESETS) {
    throw new TypeError(`Theme token document must declare between 1 and ${MAX_PRESETS} presets`);
  }
  const seen = new Set<string>();
  return document.presets.map((raw, index) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new TypeError(`Theme token preset at index ${index} must be an object`);
    }
    const { name, label, color } = raw as Partial<DerivedColorPreset>;
    if (typeof name !== 'string' || !/^[a-z][a-z0-9-]{0,31}$/.test(name)) {
      throw new TypeError(`Theme token preset at index ${index} has an invalid name`);
    }
    if (seen.has(name)) throw new TypeError(`Duplicate theme token preset: ${name}`);
    seen.add(name);
    if (typeof color !== 'string' || !HEX_PATTERN.test(color.trim())) {
      throw new TypeError(`Theme token preset "${name}" must declare a hex color`);
    }
    assertVariableMap(raw.light, `${name}.light`);
    assertVariableMap(raw.dark, `${name}.dark`);
    return {
      name,
      label: typeof label === 'string' && label.trim() !== '' ? label.trim().slice(0, 64) : name,
      color: color.trim().toUpperCase(),
      light: { ...raw.light },
      dark: { ...raw.dark },
    };
  });
}