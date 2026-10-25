/**
 * Minimal, explicit locale contract for the numeric input family.
 *
 * Only the locales below are accepted by the public `locale` prop. The default
 * (no `locale`) keeps the legacy `type="number"` behaviour untouched. Adding a
 * locale is a product decision and must come with its own parsing/screen-reader
 * matrix instead of silently widening the contract.
 */
export const NUMERIC_INPUT_LOCALES = ['en-US', 'de-DE', 'zh-CN'] as const;

export type NumericInputLocale = (typeof NUMERIC_INPUT_LOCALES)[number];

export type NumericParseResult = { ok: true; value: number | null } | { ok: false };

const MAX_INPUT_LENGTH = 64;

export function isNumericInputLocale(value: string | null | undefined): value is NumericInputLocale {
  return typeof value === 'string' && (NUMERIC_INPUT_LOCALES as readonly string[]).includes(value);
}

interface Separators {
  readonly group: string;
  readonly decimal: string;
}

const separatorCache = new Map<NumericInputLocale, Separators>();

function separatorsFor(locale: NumericInputLocale): Separators {
  const cached = separatorCache.get(locale);
  if (cached) return cached;

  const parts = new Intl.NumberFormat(locale, { useGrouping: true }).formatToParts(1234567.89);
  const group = parts.find(part => part.type === 'group')?.value ?? ',';
  const decimal = parts.find(part => part.type === 'decimal')?.value ?? '.';
  const separators = { group, decimal };
  separatorCache.set(locale, separators);
  return separators;
}

export function clampNumericPrecision(precision: number | null | undefined): number | undefined {
  if (precision == null || !Number.isFinite(precision)) return undefined;
  return Math.min(20, Math.max(0, Math.trunc(precision)));
}

/**
 * Formats a stored value for display. `precision` only rounds the display; the
 * caller keeps the original stored number. Intl's default rounding is used.
 */
export function formatNumericValue(
  locale: NumericInputLocale,
  value: number | null,
  precision?: number | null,
): string {
  if (value == null || !Number.isFinite(value)) return '';
  const digits = clampNumericPrecision(precision);
  const options: Intl.NumberFormatOptions = {
    useGrouping: true,
    minimumFractionDigits: digits ?? 0,
    maximumFractionDigits: digits ?? 20,
  };
  return new Intl.NumberFormat(locale, options).format(value);
}

/**
 * Editable text mirrors formatting but omits grouping so that inserting a digit
 * does not make an otherwise valid number look like a mixed-separator error.
 */
export function formatNumericEditingText(
  locale: NumericInputLocale,
  value: number | null,
  precision?: number | null,
): string {
  if (value == null || !Number.isFinite(value)) return '';
  const digits = clampNumericPrecision(precision);
  const options: Intl.NumberFormatOptions = {
    useGrouping: false,
    minimumFractionDigits: digits ?? 0,
    maximumFractionDigits: digits ?? 20,
  };
  return new Intl.NumberFormat(locale, options).format(value);
}

/**
 * Parses locale-formatted text into a stored value. Group separators are
 * display-only and never become part of the number. Invalid or mixed input
 * returns `{ ok: false }` without echoing the raw text or an error message.
 */
export function parseNumericInput(locale: NumericInputLocale, text: string): NumericParseResult {
  const trimmed = text.trim();
  if (trimmed === '') return { ok: true, value: null };
  if (trimmed.length > MAX_INPUT_LENGTH) return { ok: false };

  const { group, decimal } = separatorsFor(locale);
  let index = 0;
  let negative = false;

  if (trimmed.startsWith('-') || trimmed.startsWith('\u2212')) {
    negative = true;
    index = 1;
  }
  if (index >= trimmed.length) return { ok: false };

  let integerDigits = '';
  let fractionDigits = '';
  let afterDecimal = false;
  let sawDigit = false;
  let groupCount = 0;
  let firstGroupLength = 0;
  let digitsSinceGroup = 0;

  while (index < trimmed.length) {
    if (decimal && trimmed.startsWith(decimal, index)) {
      if (afterDecimal || groupCount > 0 && digitsSinceGroup !== 3) return { ok: false };
      afterDecimal = true;
      index += decimal.length;
      continue;
    }
    if (group && trimmed.startsWith(group, index)) {
      if (afterDecimal || !sawDigit) return { ok: false };
      if (groupCount > 0 && digitsSinceGroup !== 3) return { ok: false };
      if (digitsSinceGroup < 1 || digitsSinceGroup > 3) return { ok: false };
      groupCount += 1;
      if (groupCount === 1) firstGroupLength = integerDigits.length;
      digitsSinceGroup = 0;
      index += group.length;
      continue;
    }

    const char = trimmed[index] ?? '';
    if (char < '0' || char > '9') return { ok: false };
    sawDigit = true;
    if (afterDecimal) {
      fractionDigits += char;
    } else {
      integerDigits += char;
      digitsSinceGroup += 1;
    }
    index += 1;
  }

  if (!sawDigit) return { ok: false };
  if (groupCount > 0) {
    if (digitsSinceGroup !== 3 || firstGroupLength > 3) return { ok: false };
  }
  if (afterDecimal && fractionDigits === '' && integerDigits === '') return { ok: false };

  const normalized = `${negative ? '-' : ''}${integerDigits || '0'}${
    afterDecimal ? `.${fractionDigits}` : ''
  }`;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return { ok: false };
  return { ok: true, value: Object.is(parsed, -0) ? 0 : parsed };
}

/** Rounds a stepped value to avoid floating-point drift when precision is set. */
export function roundToNumericPrecision(value: number, precision: number | null | undefined): number {
  const digits = clampNumericPrecision(precision);
  if (digits === undefined) return value;
  const factor = 10 ** digits;
  const rounded = Math.round((value + Number.EPSILON) * factor) / factor;
  return Object.is(rounded, -0) ? 0 : rounded;
}

/**
 * Decimal scaling above 15 places would push 10^n past
 * Number.MAX_SAFE_INTEGER, so the scaled path stops there. Larger decimal
 * counts fall back to plain Number arithmetic, which keeps whatever the Number
 * type can actually represent without promising sub-ulp precision.
 */
const MAX_STEP_DECIMALS = 15;

function decimalPlaces(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const text = value.toString().toLowerCase();
  const exponentIndex = text.indexOf('e');
  if (exponentIndex >= 0) {
    const mantissa = text.slice(0, exponentIndex);
    const exponent = Number(text.slice(exponentIndex + 1));
    const fractionLength = mantissa.split('.')[1]?.length ?? 0;
    return Math.max(0, fractionLength - exponent);
  }
  return text.split('.')[1]?.length ?? 0;
}

/**
 * Adds one step without rounding to the display precision. Display precision
 * must not erase an explicit smaller step; decimal scaling only protects the
 * arithmetic itself. Scaling is used while its integers stay inside
 * Number.MAX_SAFE_INTEGER; beyond that, direct Number addition is the only
 * truthful result. Non-finite results keep the original value.
 */
export function addNumericStep(base: number, step: number, direction: 1 | -1 = 1): number {
  if (!Number.isFinite(base) || !Number.isFinite(step) || step <= 0) return base;

  const delta = direction * step;
  const direct = base + delta;
  if (!Number.isFinite(direct)) return base;

  const decimals = Math.max(decimalPlaces(base), decimalPlaces(step));
  if (decimals <= MAX_STEP_DECIMALS) {
    const factor = 10 ** decimals;
    const scaledBase = base * factor;
    const scaledDelta = delta * factor;
    if (
      Number.isFinite(scaledBase)
      && Number.isFinite(scaledDelta)
      && Math.abs(scaledBase) <= Number.MAX_SAFE_INTEGER
      && Math.abs(scaledDelta) <= Number.MAX_SAFE_INTEGER
    ) {
      const scaled = Math.round(scaledBase) + Math.round(scaledDelta);
      if (Math.abs(scaled) <= Number.MAX_SAFE_INTEGER) {
        const next = scaled / factor;
        if (Number.isFinite(next)) return Object.is(next, -0) ? 0 : next;
      }
    }
  }

  return Object.is(direct, -0) ? 0 : direct;
}