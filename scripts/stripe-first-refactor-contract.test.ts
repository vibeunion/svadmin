import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import utilityClasses from '../packages/ui/scripts/utility-class-map.json' with { type: 'json' };

const root = resolve(import.meta.dir, '..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

describe('Stripe-first refactor contract', () => {
  it('keeps the primary example workspaces on the shared page contract', () => {
    for (const page of [
      'features/dashboard/Dashboard.svelte',
    ]) {
      const source = read(`example/src/${page}`);
      expect(source).toContain('ContentPageShell');
      expect(source).toContain('ContentPageHeader');
      expect(source).not.toMatch(/bg-gradient|backdrop-blur/);
      expect(source).not.toMatch(/tracking-(?:tight|wide|wider|\[[^\]]+\])/);
      expect(source).not.toMatch(/rounded-(?:xl|2xl|3xl)/);
    }
    for (const page of [
      'features/people/UserManagementPage.svelte',
      'features/calendar/CalendarWorkspacePage.svelte',
      'features/crm/CrmDashboardPage.svelte',
      'features/mail/MailWorkspacePage.svelte',
      'features/ai/AiWorkspacePage.svelte',
      'features/property/RealEstateWorkspacePage.svelte',
      'features/planning/TodoWorkspacePage.svelte',
    ]) {
      const source = read(`example/src/${page}`);
      expect(source).toContain('ContentPageShell');
      expect(source).toContain('ContentPageHeader');
      expect(source).not.toMatch(/bg-gradient|backdrop-blur/);
      expect(source).not.toMatch(/tracking-(?:tight|wide|wider|\[[^\]]+\])/);
      expect(source).not.toMatch(/rounded-(?:xl|2xl|3xl)/);
    }
  });

  it('keeps operations pages data-driven, layout-specific, and Stripe-first', () => {
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

  it('keeps domain pages resource-specific, data-driven, and Stripe-first', () => {
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
    for (const layout of ['data-crm-account-layout', 'data-crm-contact-layout', 'data-crm-deal-layout', 'data-crm-activity-layout']) {
      expect(crm).toContain(layout);
    }
    const property = read('example/src/features/property/RealEstateWorkspacePage.svelte');
    for (const layout of ['data-property-agent-layout', 'data-property-lead-layout', 'data-property-showing-layout']) {
      expect(property).toContain(layout);
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
    // 配方几何与发布 CSS 由 packages/ui/scripts/product-recipes.test.mjs 验证，
    // 此处只验证组件绑定，避免把 Panda 构建工具类型带入 core tooling。
    expect(read('packages/ui/src/components/account/CompanyProfilePage.svelte')).toContain('<WorkspaceLayout');
    expect(read('packages/ui/src/components/account/UserProfilePage.svelte')).toContain('<WorkspaceLayout');
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
    // 原生 color input 需要具体颜色值；该演示值是唯一允许的例外。
    const allowedConcreteColorDemo = 'let demoColor = $state(\'#635bff\');';
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
              if (bareHex.test(line) && !(rel === 'example/src/features/showcase/DesignPrinciplesPage.svelte' && line.includes(allowedConcreteColorDemo))) {
                violations.push(`${rel}:${index + 1} bare hex color: ${line.trim()}`);
              }
            });
        }
      }
    };
    walk(resolve(root, 'example/src'));

    // Semantic utilities (text-success, bg-warning/10, text-muted-foreground,
    // …), chart-* decorative tokens, and var() references are allowed —
    // including behind variant prefixes like dark:. All other concrete colors
    // remain rejected by this contract.
    expect(violations).toEqual([]);
  });
});
