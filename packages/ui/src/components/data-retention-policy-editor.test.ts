import { describe, expect, it } from 'vitest';
import {
  calculateRetentionMetrics,
  detectPolicyConflicts,
  type RetentionPolicy,
} from './retention-utils.js';

describe('DataRetentionPolicyEditor Metrics & Conflict Detection', () => {
  const policies: RetentionPolicy[] = [
    {
      id: 'p-1',
      name: 'Audit Log Retention',
      resource: 'audit_logs',
      retentionDays: 180,
      action: 'archive_cold_storage',
      status: 'active',
      estimatedRows: 1000000,
      estimatedStorageMb: 2048,
    },
    {
      id: 'p-2',
      name: 'Temp Exports Hard Delete',
      resource: 'temp_exports',
      retentionDays: 7,
      action: 'hard_delete',
      status: 'active',
      estimatedRows: 5000,
      estimatedStorageMb: 1024,
    },
    {
      id: 'p-3',
      name: 'Notifications Soft Clean',
      resource: 'notifications',
      retentionDays: 30,
      action: 'soft_delete',
      status: 'paused', // paused
      estimatedRows: 50000,
      estimatedStorageMb: 512,
    },
  ];

  it('calculates aggregate metrics for active policies only', () => {
    const metrics = calculateRetentionMetrics(policies);
    expect(metrics.totalPolicies).toBe(3);
    expect(metrics.activePolicies).toBe(2);
    expect(metrics.totalEstimatedRows).toBe(1005000);
    // 2048 + 1024 = 3072 MB -> 3.00 GB
    expect(metrics.totalEstimatedStorageGb).toBe(3);
    // cold storage only: 2048 MB -> 2.00 GB
    expect(metrics.archivedToColdStorageGb).toBe(2);
  });

  it('detects multiple concurrent active policies on the same resource', () => {
    const conflictingPolicies: RetentionPolicy[] = [
      ...policies,
      {
        id: 'p-4',
        name: 'Duplicate Audit Log Rule',
        resource: 'audit_logs',
        retentionDays: 90,
        action: 'hard_delete',
        status: 'active',
        estimatedRows: 200000,
        estimatedStorageMb: 500,
      },
    ];

    const warnings = detectPolicyConflicts(conflictingPolicies);
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toContain('audit_logs');
  });

  it('produces zero conflict warnings when policies target distinct resources', () => {
    const warnings = detectPolicyConflicts(policies);
    expect(warnings.length).toBe(0);
  });
});
