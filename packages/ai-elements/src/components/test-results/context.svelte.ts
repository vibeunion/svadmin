import { createContext } from 'svelte';
import type { TestResultStatus } from './TestResults.svelte';

export interface TestResultsSummaryData { passed: number; failed: number; skipped: number; total: number; duration?: number; }
export interface TestResultsContextValue { readonly summary?: TestResultsSummaryData; }
export interface TestSuiteContextValue { readonly name: string; readonly status: TestResultStatus; readonly open: boolean; setOpen(open: boolean): void; }
export interface TestContextValue { readonly name: string; readonly status: TestResultStatus; readonly duration?: number; }

const [getResultsContext, setResultsContext] = createContext<TestResultsContextValue>();
const [getSuiteContext, setSuiteContext] = createContext<TestSuiteContextValue>();
const [getTestContext, setTestContext] = createContext<TestContextValue>();

export function provideTestResultsContext(value: TestResultsContextValue): TestResultsContextValue { setResultsContext(value); return value; }
export function useTestResultsContext(component = 'TestResults component'): TestResultsContextValue { try { return getResultsContext(); } catch { throw new Error(`${component} must be used within TestResults`); } }
export function provideTestSuiteContext(value: TestSuiteContextValue): TestSuiteContextValue { setSuiteContext(value); return value; }
export function useTestSuiteContext(component = 'TestSuite component'): TestSuiteContextValue { try { return getSuiteContext(); } catch { throw new Error(`${component} must be used within TestSuite`); } }
export function provideTestContext(value: TestContextValue): TestContextValue { setTestContext(value); return value; }
export function useTestContext(component = 'Test component'): TestContextValue { try { return getTestContext(); } catch { throw new Error(`${component} must be used within Test`); } }
export function formatTestDuration(ms?: number): string { if (ms === undefined || !Number.isFinite(ms)) return ''; return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`; }
