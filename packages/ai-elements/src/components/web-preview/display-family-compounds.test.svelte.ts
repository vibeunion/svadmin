import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as Context from '../context/index.js';
import * as SchemaDisplay from '../schema-display/index.js';
import * as StackTrace from '../stack-trace/index.js';
import * as Terminal from '../terminal/index.js';
import * as TestResults from '../test-results/index.js';
import * as Transcription from '../transcription/index.js';
import * as WebPreview from './index.js';
import DisplayFamilyCompoundsHost from './display-family-compounds.test-host.svelte';

afterEach(cleanup);

describe('display family compound exports', () => {
  it.each([
    ['context', Context, ['Context', 'ContextTrigger', 'ContextContent', 'ContextContentHeader', 'ContextContentBody', 'ContextContentFooter', 'ContextInputUsage', 'ContextOutputUsage', 'ContextReasoningUsage', 'ContextCacheUsage']],
    ['schema-display', SchemaDisplay, ['SchemaDisplayHeader', 'SchemaDisplayMethod', 'SchemaDisplayPath', 'SchemaDisplayDescription', 'SchemaDisplayContent', 'SchemaDisplayParameter', 'SchemaDisplayParameters', 'SchemaDisplayProperty', 'SchemaDisplayRequest', 'SchemaDisplayResponse', 'SchemaDisplay', 'SchemaDisplayBody', 'SchemaDisplayExample']],
    ['stack-trace', StackTrace, ['StackTrace', 'StackTraceHeader', 'StackTraceError', 'StackTraceErrorType', 'StackTraceErrorMessage', 'StackTraceActions', 'StackTraceCopyButton', 'StackTraceExpandButton', 'StackTraceContent', 'StackTraceFrames']],
    ['terminal', Terminal, ['TerminalHeader', 'TerminalTitle', 'TerminalStatus', 'TerminalActions', 'TerminalCopyButton', 'TerminalClearButton', 'TerminalContent', 'Terminal']],
    ['test-results', TestResults, ['TestResultsHeader', 'TestResultsDuration', 'TestResultsSummary', 'TestResults', 'TestResultsProgress', 'TestResultsContent', 'TestSuite', 'TestSuiteName', 'TestSuiteStats', 'TestSuiteContent', 'TestName', 'TestDuration', 'TestStatus', 'Test', 'TestError', 'TestErrorMessage', 'TestErrorStack']],
    ['transcription', Transcription, ['Transcription', 'TranscriptionSegment']],
    ['web-preview', WebPreview, ['WebPreview', 'WebPreviewNavigation', 'WebPreviewNavigationButton', 'WebPreviewUrl', 'WebPreviewBody', 'WebPreviewConsole']],
  ] as const)('exports the official %s surface', (_family, module, names) => {
    for (const name of names) expect(module).toHaveProperty(name);
  });
});

describe('display family interactions', () => {
  it('coordinates context, schema, stack trace, tests, and transcription through providers', async () => {
    const onfilepathclick = vi.fn();
    const onseek = vi.fn();
    render(DisplayFamilyCompoundsHost, { onfilepathclick, onseek });

    expect(screen.getAllByText('75.0%')).toHaveLength(2);
    expect(screen.getByText('POST')).not.toBeNull();
    expect(screen.getByText('/users/{id}')).not.toBeNull();
    expect(screen.getByText('TypeError')).not.toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: '/workspace/app.ts:12:8' }));
    expect(onfilepathclick).toHaveBeenCalledWith('/workspace/app.ts', 12, 8);

    expect(screen.getByText('rejects invalid input')).not.toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: /unit/ }));
    expect(screen.queryByText('rejects invalid input')).toBeNull();

    expect(screen.getByRole('button', { name: 'Second segment' }).getAttribute('data-active')).toBe('true');
    await fireEvent.click(screen.getByRole('button', { name: 'First segment' }));
    expect(onseek).toHaveBeenCalledWith(0);
  });

  it('renders rejected terminal commands as visible error lines', async () => {
    render(DisplayFamilyCompoundsHost);
    const input = screen.getByRole('textbox', { name: 'Terminal command' });
    await userEvent.type(input, 'deploy{enter}');
    await waitFor(() => expect(screen.getByText('permission denied')).not.toBeNull());
    expect(screen.getByText('permission denied').closest('.svadmin-ai-terminal__line--error')).not.toBeNull();
  });

  it('keeps web URL, history, body, sandbox, reload, and console state in sync', async () => {
    const onurlchange = vi.fn();
    const { container } = render(DisplayFamilyCompoundsHost, { onurlchange });
    const address = screen.getByRole('textbox', { name: 'Preview address' });
    const iframe = () => container.querySelector('iframe');

    expect(iframe()?.getAttribute('src')).toBe('about:blank#one');
    expect(iframe()?.getAttribute('sandbox')).toBe('allow-scripts');
    const initialFrame = iframe();
    await fireEvent.click(screen.getByRole('button', { name: 'Reload preview' }));
    await waitFor(() => expect(iframe()).not.toBe(initialFrame));
    await userEvent.clear(address);
    await userEvent.type(address, 'about:blank#two{enter}');
    await waitFor(() => expect(iframe()?.getAttribute('src')).toBe('about:blank#two'));
    expect(onurlchange).toHaveBeenLastCalledWith('about:blank#two');

    await fireEvent.click(screen.getByRole('button', { name: 'Go back' }));
    await waitFor(() => expect(iframe()?.getAttribute('src')).toBe('about:blank#one'));
    expect((address as HTMLInputElement).value).toBe('about:blank#one');
    await fireEvent.click(screen.getByRole('button', { name: 'Go forward' }));
    await waitFor(() => expect(iframe()?.getAttribute('src')).toBe('about:blank#two'));
    await fireEvent.click(screen.getByRole('button', { name: 'Toggle console' }));
    expect(screen.getByText('Network is slow')).not.toBeNull();
  });
});
