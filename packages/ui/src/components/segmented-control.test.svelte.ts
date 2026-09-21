import { cleanup, fireEvent, render, within } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SegmentedControl from './SegmentedControl.svelte';
import ts from 'typescript';
import { svelte2tsx } from 'svelte2tsx';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { requireValue } from '../../../../scripts/test-assertions';
afterEach(cleanup);

describe('SegmentedControl', () => {
  it('strictly compiles the component and a narrow-value consumer', () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const filename = resolve(directory, 'SegmentedControl.svelte');
    const fixture = resolve(directory, 'segmented-control-type-fixture.svelte');
    const consumer = `<script lang="ts">
      import SegmentedControl from './SegmentedControl.svelte';
      type Mode = 'table' | 'board';
      let value = $state<Mode>('table');
      const options: readonly { value: Mode; label: string }[] = [
        { value: 'table', label: 'Table' }, { value: 'board', label: 'Board' },
      ];
      function change(next: Mode) { value = next; }
    </script>
    <SegmentedControl {options} bind:value ariaLabel="Mode" onchange={change} />`;
    const virtual = new Map([
      [filename, readFileSync(filename, 'utf8')], [fixture, consumer],
    ].map(([file, source]) => {
      if (!file || !source) throw new Error('Missing compilation input');
      return [`${file}.tsx`, svelte2tsx(source, { filename: file, isTsFile: true, mode: 'ts' }).code];
    }));
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
      return virtual.has(candidate) ? { resolvedFileName: candidate, extension: ts.Extension.Tsx }
        : ts.resolveModuleName(name, containingFile, options, host).resolvedModule;
    });
    const program = ts.createProgram({ rootNames: [...virtual.keys(),
      resolve(directory, '../../../../node_modules/svelte2tsx/svelte-shims-v4.d.ts'),
      resolve(directory, '../../../../node_modules/svelte2tsx/svelte-jsx-v4.d.ts'),
    ], options, host });
    const errors = [...virtual.keys()].flatMap(file => {
      const source = program.getSourceFile(file);
      if (!source) throw new Error(`Missing source: ${file}`);
      return [...program.getSyntacticDiagnostics(source), ...program.getSemanticDiagnostics(source)];
    });
    expect(errors.map(error => ts.flattenDiagnosticMessageText(error.messageText, '\n'))).toEqual([]);
  }, 30_000);

  const options = [
    { value: 'table', label: 'Table' },
    { value: 'board', label: 'Board' },
    { value: 'calendar', label: 'Calendar', disabled: true },
  ] as const;

  it('exposes radio semantics and selects with keyboard navigation', async () => {
    const onchange = vi.fn();
    const view = render(SegmentedControl, { options, ariaLabel: 'View mode', onchange, value: 'table' });
    const radios = view.getAllByRole('radio');
    expect(radios[0]?.getAttribute('aria-checked')).toBe('true');
    expect((radios[2] as HTMLButtonElement).disabled).toBe(true);
    await fireEvent.keyDown(requireValue(radios[0]), { key: 'ArrowRight' });
    expect(onchange).toHaveBeenLastCalledWith('board');
    expect(document.activeElement).toBe(radios[1]);
    expect(radios[1]?.getAttribute('aria-checked')).toBe('true');
  });

  it('wraps around enabled options and ignores disabled controls', async () => {
    const onchange = vi.fn();
    const view = render(SegmentedControl, { options, ariaLabel: 'View mode', onchange, value: 'board' });
    const radios = view.getAllByRole('radio');
    await fireEvent.keyDown(requireValue(radios[1]), { key: 'End' });
    expect(document.activeElement).toBe(radios[1]);
    await fireEvent.keyDown(requireValue(radios[1]), { key: 'ArrowRight' });
    expect(onchange).toHaveBeenLastCalledWith('table');
    expect(document.activeElement).toBe(radios[0]);
    await fireEvent.click(requireValue(radios[2]));
    expect(onchange).toHaveBeenLastCalledWith('table');
  });

  it('keeps focus within the active instance and supports RTL arrows', async () => {
    render(SegmentedControl, { options, ariaLabel: 'First', value: 'table' });
    const view = render(SegmentedControl, { options, ariaLabel: 'Second', value: 'table', dir: 'rtl' });
    const radios = within(view.getByRole('radiogroup', { name: 'Second' })).getAllByRole('radio');
    await fireEvent.keyDown(requireValue(radios[0]), { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(radios[1]);
    await fireEvent.keyDown(requireValue(radios[1]), { key: 'Home' });
    expect(document.activeElement).toBe(radios[0]);
  });

  it('retains an enabled tab stop for an unavailable selection and does not emit on reselection', async () => {
    const onchange = vi.fn();
    const view = render(SegmentedControl, { options, ariaLabel: 'Modes', value: 'calendar', onchange });
    const radios = view.getAllByRole('radio');
    expect(radios[0]?.getAttribute('tabindex')).toBe('0');
    expect(radios[2]?.getAttribute('tabindex')).toBe('-1');
    await fireEvent.click(requireValue(radios[0]));
    await fireEvent.click(requireValue(radios[0]));
    expect(onchange).toHaveBeenCalledTimes(1);
    await view.rerender({ disabled: true });
    await fireEvent.keyDown(requireValue(radios[0]), { key: 'ArrowRight' });
    expect(onchange).toHaveBeenCalledTimes(1);
  });

  it('handles empty and entirely disabled options without selecting a fallback', async () => {
    const onchange = vi.fn();
    const view = render(SegmentedControl, { options: [], ariaLabel: 'Empty', onchange });
    expect(view.queryAllByRole('radio')).toHaveLength(0);
    await view.rerender({ options: options.map(option => ({ ...option, disabled: true })) });
    for (const radio of view.getAllByRole('radio')) {
      expect(radio.getAttribute('tabindex')).toBe('-1');
      await fireEvent.keyDown(radio, { key: 'Home' });
    }
    expect(onchange).not.toHaveBeenCalled();
  });

  it('moves the tab stop after a selected option is removed without silently changing value', async () => {
    const onchange = vi.fn();
    const view = render(SegmentedControl, { options, value: 'board', ariaLabel: 'Mode', onchange });
    await view.rerender({ options: [options[0]] });
    const radio = view.getByRole('radio');
    expect(radio.getAttribute('tabindex')).toBe('0');
    expect(radio.getAttribute('aria-checked')).toBe('false');
    expect(onchange).not.toHaveBeenCalled();
    await fireEvent.keyDown(radio, { key: 'Enter' });
    expect(onchange).toHaveBeenCalledWith('table');
  });
});
