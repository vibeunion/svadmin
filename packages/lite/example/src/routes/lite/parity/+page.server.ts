import parityReportSource from '../../../../../parity.json';
import type { PageServerLoad } from './$types';

export interface ParityCategorySummary {
  category: string;
  total: number;
  adapted: number;
  fallback: number;
  spaOnly: number;
  missing: number;
  percentage: number;
}

export interface ParityItem {
  name: string;
  uiComponent: string;
  liteComponent?: string;
  category: string;
  status: 'exact' | 'fallback' | 'spa_only' | 'missing';
  strategy: string;
  note?: string;
}

export interface ParityReportData {
  timestamp: string;
  totalComponents: number;
  adaptedCount: number;
  fallbackCount: number;
  spaOnlyCount: number;
  missingCount: number;
  overallCoveragePercentage: number;
  categories: Record<string, ParityCategorySummary>;
  items: ParityItem[];
}

export const load = (() => {
  return {
    parityReport: parityReportSource as ParityReportData,
  };
}) satisfies PageServerLoad;
