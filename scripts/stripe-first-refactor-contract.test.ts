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

  it('keeps operations pages data-driven, layout-specific, and Stripe-first', () => {
    const source = read('example/src/pages/OperationsWorkspacePage.svelte');
    expect(source).toContain('ContentPageShell');
    expect(source).toContain('MetricBlock');
    expect(source).toContain('useList');
    expect(source).toContain('data-operations-record-toggle');
    expect(source).toMatch(/\{#if !hasError && !isLoading && showRecords\}[\s\S]*<AutoTable \{resourceName\} \/>[\s\S]*\{\/if\}/);
    for (const layout of [
      'data-stock-movement-layout',
      'data-stock-transfer-layout',
      'data-cycle-count-layout',
      'data-adjustment-layout',
      'data-reorder-layout',
      'data-order-layout',
    ]) expect(source).toContain(layout);
    expect(source).not.toMatch(/bg-gradient|backdrop-blur/);
    expect(source).not.toMatch(/tracking-(?:tight|wide|wider|\[[^\]]+\])/);
    expect(source).not.toMatch(/rounded-(?:xl|2xl|3xl)/);
  });

  it('keeps domain pages resource-specific, data-driven, and Stripe-first', () => {
    const source = read('example/src/pages/DomainWorkspacePage.svelte');
    expect(source).toContain('ContentPageShell');
    expect(source).toContain('MetricBlock');
    expect(source).toContain('useList');
    expect(source).toContain('data-domain-record-toggle');
    expect(source).toMatch(/\{#if showRecords\}[\s\S]*<AutoTable \{resourceName\} \/>[\s\S]*\{\/if\}/);
    for (const layout of [
      'data-product-catalog-layout',
      'data-sku-directory-layout',
      'data-category-structure-layout',
      'data-supplier-directory-layout',
      'data-warehouse-capacity-layout',
      'data-store-order-layout',
      'data-billing-invoice-layout',
      'data-session-monitor-layout',
      'data-notification-center-layout',
      'data-project-plan-layout',
      'data-referral-invite-layout',
    ]) expect(source).toContain(layout);
    expect(source).not.toMatch(/bg-gradient|backdrop-blur/);
    expect(source).not.toMatch(/tracking-(?:tight|wide|wider|\[[^\]]+\])/);
    expect(source).not.toMatch(/rounded-(?:xl|2xl|3xl)/);
  });

  it('keeps CRM and property entity routes focused on their own workflows', () => {
    const crm = read('example/src/pages/CrmDashboardPage.svelte');
    for (const layout of ['data-crm-account-layout', 'data-crm-contact-layout', 'data-crm-deal-layout', 'data-crm-activity-layout']) {
      expect(crm).toContain(layout);
    }
    const property = read('example/src/pages/RealEstateWorkspacePage.svelte');
    for (const layout of ['data-property-agent-layout', 'data-property-lead-layout', 'data-property-showing-layout']) {
      expect(property).toContain(layout);
    }
  });

  it('keeps the user workspace focused and reveals CRUD records on demand', () => {
    const source = read('example/src/pages/UserManagementPage.svelte');
    expect(source).toContain('data-user-record-toggle');
    expect(source).toMatch(/\{#if showRecords\}[\s\S]*<AutoTable \{resourceName\} \/>[\s\S]*\{\/if\}/);
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

  it('keeps built-in settings pages on the shared hierarchy and responsive workspace contract', () => {
    const apiSettings = read('packages/ui/src/components/ApiSettings.svelte');
    expect(apiSettings).toContain('<WorkspaceLayout');
    expect(apiSettings).toContain('<ApiKeyList');
    expect(apiSettings).toContain('<DataState');
    expect(apiSettings).not.toContain('lg:grid-cols-3');
    expect(apiSettings.indexOf('{#snippet primary()}')).toBeLessThan(apiSettings.indexOf('{#snippet secondary()}'));
    expect(apiSettings.indexOf("title={i18n.t('api.webhooks')}")).toBeLessThan(apiSettings.indexOf('{#snippet secondary()}'));

    for (const page of ['SecuritySettings.svelte', 'NotificationsSettings.svelte', 'AppearanceSettings.svelte', 'IntegrationsSettings.svelte']) {
      const source = read(`packages/ui/src/components/${page}`);
      expect(source).toContain('<SettingsGroup');
      expect(source).toContain('<SettingsFieldRow');
      expect(source).not.toMatch(/tracking-(?:tight|wide|wider|\[[^\]]+\])/);
      expect(source).not.toMatch(/rounded-(?:xl|2xl|3xl)/);
    }
    expect(read('packages/ui/src/components/AboutSettings.svelte')).toContain('<SettingsGroup');
    expect(read('packages/ui/src/components/SettingsPage.svelte')).not.toContain('tracking-wider');
    expect(read('packages/ui/src/components/content/WorkspaceLayout.svelte')).toContain('items-start');
    expect(read('packages/ui/src/components/account/CompanyProfilePage.svelte')).toContain('<WorkspaceLayout');
    expect(read('packages/ui/src/components/account/UserProfilePage.svelte')).toContain('<WorkspaceLayout');
    expect(read('packages/ui/src/components/account/SettingsEnterprisePage.svelte')).toContain('grid items-start');
  });
});
