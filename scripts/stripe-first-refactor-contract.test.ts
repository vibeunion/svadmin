import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

describe('Stripe-first refactor contract', () => {
  it('keeps the primary example workspaces on the shared page contract', () => {
    for (const page of [
      'Dashboard.svelte',
      'CrmDashboardPage.svelte',
      'UserManagementPage.svelte',
      'AiWorkspacePage.svelte',
      'MailWorkspacePage.svelte',
      'CalendarWorkspacePage.svelte',
      'RealEstateWorkspacePage.svelte',
      'TodoWorkspacePage.svelte',
    ]) {
      const source = read(`example/src/pages/${page}`);
      expect(source).toContain('ContentPageShell');
      expect(source).toContain('ContentPageHeader');
      expect(source).not.toMatch(/bg-gradient|backdrop-blur/);
      expect(source).not.toMatch(/tracking-(?:tight|wide|wider|\[[^\]]+\])/);
      expect(source).not.toMatch(/rounded-(?:xl|2xl|3xl)/);
    }
  });

  it('keeps auth flows on one restrained shell', () => {
    expect(read('packages/ui/src/index.ts')).toContain("export { default as AuthPageShell }");
    expect(read('packages/ui/src/components/SvadminLogo.svelte')).not.toMatch(/gradient|purple-/);
    for (const page of ['LoginPage.svelte', 'RegisterPage.svelte', 'ForgotPasswordPage.svelte', 'UpdatePasswordPage.svelte']) {
      const source = read(`packages/ui/src/components/${page}`);
      expect(source).toContain('<AuthPageShell');
      expect(source).not.toMatch(/bg-gradient|backdrop-blur|radial-gradient/);
      expect(source).not.toMatch(/rounded-(?:xl|2xl|3xl)/);
    }
  });

  it('keeps settings, list states, and network cards on shared primitives', () => {
    for (const page of ['SettingsPlainPage.svelte', 'SettingsSidebarPage.svelte', 'SettingsEnterprisePage.svelte', 'CompanyProfilePage.svelte']) {
      expect(read(`packages/ui/src/components/account/${page}`)).toContain('<SettingsGroup');
    }
    for (const component of ['ApiKeyList.svelte', 'MemberList.svelte', 'FileList.svelte', 'SecurityEventTable.svelte', 'NetworkTable.svelte']) {
      expect(read(`packages/ui/src/components/content/${component}`)).toContain('<DataState');
    }
    expect(read('packages/ui/src/components/network/UserCardsNFTPage.svelte')).toContain('<NetworkUserCard');
  });
});
