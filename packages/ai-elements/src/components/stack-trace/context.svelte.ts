import { createContext } from 'svelte';

export interface ParsedStackFrame {
  raw: string;
  functionName: string | null;
  filePath: string | null;
  lineNumber: number | null;
  columnNumber: number | null;
  isInternal: boolean;
}

export interface ParsedStackTrace {
  errorType: string | null;
  errorMessage: string;
  frames: ParsedStackFrame[];
  raw: string;
}

export interface StackTraceContextValue {
  readonly trace: ParsedStackTrace;
  readonly raw: string;
  readonly open: boolean;
  setOpen(open: boolean): void;
  readonly onFilePathClick?: (filePath: string, line?: number, column?: number) => void;
}

const [getStackTraceContext, setStackTraceContext] = createContext<StackTraceContextValue>();

export function provideStackTraceContext(value: StackTraceContextValue): StackTraceContextValue { setStackTraceContext(value); return value; }
export function useStackTraceContext(component = 'StackTrace component'): StackTraceContextValue { try { return getStackTraceContext(); } catch { throw new Error(`${component} must be used within StackTrace`); } }

export function parseStackTrace(raw: string): ParsedStackTrace {
  const lines = raw.split('\n').map((line) => line.trim()).filter(Boolean);
  const first = lines[0] ?? '';
  const errorMatch = first.match(/^(\w*Error|Error):\s*(.*)$/);
  const frameLines = errorMatch ? lines.slice(1) : lines;
  const frames = frameLines.filter((line) => line.startsWith('at ')).map((line): ParsedStackFrame => {
    const withFunction = line.match(/^at\s+(.+?)\s+\((.+):(\d+):(\d+)\)$/);
    const withoutFunction = line.match(/^at\s+(.+):(\d+):(\d+)$/);
    const functionName = withFunction?.[1] ?? null;
    const filePath = withFunction?.[2] ?? withoutFunction?.[1] ?? null;
    const lineNumber = Number(withFunction?.[3] ?? withoutFunction?.[2]) || null;
    const columnNumber = Number(withFunction?.[4] ?? withoutFunction?.[3]) || null;
    const isInternal = Boolean(filePath?.includes('node_modules') || filePath?.startsWith('node:') || filePath?.includes('internal/'));
    return { raw: line, functionName, filePath, lineNumber, columnNumber, isInternal };
  });
  return { errorType: errorMatch?.[1] ?? null, errorMessage: errorMatch?.[2] ?? first, frames, raw };
}
