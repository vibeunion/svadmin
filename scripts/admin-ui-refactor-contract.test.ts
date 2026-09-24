import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import utilityClasses from '../packages/ui/scripts/utility-class-map.json' with { type: 'json' };

const root = resolve(import.meta.dir, '..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

describe('Admin UI refactor contract', () => {
  it('keeps the primary example workspaces on the shared page contract', () => {
    for (const page of [
      'features/dashboard/Dashboard.svelte',
      'features/crm/CrmDashboardPage.svelte',
      'features/people/UserManagementPage.svelte',
      'features/ai/AiWorkspacePage.svelte',
      'features/mail/MailWorkspacePage.svelte',
      'features/calendar/CalendarWorkspacePage.svelte',
      'features/property/RealEstateWorkspacePage.svelte',
      'features/planning/TodoWorkspacePage.svelte',
    ]) {
      const source = read(`example/src/${page}`);
      // The dashboard composes the shared DashboardPage shell, which itself wraps
      // ContentPageShell; the other workspaces use ContentPageShell directly.
      const usesDashboardShell = page === 'features/dashboard/Dashboard.svelte';
      expect(source).toContain(usesDashboardShell ? 'DashboardPage' : 'ContentPageShell');
      if (!usesDashboardShell) expect(source).toContain('ContentPageHeader');
      expect(source).not.toMatch(/bg-gradient|backdrop-blur/);
      expect(source).not.toMatch(/tracking-(?:tight|wide|wider|\[[^\]]+\])/);
      expect(source).not.toMatch(/rounded-(?:xl|2xl|3xl)/);
    }
  });

  it('keeps operations pages data-driven, layout-specific, and Admin UI', () => {
    const source = read('example/src/features/operations/OperationsWorkspacePage.svelte');
    expect(source).toContain('ContentPageShell');
    expect(source).toContain('MetricBlock');
    expect(source).toContain('useList');
    expect(source).toContain('data-operations-record-toggle');
    expect(source).toMatch(/\{#if !hasError && !isLoading && showRecords\}[\s\S]*<AutoTable \{resourceName\} rendering=\{demoRendering\(resourceName\)\} \/>[\s\S]*\{\/if\}/);
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

  it('keeps domain pages resource-specific, data-driven, and Admin UI', () => {
    const source = read('example/src/features/domain/DomainWorkspacePage.svelte');
    expect(source).toContain('ContentPageShell');
    expect(source).toContain('MetricBlock');
    expect(source).toContain('useList');
    expect(source).toContain('data-domain-record-toggle');
    expect(source).toMatch(/\{#if showRecords\}[\s\S]*<AutoTable \{resourceName\} rendering=\{demoRendering\(resourceName\)\} \/>[\s\S]*\{\/if\}/);
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
    const crm = read('example/src/features/crm/CrmDashboardPage.svelte');
    const property = read('example/src/features/property/RealEstateWorkspacePage.svelte');
    // 页面已扁平化；资源隔离、筛选与导航由 pm-business-pages 的挂载测试验证。
    for (const source of [crm, property]) {
      expect(source).toContain('data-resource-name={resourceName}');
      expect(source).toContain('<WorkspaceQueryState');
      expect(source).toContain('<WorkspaceRecordLinks');
    }
  });

  it('keeps the user workspace focused and reveals CRUD records on demand', () => {
    const source = read('example/src/features/people/UserManagementPage.svelte');
    expect(source).toContain('data-user-record-toggle');
    expect(source).toMatch(/\{#if showRecords\}[\s\S]*<AutoTable \{resourceName\} rendering=\{demoRendering\(resourceName\)\} \/>[\s\S]*\{\/if\}/);
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
    for (const page of ['SettingsSidebarPage.svelte', 'SettingsEnterprisePage.svelte']) {
      expect(read(`packages/ui/src/components/account/${page}`)).toContain('<SettingsGroup');
    }
    const plainSettings = read('packages/ui/src/components/account/SettingsPlainPage.svelte');
    for (const component of ['ContentPageShell', 'ProfilePage', 'NotificationsSettings', 'SecuritySettings']) {
      expect(plainSettings).toContain(`<${component}`);
    }
    const company = read('packages/ui/src/components/account/CompanyProfilePage.svelte');
    expect(company).toContain('<ContentPageShell');
    expect(company).toContain('<DataState');
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
    const integrations = read('packages/ui/src/components/IntegrationsSettings.svelte');
    expect(integrations).toContain('onConnectionChange?: (id: string, connected: boolean)');
    expect(integrations).toContain("i18n.t('integrations.statusProvidedByHost')");
    expect(integrations).not.toContain('toggleConnection');
    expect(integrations).not.toContain("connected: true");
    expect(integrations).not.toContain("connected: false");
    expect(read('packages/ui/src/components/AboutSettings.svelte')).toContain('<SettingsGroup');
    expect(read('packages/ui/src/components/SettingsPage.svelte')).not.toContain('tracking-wider');
    const workspace = read('packages/ui/src/components/content/WorkspaceLayout.svelte');
    expect(workspace).toContain('$derived(productWorkspace({ hasSecondary: Boolean(secondary) }))');
    expect(workspace).toContain('class={styles.columns}');
    // 配方几何与发布 CSS 由 tailwind-recipes 和浏览器检查验证；这里仅检查装配边界。
    expect(read('packages/ui/src/components/account/CompanyProfilePage.svelte')).toContain('<ContentPageShell');
    expect(read('packages/ui/src/components/account/UserProfilePage.svelte')).toContain('<ProfilePage');
    expect(read('packages/ui/src/components/account/SettingsEnterprisePage.svelte')).toContain(`${utilityClasses.grid} ${utilityClasses['items-start']}`);
  });

  it('keeps example sources on semantic color tokens (no bare palette utilities or hex)', () => {
    // Bare Tailwind palette utilities, e.g. text-green-500, dark:bg-emerald-600.
    const paletteUtility =
      /\b(?:text|bg|border|ring|fill|stroke|from|via|to|divide|outline|decoration|caret|accent|placeholder)-(?:green|emerald|teal|cyan|sky|amber|red|rose|orange|yellow|lime|blue|indigo|violet|fuchsia|purple|pink|zinc|gray|slate|neutral|stone)-(?:50|[1-9]00|950)\b/;
    // Bare #hex colors; the lookbehind skips HTML entities (&#039;) and
    // non-color strings embedding `#` after a word character (tag#1234).
    const bareHex = /(?<![\w&])#[0-9a-fA-F]{3,8}\b/;

    const violations: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = resolve(dir, entry.name);
        if (entry.isDirectory()) {
          walk(path);
        } else if (/\.(?:svelte|ts|css)$/.test(entry.name)) {
          const rel = relative(root, path);
          readFileSync(path, 'utf8')
            .split('\n')
            .forEach((line, index) => {
              if (paletteUtility.test(line)) violations.push(`${rel}:${index + 1} bare palette utility: ${line.trim()}`);
              if (bareHex.test(line)) violations.push(`${rel}:${index + 1} bare hex color: ${line.trim()}`);
            });
        }
      }
    };
    walk(resolve(root, 'example/src'));

    // Semantic utilities (text-success, bg-warning/10, text-muted-foreground,
    // …), chart-* decorative tokens, and var() references are allowed —
    // including behind variant prefixes like dark:. Demo data colors that must
    // be concrete (e.g. user-provided values) need an explicit allowlist entry
    // here with a reason; keep it empty unless one is genuinely required.
    expect(violations).toEqual([]);
  });
});
