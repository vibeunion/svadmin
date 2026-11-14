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

/** Convert an OKLCH triple to a clamped sRGB hex string. */
export function oklchToHex(l: number, c: number, h: number): string {
  return toHex(oklchToRgb(l, c, h));
}

/** Contrast helpers shared by the token audit. */
export function hexLuminance(hex: string): number {
  return relativeLuminance(hex);
}

export function hexContrastRatio(a: string, b: string): number {
  return contrastRatio(a, b);
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

/**
 * Nudge lightness until the color reaches `minimum` contrast against a surface.
 * Direction is chosen so the adjustment moves away from the surface, keeping the
 * hue and chroma intact (only the lightness dimension changes).
 */
function contrastAdjusted(
  lightness: number,
  chroma: number,
  hue: number,
  surfaceHex: string,
  minimum: number,
): { value: string; hex: string } {
  const step = hexLuminance(surfaceHex) > 0.5 ? -0.008 : 0.008;
  let current = clamp01(lightness);
  let hex = toHex(oklchToRgb(current, chroma, hue));
  // Rounding to `oklch(L C H)` loses precision, so aim above the threshold
  // instead of landing on 2.99.
  const target = minimum + 0.1;
  for (let index = 0; index < 80 && contrastRatio(hex, surfaceHex) < target; index += 1) {
    const next = clamp01(current + step);
    if (next === current) break;
    current = next;
    hex = toHex(oklchToRgb(current, chroma, hue));
  }
  return { value: formatOklch(current, chroma, hue), hex };
}

/** Lightness step used by `generateColorScale` (step 1 → 10). */
const SCALE_LIGHTNESS_STEP = (0.975 - 0.26) / 9;

/**
 * Official Arco hover (5) / pressed (7) / disabled fill (3) for the written
 * product bases. `#165DFF` is the CSS default and must not be regenerated.
 * Dark values are the compiled `body[arco-theme=dark]` channels from
 * `@arco-design/web-react` 2.66.1, not the light scale reversed by hand.
 */
const OFFICIAL_INTERACTION_RAMPS: Record<string, { hover: string; pressed: string; disabled: string }> = {
  '#165DFF': { hover: '#4080FF', pressed: '#0E42D2', disabled: '#94BFFF' },
  '#3C7EFF': { hover: '#306FFF', pressed: '#689FFF', disabled: '#0E32A6' },
  '#00B42A': { hover: '#23C343', pressed: '#009A29', disabled: '#7BE188' },
  '#27C346': { hover: '#1DB440', pressed: '#50D266', disabled: '#0A802D' },
  '#FF7D00': { hover: '#FF9A2E', pressed: '#D25F00', disabled: '#FFCF8B' },
  '#FF9626': { hover: '#FF8D1F', pressed: '#FFB357', disabled: '#A64B0A' },
  '#F53F3F': { hover: '#F76560', pressed: '#CB272D', disabled: '#FBACA3' },
  '#F76965': { hover: '#F54E4E', pressed: '#F98D86', disabled: '#A1161F' },
  '#3491FA': { hover: '#57A9FB', pressed: '#206CCF', disabled: '#9FD4FD' },
  '#5AAAFB': { hover: '#469AFA', pressed: '#7DC1FC', disabled: '#134CA3' },
};

export interface InteractionRamps {
  /** color-5, hover. */
  hover: string;
  /** color-7, pressed. */
  pressed: string;
  /** color-3, general disabled fill. */
  disabled: string;
}

function normalizeHexColor(color: string): string | undefined {
  const trimmed = color.trim();
  if (!HEX_PATTERN.test(trimmed)) return undefined;
  let body = trimmed.slice(1);
  if (body.length === 3) body = body.split('').map((digit) => digit + digit).join('');
  return `#${body.toUpperCase()}`;
}

function parseOklchColor(color: string): { l: number; c: number; h: number } | undefined {
  const match = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/i.exec(color.trim());
  if (!match) return undefined;
  return { l: Number(match[1]), c: Number(match[2]), h: Number(match[3]) };
}

/**
 * Hover / pressed / disabled fills for one brand color.
 * Known Arco bases return the official hex. Every other color shifts lightness
 * by the existing OKLCH scale step so imported themes stay on the same ramp.
 */
export function interactionRamps(color: string): InteractionRamps {
  const official = normalizeHexColor(color);
  if (official && OFFICIAL_INTERACTION_RAMPS[official]) return OFFICIAL_INTERACTION_RAMPS[official];
  const parsed = official ? hexToOklch(official) : parseOklchColor(color);
  if (!parsed) throw new TypeError(`Cannot derive interaction ramps from: ${String(color)}`);
  const { l, c, h } = parsed;
  return {
    hover: formatOklch(clamp01(l + SCALE_LIGHTNESS_STEP), c, h),
    pressed: formatOklch(clamp01(l - SCALE_LIGHTNESS_STEP), c, h),
    disabled: formatOklch(clamp01(l + SCALE_LIGHTNESS_STEP * 3), c, h),
  };
}

/** Add primary 3/5/7 when a preset did not already declare them. */
export function withPrimaryInteractionRamps(variables: Record<string, string>): Record<string, string> {
  const primary = variables['--primary'];
  if (!primary || variables['--primary-5'] || variables['--primary-7'] || variables['--primary-3']) {
    return variables;
  }
  try {
    const ramps = interactionRamps(primary);
    return {
      ...variables,
      '--primary-5': ramps.hover,
      '--primary-7': ramps.pressed,
      '--primary-3': ramps.disabled,
    };
  } catch {
    return variables;
  }
}

function chartPalette(
  scale: ColorScaleStep[],
  hue: number,
  chroma: number,
  lightness: number,
  surfaceHex: string,
): Record<string, string> {
  const offsets = [0, 32, -32, 64, -64];
  return Object.fromEntries(offsets.map((offset, index) => {
    if (index === 0) return ['--chart-1', contrastAdjusted(lightness, chroma, hue, surfaceHex, 3).value];
    return [`--chart-${index + 1}`, contrastAdjusted(lightness, chroma, hue + offset, surfaceHex, 3).value];
  }));
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
  // One foreground per mode keeps `primary` usable both as a fill and as text on
  // the mode surface: white on a light-mode primary, near-black on a dark one.
  const lightForeground = '#FFFFFF';
  const darkForeground = '#111111';
  const lightPrimary = contrastAdjusted(source.l, source.c, source.h, '#FFFFFF', 4.5);
  const darkPrimary = contrastAdjusted(Math.min(0.82, source.l + 0.12), source.c, source.h, '#111111', 4.5);
  const lightRamps = interactionRamps(lightPrimary.value);
  const darkRamps = interactionRamps(darkPrimary.value);

  return {
    name,
    label: input.label?.trim() || name,
    color: color.toUpperCase(),
    light: {
      '--primary': lightPrimary.value,
      '--primary-foreground': lightForeground,
      '--primary-5': lightRamps.hover,
      '--primary-7': lightRamps.pressed,
      '--primary-3': lightRamps.disabled,
      '--ring': lightPrimary.value,
      '--sidebar-primary': lightPrimary.value,
      '--sidebar-primary-foreground': lightForeground,
      '--sidebar-ring': lightPrimary.value,
      ...chartPalette(scale, source.h, source.c, source.l, '#FFFFFF'),
    },
    dark: {
      '--primary': darkPrimary.value,
      '--primary-foreground': darkForeground,
      '--primary-5': darkRamps.hover,
      '--primary-7': darkRamps.pressed,
      '--primary-3': darkRamps.disabled,
      '--ring': scale[4]?.value as string,
      '--sidebar-primary': darkPrimary.value,
      '--sidebar-primary-foreground': darkForeground,
      '--sidebar-ring': scale[4]?.value as string,
      ...chartPalette(scale, source.h, source.c * 1.05, Math.min(0.82, source.l + 0.12), '#111111'),
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