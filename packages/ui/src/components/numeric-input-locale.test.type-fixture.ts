import type { ComponentProps } from 'svelte';
import type { NumericInputLocale } from './numeric-format.js';
import NumberInput from './NumberInput.svelte';
import MoneyInput from './MoneyInput.svelte';
import PercentInput from './PercentInput.svelte';

type NumberProps = ComponentProps<typeof NumberInput>;
type MoneyProps = ComponentProps<typeof MoneyInput>;
type PercentProps = ComponentProps<typeof PercentInput>;

const locale: NumericInputLocale = 'de-DE';
const numberProps: NumberProps = { value: 1234.5, locale, precision: 2 };
const moneyProps: MoneyProps = { value: 1234.5, currency: 'EUR', locale, precision: 2 };
const percentProps: PercentProps = { value: 0.25, locale, scale: '1', precision: 1 };
void numberProps;
void moneyProps;
void percentProps;

// The public locale prop is an explicit allowlist, not an unbounded Intl string.
// @ts-expect-error fr-FR has no reviewed parsing/screen-reader matrix yet.
const unsupportedNumber: NumberProps = { value: 1, locale: 'fr-FR' };
// @ts-expect-error locale must be one of the supported locale literals.
const unsupportedMoney: MoneyProps = { value: 1, currency: 'EUR', locale: 'en-GB' };
// @ts-expect-error locale must be one of the supported locale literals.
const unsupportedPercent: PercentProps = { value: 0.5, locale: 'ja-JP' };
void unsupportedNumber;
void unsupportedMoney;
void unsupportedPercent;