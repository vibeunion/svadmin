import { describe, expect, it } from 'vitest';
import * as publicApi from './index.js';
import {
  AI_ELEMENT_PARITY,
  AI_ELEMENT_PARITY_SUMMARY,
  AI_ELEMENTS_UPSTREAM_SNAPSHOT,
  type AIElementParityExport,
} from './parity-manifest.js';

const familyEntries = import.meta.glob('./components/*/index.ts', { eager: true });

function expectedStatus(exports: readonly AIElementParityExport[]) {
  if (exports.every(({ surfaceStatus }) => surfaceStatus === 'exact')) return 'exact';
  if (exports.some(({ surfaceStatus }) => surfaceStatus !== 'missing')) return 'fallback';
  return 'missing';
}

function breakdown(exports: readonly AIElementParityExport[]) {
  return {
    official: exports.length,
    exact: exports.filter(({ surfaceStatus }) => surfaceStatus === 'exact').length,
    fallback: exports.filter(({ surfaceStatus }) => surfaceStatus === 'fallback').length,
    missing: exports.filter(({ surfaceStatus }) => surfaceStatus === 'missing').length,
  };
}

describe('AI Elements parity manifest', () => {
  it('pins the audited 49-family upstream snapshot and exact export inventory', () => {
    expect(AI_ELEMENTS_UPSTREAM_SNAPSHOT).toEqual({
      repository: 'vercel/ai-elements',
      commit: '6a9d5b1822ffb10bba4bd97175f01edd7d8651cd',
      capturedAt: '2026-08-31',
      license: 'Apache-2.0',
    });
    expect(AI_ELEMENT_PARITY).toHaveLength(49);
    expect(new Set(AI_ELEMENT_PARITY.map(({ upstream }) => upstream)).size).toBe(49);
    expect(AI_ELEMENT_PARITY_SUMMARY.runtimeExports.official).toBe(398);
    expect(AI_ELEMENT_PARITY_SUMMARY.componentExports.official).toBe(383);
    expect(AI_ELEMENT_PARITY_SUMMARY.helperExports.official).toBe(15);
  });

  it('partitions every official export into one local parity status', () => {
    for (const entry of AI_ELEMENT_PARITY) {
      expect(entry.exports.map(({ upstream }) => upstream), entry.upstream).toEqual(
        entry.officialExports,
      );
      expect(new Set(entry.officialExports).size, entry.upstream).toBe(
        entry.officialExports.length,
      );

      const componentExports = entry.exports.filter(({ kind }) => kind === 'component');
      expect(entry.local.surfaceStatus, entry.upstream).toBe(expectedStatus(entry.exports));
      expect(entry.local.componentSurfaceStatus, entry.upstream).toBe(
        expectedStatus(componentExports),
      );
      expect(entry.local.exactExports, entry.upstream).toEqual(
        entry.exports
          .filter(({ surfaceStatus }) => surfaceStatus === 'exact')
          .map(({ upstream }) => upstream),
      );
      expect(entry.local.fallbackExports, entry.upstream).toEqual(
        entry.exports
          .filter(({ surfaceStatus }) => surfaceStatus === 'fallback')
          .map(({ upstream }) => upstream),
      );
      expect(entry.local.missingExports, entry.upstream).toEqual(
        entry.exports
          .filter(({ surfaceStatus }) => surfaceStatus === 'missing')
          .map(({ upstream }) => upstream),
      );
    }
  });

  it('verifies exact and fallback mappings against each local family entry point', () => {
    const staleMissingExports: string[] = [];
    const absentLocalExports: string[] = [];
    const actualExports: AIElementParityExport[] = [];

    for (const entry of AI_ELEMENT_PARITY) {
      const path = `./components/${entry.localDirectory}/index.ts`;
      const familyModule = familyEntries[path] as Record<string, unknown> | undefined;
      expect(familyModule, entry.upstream).toBeDefined();

      for (const exportEntry of entry.exports) {
        const localExportExists = Boolean(
          familyModule &&
            exportEntry.localExport &&
            Object.hasOwn(familyModule, exportEntry.localExport),
        );

        if (exportEntry.surfaceStatus === 'missing') {
          if (familyModule && Object.hasOwn(familyModule, exportEntry.upstream)) {
            staleMissingExports.push(`${entry.upstream}:${exportEntry.upstream}`);
          }
          actualExports.push({
            ...exportEntry,
            surfaceStatus: localExportExists ? 'exact' : 'missing',
          });
          continue;
        }

        expect(exportEntry.localExport, `${entry.upstream}:${exportEntry.upstream}`).toBeTruthy();
        if (!localExportExists) {
          absentLocalExports.push(
            `${entry.upstream}:${exportEntry.upstream} -> ${exportEntry.localExport}`,
          );
        }
        actualExports.push({
          ...exportEntry,
          surfaceStatus: localExportExists ? exportEntry.surfaceStatus : 'missing',
        });
      }
    }

    expect(staleMissingExports, 'new local exports must be classified').toEqual([]);
    expect(absentLocalExports, 'declared local exports must exist').toEqual([]);

    const actualComponents = actualExports.filter(({ kind }) => kind === 'component');
    const actualHelpers = actualExports.filter(({ kind }) => kind === 'helper');
    expect(breakdown(actualExports)).toEqual(AI_ELEMENT_PARITY_SUMMARY.runtimeExports);
    expect(breakdown(actualComponents)).toEqual(AI_ELEMENT_PARITY_SUMMARY.componentExports);
    expect(breakdown(actualHelpers)).toEqual(AI_ELEMENT_PARITY_SUMMARY.helperExports);
  });

  it('classifies the complete audited export surface as exact', () => {
    expect(AI_ELEMENT_PARITY_SUMMARY.families.surface).toEqual({
      exact: 49,
      fallback: 0,
      missing: 0,
    });
    expect(AI_ELEMENT_PARITY_SUMMARY.runtimeExports).toEqual({
      official: 398,
      exact: 398,
      fallback: 0,
      missing: 0,
    });
  });

  it('keeps the audited status totals explicit', () => {
    expect(AI_ELEMENT_PARITY_SUMMARY.families.total).toBe(49);
    expect(AI_ELEMENT_PARITY_SUMMARY.runtimeExports.official).toBe(398);
    expect(AI_ELEMENT_PARITY_SUMMARY.componentExports.official).toBe(383);
    expect(AI_ELEMENT_PARITY_SUMMARY.helperExports.official).toBe(15);

    for (const summary of [
      AI_ELEMENT_PARITY_SUMMARY.runtimeExports,
      AI_ELEMENT_PARITY_SUMMARY.componentExports,
      AI_ELEMENT_PARITY_SUMMARY.helperExports,
    ]) {
      expect(summary.exact + summary.fallback + summary.missing).toBe(summary.official);
    }

    expect(AI_ELEMENT_PARITY_SUMMARY.families.behavior).toEqual({
      verified: 0,
      partial: 0,
      intentionalDifference: 2,
      unverified: 47,
    });
    expect(AI_ELEMENT_PARITY_SUMMARY.families.visual).toEqual({
      verified: 0,
      partial: 0,
      intentionalDifference: 0,
      unverified: 49,
    });
  });

  it('exports every official runtime name and compound namespace from the package root', () => {
    for (const entry of AI_ELEMENT_PARITY) {
      expect(publicApi, entry.exportName).toHaveProperty(entry.exportName);
      expect(publicApi, entry.namespaceExport).toHaveProperty(entry.namespaceExport);
      expect(
        publicApi[entry.namespaceExport as keyof typeof publicApi],
        entry.namespaceExport,
      ).toHaveProperty('Root');

      for (const officialExport of entry.officialExports) {
        expect(publicApi, `${entry.upstream}:${officialExport}`).toHaveProperty(
          officialExport,
        );
      }
    }
  });

  it('exports the additional Vue compatibility surface from the package root', () => {
    for (const exportName of [
      'MessageAvatar',
      'Animated',
      'Temporary',
      'provideWebPreviewContext',
      'useWebPreviewContext',
    ]) {
      expect(publicApi, exportName).toHaveProperty(exportName);
    }
  });
});
