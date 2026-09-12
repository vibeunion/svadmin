import { Button, Calendar } from 'bits-ui';
import type { ComponentProps } from 'svelte';
import { CalendarDate } from '@internationalized/date';
import { afterSleep, box } from 'svelte-toolbelt';
import type { FloatingContentState } from '../../../node_modules/bits-ui/dist/bits/utilities/floating-layer/use-floating-layer.svelte.js';

const date = new CalendarDate(2026, 9, 9);
const button: ComponentProps<typeof Button.Root> = { type: 'submit', disabled: true };
const anchor: ComponentProps<typeof Button.Root> = { href: '/records', download: true };
// @ts-expect-error Link buttons cannot also use a form button type.
const hybrid: ComponentProps<typeof Button.Root> = { href: '/records', type: 'submit' };
// @ts-expect-error Arbitrary button types are not permitted.
const invalidButton: ComponentProps<typeof Button.Root> = { type: 'unknown' };
// @ts-expect-error Link attributes must still match their declared DOM type.
const invalidAnchor: ComponentProps<typeof Button.Root> = { href: 42 };
// @ts-expect-error DOM element refs cannot be numbers.
const invalidRef: ComponentProps<typeof Button.Root> = { ref: 1 };

const single: ComponentProps<typeof Calendar.Root> = {
  type: 'single', value: date, onValueChange: value => { value?.toDate('UTC'); },
};
const multiple: ComponentProps<typeof Calendar.Root> = {
  type: 'multiple', value: [date], onValueChange: values => { values.map(value => value.toDate('UTC')); },
};
// @ts-expect-error The mode is required.
const missingMode: ComponentProps<typeof Calendar.Root> = { value: date };
// @ts-expect-error Single selection cannot receive an array.
const invalidSingle: ComponentProps<typeof Calendar.Root> = { type: 'single', value: [date] };
// @ts-expect-error Multiple selection cannot receive a single value.
const invalidMultiple: ComponentProps<typeof Calendar.Root> = { type: 'multiple', value: date };
// @ts-expect-error Exact optionality applies to calendar values.
const undefinedValue: ComponentProps<typeof Calendar.Root> = { type: 'single', value: undefined };
// @ts-expect-error Multiple-selection callbacks must receive an array.
const invalidCallback: ComponentProps<typeof Calendar.Root> = { type: 'multiple', onValueChange: (_value: CalendarDate) => {} };

declare const floating: FloatingContentState;
declare const buttonBindings: NonNullable<typeof Button.Root.z_$$bindings>;
const buttonBinding: 'ref' = buttonBindings;
// @ts-expect-error Only the element ref is bindable on Button.
const invalidButtonBinding: typeof buttonBindings = 'disabled';
declare const calendarBindings: NonNullable<typeof Calendar.Root.z_$$bindings>;
const calendarBinding: 'value' | 'placeholder' | 'ref' = calendarBindings;
// @ts-expect-error The calendar mode is not bindable.
const invalidCalendarBinding: typeof calendarBindings = 'type';
const origin: string = floating.wrapperProps.style['--bits-floating-transform-origin'];
const position = floating.wrapperProps.style.position;
// @ts-expect-error Floating styles are a readonly projection.
floating.wrapperProps.style.position = 'fixed';
// @ts-expect-error CSS output does not pretend to be an arbitrary application value.
const invalidOrigin: number = floating.wrapperProps.style['--bits-floating-transform-origin'];
// @ts-expect-error CSS property values are not untyped.
const invalidPosition: number = position;

const count = box(1);
const flat = box.flatten({ count, twice: box.with(() => count.current * 2), label: 'Count' });
flat.count = 2;
const twice: number = flat.twice;
// @ts-expect-error Readonly boxes must remain readonly after flattening.
flat.twice = 4;
// @ts-expect-error Flattening retains the boxed value type.
flat.count = 'two';
// @ts-expect-error Non-boxed values retain their original types.
flat.label = 2;
const timer: ReturnType<typeof setTimeout> = afterSleep(1, () => {});
clearTimeout(timer);

void [button, anchor, hybrid, invalidButton, invalidAnchor, invalidRef, single,
  multiple, missingMode, invalidSingle, invalidMultiple, undefinedValue,
  invalidCallback, origin, invalidOrigin, invalidPosition, buttonBinding,
  invalidButtonBinding, calendarBinding, invalidCalendarBinding, twice];
