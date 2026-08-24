import { describe, expect, it } from 'bun:test';
import { referenceDemoData } from '../packages/ui/src/reference-data.js';

describe('reference demo data contract', () => {
  it('covers the shared organization domains used by reference pages', () => {
    expect(referenceDemoData.organization.name).toBe('Acme Corporation');
    expect(referenceDemoData.members.length).toBeGreaterThan(0);
    expect(referenceDemoData.projects.length).toBeGreaterThan(0);
    expect(referenceDemoData.teams.length).toBeGreaterThan(0);
    expect(referenceDemoData.integrations.length).toBeGreaterThan(0);
    expect(referenceDemoData.apiKeys.length).toBeGreaterThan(0);
    expect(referenceDemoData.securityEvents.length).toBeGreaterThan(0);
    expect(referenceDemoData.notifications.length).toBeGreaterThan(0);
  });

  it('keeps status values compatible with shared semantic components', () => {
    expect(referenceDemoData.projects.every((project) => ['active', 'completed', 'on-hold'].includes(project.status))).toBe(true);
    expect(referenceDemoData.securityEvents.every((event) => ['info', 'warning', 'danger'].includes(event.severity))).toBe(true);
  });
});
