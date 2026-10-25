import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import ts from 'typescript';
import { svelte2tsx } from 'svelte2tsx';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import NumberInput from './NumberInput.svelte';
import PercentInput from './PercentInput.svelte';
import FieldRenderer from './FieldRenderer.svelte';
import type { NumericInputLocale } from './numeric-format.js';

function numericInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('input[role="spinbutton"]');
  if (!(input instanceof HTMLInputElement)) throw new Error('Expected a locale numeric input');
  return input;
}

function mountInForm(
  component: typeof NumberInput | typeof PercentInput | typeof FieldRenderer,
  props: Record<string, unknown>,
) {
  const form = document.createElement('form');
  document.body.append(form);
  const submissions = vi.fn((event: SubmitEvent) => event.preventDefault());
  form.addEventListener('submit', submissions);
  const view = render(component as never, props) as unknown as {
    container: HTMLElement;
    unmount: () => void;
    rerender: (next: Record<string, unknown>) => Promise<void>;
  };
  form.append(view.container);
  return {
    form,
    view,
    submissions,
    dispose() {
      view.unmount();
      form.remove();
    },
  };
}

function submitAndRead(form: HTMLFormElement, submissions: ReturnType<typeof vi.fn>): FormData | null {
  submissions.mockClear();
  form.requestSubmit();
  if (submissions.mock.calls.length === 0) return null;
  return new FormData(form);
}

function type(field: HTMLInputElement, value: string): Promise<unknown> {
  return fireEvent.input(field, { target: { value } });
}

describe('localized numeric native form contract', () => {
  it('submits one normalized stored value instead of display separators', async () => {
    const number = mountInForm(NumberInput, {
      name: 'amount', locale: 'de-DE', precision: 2, value: 1234.5, onchange: vi.fn(),
    });
    try {
      const field = numericInput(number.form);
      expect(field.hasAttribute('name')).toBe(false);
      expect(field.value).toBe('1.234,50');
      expect(number.form.querySelectorAll('[name="amount"]')).toHaveLength(1);
      const data = submitAndRead(number.form, number.submissions);
      expect(data?.getAll('amount')).toEqual(['1234.5']);
    } finally {
      number.dispose();
    }

    const percent = mountInForm(PercentInput, {
      name: 'rate', locale: 'de-DE', scale: '1', precision: 1, value: 0.25, onchange: vi.fn(),
    });
    try {
      const field = numericInput(percent.form);
      expect(field.value).toBe('25,0');
      await type(field, '25,5');
      const data = submitAndRead(percent.form, percent.submissions);
      expect(data?.getAll('rate')).toEqual(['0.255']);
    } finally {
      percent.dispose();
    }
  });

  it.each([
    ['null', null],
    ['zero', 0],
  ] as const)('submits %s without converting it to the other value', (label, value) => {
    const mounted = mountInForm(NumberInput, {
      name: 'amount', locale: 'en-US', value, onchange: vi.fn(),
    });
    try {
      const data = submitAndRead(mounted.form, mounted.submissions);
      expect(data?.getAll('amount')).toEqual([value === null ? '' : '0']);
      expect(label).toBe(value === null ? 'null' : 'zero');
    } finally {
      mounted.dispose();
    }
  });

  it('keeps required null unsubmittable while zero and disabled values stay distinct', async () => {
    const required = mountInForm(NumberInput, {
      name: 'amount', locale: 'en-US', required: true, value: null, onchange: vi.fn(),
    });
    try {
      expect(required.submissions).not.toHaveBeenCalled();
      expect(submitAndRead(required.form, required.submissions)).toBeNull();
      await required.view.rerender({ value: 0 });
      expect(submitAndRead(required.form, required.submissions)?.getAll('amount')).toEqual(['0']);
      await required.view.rerender({ disabled: true });
      expect(submitAndRead(required.form, required.submissions)?.has('amount')).toBe(false);
    } finally {
      required.dispose();
    }
  });
});

describe('localized numeric draft validation', () => {
  it('keeps an invalid mixed draft visible, blocks native submit, and clears after correction', async () => {
    const onchange = vi.fn();
    const mounted = mountInForm(NumberInput, {
      name: 'amount', locale: 'de-DE', value: 42.5, onchange,
    });
    try {
      const field = numericInput(mounted.form);
      await fireEvent.focus(field);
      await type(field, '1.234,50');
      expect(onchange).toHaveBeenLastCalledWith(1234.5);
      await type(field, '1,234.5');
      expect(onchange).toHaveBeenCalledTimes(1);
      expect(field.value).toBe('1,234.5');
      expect(field.getAttribute('aria-invalid')).toBe('true');
      expect(field.validationMessage).not.toBe('');
      expect(field.checkValidity()).toBe(false);
      expect(submitAndRead(mounted.form, mounted.submissions)).toBeNull();

      await fireEvent.blur(field);
      expect(field.value).toBe('1,234.5');
      expect(field.getAttribute('aria-invalid')).toBe('true');
      expect(submitAndRead(mounted.form, mounted.submissions)).toBeNull();

      await fireEvent.focus(field);
      await type(field, '43,5');
      expect(onchange).toHaveBeenLastCalledWith(43.5);
      expect(field.hasAttribute('aria-invalid')).toBe(false);
      expect(field.validationMessage).toBe('');
      expect(field.checkValidity()).toBe(true);
      const data = submitAndRead(mounted.form, mounted.submissions);
      expect(data?.getAll('amount')).toEqual(['43.5']);
    } finally {
      mounted.dispose();
    }
  });

  it('resets a retained invalid draft when the host supplies a new value', async () => {
    const mounted = mountInForm(NumberInput, {
      locale: 'de-DE', value: 12.5, onchange: vi.fn(),
    });
    try {
      const field = numericInput(mounted.form);
      await fireEvent.focus(field);
      await type(field, '1,234.5');
      await fireEvent.blur(field);
      expect(field.getAttribute('aria-invalid')).toBe('true');

      await mounted.view.rerender({ value: 20.5 });
      expect(field.value).toBe('20,5');
      expect(field.hasAttribute('aria-invalid')).toBe(false);
      expect(field.validationMessage).toBe('');
    } finally {
      mounted.dispose();
    }
  });
});

describe('localized numeric locale lifecycle', () => {
  it('clears a draft when the locale changes so old separators are not reinterpreted', async () => {
    const onchange = vi.fn();
    const mounted = mountInForm(NumberInput, {
      locale: 'en-US', value: 1.5, onchange,
    });
    try {
      const field = numericInput(mounted.form);
      await fireEvent.focus(field);
      await type(field, '1.234');
      expect(onchange).toHaveBeenLastCalledWith(1.234);
      expect(field.value).toBe('1.234');

      await mounted.view.rerender({ locale: 'de-DE', value: 1.234 });
      expect(field.value).toBe('1,234');
      expect(onchange).toHaveBeenLastCalledWith(1.234);
    } finally {
      mounted.dispose();
    }
  });

  it('clears an invalid draft when the locale changes', async () => {
    const mounted = mountInForm(NumberInput, {
      locale: 'de-DE', value: 42.5, onchange: vi.fn(),
    });
    try {
      const field = numericInput(mounted.form);
      await fireEvent.focus(field);
      await type(field, '1,234.5');
      expect(field.getAttribute('aria-invalid')).toBe('true');
      await mounted.view.rerender({ locale: 'en-US', value: 42.5 });
      expect(field.value).toBe('42.5');
      expect(field.hasAttribute('aria-invalid')).toBe(false);
      expect(field.validationMessage).toBe('');
    } finally {
      mounted.dispose();
    }
  });

  it('does not silently fall back to number for an unsupported runtime locale', () => {
    const mounted = mountInForm(NumberInput, {
      name: 'amount', value: 12.5, locale: 'fr-FR' as NumericInputLocale, onchange: vi.fn(),
    });
    try {
      const field = numericInput(mounted.form);
      expect(field.getAttribute('type')).toBe('text');
      expect(field.getAttribute('aria-invalid')).toBe('true');
      expect(field.validationMessage).not.toBe('');
      expect(new FormData(mounted.form).has('amount')).toBe(false);
      expect(submitAndRead(mounted.form, mounted.submissions)).toBeNull();
    } finally {
      mounted.dispose();
    }
  });

  it('does not swallow an unsupported field locale in FieldRenderer', () => {
    const view = render(FieldRenderer, {
      field: { key: 'amount', label: 'Amount', type: 'number', locale: 'fr-FR' },
      value: 12.5,
      onchange: vi.fn(),
    });
    const field = numericInput(view.container);
    expect(field.getAttribute('type')).toBe('text');
    expect(field.getAttribute('aria-invalid')).toBe('true');
    view.unmount();
  });
});

describe('localized numeric composition and disabled boundaries', () => {
  it('does not commit intermediate composition text and commits the final number once', async () => {
    const onchange = vi.fn();
    const mounted = mountInForm(NumberInput, {
      locale: 'en-US', value: 5, onchange,
    });
    try {
      const field = numericInput(mounted.form);
      await fireEvent.focus(field);
      await fireEvent.compositionStart(field);
      await type(field, '1,2');
      expect(onchange).not.toHaveBeenCalled();
      expect(field.value).toBe('1,2');

      field.value = '1,234.5';
      await fireEvent.compositionEnd(field);
      expect(onchange).toHaveBeenLastCalledWith(1234.5);
      expect(onchange).toHaveBeenCalledTimes(1);

      await type(field, '1,234.5');
      expect(onchange).toHaveBeenCalledTimes(1);
    } finally {
      mounted.dispose();
    }
  });

  it('ignores input and arrow keys while disabled', async () => {
    const onchange = vi.fn();
    const mounted = mountInForm(NumberInput, {
      locale: 'en-US', value: 5, disabled: true, onchange,
    });
    try {
      const field = numericInput(mounted.form);
      await type(field, '6');
      await fireEvent.keyDown(field, { key: 'ArrowUp' });
      await fireEvent.keyDown(field, { key: 'ArrowDown' });
      expect(onchange).not.toHaveBeenCalled();
    } finally {
      mounted.dispose();
    }
  });
});

describe('localized numeric stepping', () => {
  it('keeps any as the spinbutton step but steps by the default increment of one', async () => {
    const onchange = vi.fn();
    const view = render(NumberInput, { locale: 'en-US', value: 2, onchange });
    const field = numericInput(view.container);
    expect(field.getAttribute('step')).toBe('any');
    expect(field.getAttribute('role')).toBe('spinbutton');
    await fireEvent.keyDown(field, { key: 'ArrowUp' });
    expect(onchange).toHaveBeenLastCalledWith(3);
    await fireEvent.keyDown(field, { key: 'ArrowDown' });
    expect(onchange).toHaveBeenLastCalledWith(2);
    view.unmount();
  });

  it('does not round an explicit smaller step away with display precision', async () => {
    const precise = vi.fn();
    const preciseView = render(NumberInput, {
      locale: 'en-US', value: 1.23456, precision: 2, step: 0.001, onchange: precise,
    });
    await fireEvent.keyDown(numericInput(preciseView.container), { key: 'ArrowUp' });
    expect(precise).toHaveBeenLastCalledWith(1.23556);
    preciseView.unmount();

    const negative = vi.fn();
    const negativeView = render(NumberInput, {
      locale: 'en-US', value: 1.2, precision: -2, step: 0.001, onchange: negative,
    });
    await fireEvent.keyDown(numericInput(negativeView.container), { key: 'ArrowUp' });
    expect(negative).toHaveBeenLastCalledWith(1.201);
    negativeView.unmount();
  });

  it('uses the displayed percent step and clamps min/max before storing', async () => {
    const onchange = vi.fn();
    const view = render(PercentInput, {
      locale: 'en-US', scale: '1', value: 0.25, min: 0.25, max: 0.2515,
      precision: 1, step: 0.0005, onchange,
    });
    const field = numericInput(view.container);
    expect(field.getAttribute('step')).toBe('0.05');
    await fireEvent.keyDown(field, { key: 'ArrowUp' });
    expect(onchange).toHaveBeenLastCalledWith(0.2505);
    await fireEvent.keyDown(field, { key: 'ArrowUp' });
    await fireEvent.keyDown(field, { key: 'ArrowUp' });
    expect(onchange).toHaveBeenLastCalledWith(0.2515);
    await fireEvent.keyDown(field, { key: 'ArrowDown' });
    expect(onchange).toHaveBeenLastCalledWith(0.251);
    view.unmount();
  });
});

describe('localized numeric external value boundaries', () => {
  it('blocks an external value outside min/max without fabricating onchange and recovers when valid', async () => {
    const onchange = vi.fn();
    const mounted = mountInForm(NumberInput, {
      name: 'amount', locale: 'en-US', value: 5, min: 0, max: 10, onchange,
    });
    try {
      const field = numericInput(mounted.form);
      expect(submitAndRead(mounted.form, mounted.submissions)?.getAll('amount')).toEqual(['5']);

      await mounted.view.rerender({ value: 11 });
      expect(field.value).toBe('11');
      expect(field.getAttribute('aria-invalid')).toBe('true');
      expect(field.validationMessage).not.toBe('');
      expect(field.checkValidity()).toBe(false);
      expect(submitAndRead(mounted.form, mounted.submissions)).toBeNull();
      expect(mounted.form.querySelector<HTMLInputElement>('input[name="amount"]')?.disabled).toBe(true);

      await mounted.view.rerender({ value: -1 });
      expect(field.value).toBe('-1');
      expect(field.checkValidity()).toBe(false);
      expect(submitAndRead(mounted.form, mounted.submissions)).toBeNull();

      await mounted.view.rerender({ value: 8 });
      expect(field.hasAttribute('aria-invalid')).toBe(false);
      expect(field.validationMessage).toBe('');
      expect(field.checkValidity()).toBe(true);
      expect(submitAndRead(mounted.form, mounted.submissions)?.getAll('amount')).toEqual(['8']);
      expect(onchange).not.toHaveBeenCalled();
    } finally {
      mounted.dispose();
    }
  });

  it('clears a focused draft when an external boundary value becomes non-finite', async () => {
    const onchange = vi.fn();
    const mounted = mountInForm(NumberInput, {
      name: 'amount', locale: 'en-US', value: -1, min: 0, max: 10, onchange,
    });
    try {
      const field = numericInput(mounted.form);
      await fireEvent.focus(field);
      expect(field.value).toBe('-1');
      expect(field.getAttribute('aria-invalid')).toBe('true');

      await mounted.view.rerender({ value: Number.NaN });
      expect(field.value).toBe('');
      expect(field.getAttribute('aria-invalid')).toBe('true');
      expect(field.validationMessage).not.toBe('');
      expect(mounted.form.querySelector<HTMLInputElement>('input[name="amount"]')?.value).toBe('');
      expect(submitAndRead(mounted.form, mounted.submissions)).toBeNull();

      await mounted.view.rerender({ value: Number.NEGATIVE_INFINITY });
      expect(field.value).toBe('');
      expect(field.getAttribute('aria-invalid')).toBe('true');
      expect(submitAndRead(mounted.form, mounted.submissions)).toBeNull();

      await mounted.view.rerender({ value: -1 });
      expect(field.value).toBe('-1');
      expect(field.getAttribute('aria-invalid')).toBe('true');
      expect(onchange).not.toHaveBeenCalled();
    } finally {
      mounted.dispose();
    }
  });

  it('blocks non-finite externals and percent display overflow instead of submitting empty or untrusted values', async () => {
    const number = mountInForm(NumberInput, {
      name: 'amount', locale: 'en-US', value: Number.NaN, onchange: vi.fn(),
    });
    try {
      const field = numericInput(number.form);
      expect(field.value).toBe('');
      expect(field.getAttribute('aria-invalid')).toBe('true');
      expect(field.validationMessage).not.toBe('');
      expect(submitAndRead(number.form, number.submissions)).toBeNull();

      await number.view.rerender({ value: Number.POSITIVE_INFINITY });
      expect(field.checkValidity()).toBe(false);
      expect(submitAndRead(number.form, number.submissions)).toBeNull();

      await number.view.rerender({ value: 2.5 });
      expect(field.validationMessage).toBe('');
      expect(submitAndRead(number.form, number.submissions)?.getAll('amount')).toEqual(['2.5']);
    } finally {
      number.dispose();
    }

    const percent = mountInForm(PercentInput, {
      name: 'rate', locale: 'en-US', scale: '1', value: Number.MAX_VALUE, onchange: vi.fn(),
    });
    try {
      const field = numericInput(percent.form);
      expect(field.value).toBe('');
      expect(field.getAttribute('aria-invalid')).toBe('true');
      expect(field.validationMessage).not.toBe('');
      expect(submitAndRead(percent.form, percent.submissions)).toBeNull();

      await percent.view.rerender({ value: 0.5 });
      expect(field.value).toBe('50');
      expect(field.validationMessage).toBe('');
      expect(submitAndRead(percent.form, percent.submissions)?.getAll('rate')).toEqual(['0.5']);
    } finally {
      percent.dispose();
    }
  });
});

describe('localized numeric composition submission boundary', () => {
  it('blocks arrows and stale stored values while composing, then commits once for a valid end', async () => {
    const onchange = vi.fn();
    const mounted = mountInForm(NumberInput, {
      name: 'amount', locale: 'en-US', value: 5, onchange,
    });
    try {
      const field = numericInput(mounted.form);
      await fireEvent.focus(field);
      await fireEvent.keyDown(field, { key: 'ArrowUp', isComposing: true });
      expect(onchange).not.toHaveBeenCalled();

      await fireEvent.compositionStart(field);
      await fireEvent.keyDown(field, { key: 'ArrowDown' });
      expect(onchange).not.toHaveBeenCalled();
      expect(submitAndRead(mounted.form, mounted.submissions)).toBeNull();

      await type(field, '1,2');
      expect(onchange).not.toHaveBeenCalled();
      field.value = '6';
      await fireEvent.compositionEnd(field);
      expect(onchange).toHaveBeenLastCalledWith(6);
      expect(onchange).toHaveBeenCalledTimes(1);
      expect(submitAndRead(mounted.form, mounted.submissions)?.getAll('amount')).toEqual(['6']);

      await fireEvent.compositionStart(field);
      await type(field, '1,2');
      field.value = '1,2';
      await fireEvent.compositionEnd(field);
      expect(onchange).toHaveBeenCalledTimes(1);
      expect(field.getAttribute('aria-invalid')).toBe('true');
      expect(submitAndRead(mounted.form, mounted.submissions)).toBeNull();

      await type(field, '7');
      expect(onchange).toHaveBeenLastCalledWith(7);
      expect(onchange).toHaveBeenCalledTimes(2);
      expect(submitAndRead(mounted.form, mounted.submissions)?.getAll('amount')).toEqual(['7']);
    } finally {
      mounted.dispose();
    }
  });
});

describe('localized numeric strict type fixture', () => {
  it('compiles the locale allowlist and public wrappers in isolation', () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const fixture = resolve(directory, 'numeric-input-locale.test.type-fixture.ts');
    const sources = [
      'NumberInput.svelte',
      'MoneyInput.svelte',
      'PercentInput.svelte',
      'NumericInput.svelte',
    ].map(file => resolve(directory, file));
    const virtual = new Map<string, string>();
    for (const file of sources) {
      virtual.set(`${file}.tsx`, svelte2tsx(readFileSync(file, 'utf8'), {
        filename: file, isTsFile: true, mode: 'ts',
      }).code);
    }
    virtual.set(`${fixture}.tsx`, readFileSync(fixture, 'utf8'));
    const options: ts.CompilerOptions = {
      noEmit: true, strict: true, exactOptionalPropertyTypes: true, noUncheckedIndexedAccess: true,
      skipLibCheck: true, types: ['svelte', 'node'], target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
      jsx: ts.JsxEmit.Preserve,
    };
    const host = ts.createCompilerHost(options);
    const read = host.readFile;
    const exists = host.fileExists;
    host.readFile = file => virtual.get(file) ?? read(file);
    host.fileExists = file => virtual.has(file) || exists(file);
    host.resolveModuleNames = (names, containingFile) => names.map(name => {
      const candidate = resolve(dirname(containingFile), `${name}.tsx`);
      return virtual.has(candidate)
        ? { resolvedFileName: candidate, extension: ts.Extension.Tsx }
        : ts.resolveModuleName(name, containingFile, options, host).resolvedModule;
    });
    const program = ts.createProgram({
      rootNames: [...virtual.keys(),
        resolve(directory, '../../../../node_modules/svelte2tsx/svelte-shims-v4.d.ts'),
        resolve(directory, '../../../../node_modules/svelte2tsx/svelte-jsx-v4.d.ts'),
      ],
      options,
      host,
    });
    const errors = [...virtual.keys()].flatMap(file => {
      const source = program.getSourceFile(file);
      if (!source) throw new Error(`Missing source: ${file}`);
      return [...program.getSyntacticDiagnostics(source), ...program.getSemanticDiagnostics(source)];
    });
    expect(errors.map(error => ts.flattenDiagnosticMessageText(error.messageText, '\n'))).toEqual([]);
  }, 30_000);
});