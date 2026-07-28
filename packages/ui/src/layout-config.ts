export type AdminSidebarTheme = 'dark' | 'light';
export type AdminContentPadding = 'compact' | 'comfortable';

/**
 * Visual preferences for the admin shell.
 *
 * Defaults follow the compact Vben admin layout while remaining overridable
 * for applications that need a wider navigation rail or constrained content.
 */
export interface AdminLayoutConfig {
  sidebarWidth?: number;
  collapsedSidebarWidth?: number;
  headerHeight?: number;
  contentMaxWidth?: string;
  contentPadding?: AdminContentPadding;
  sidebarTheme?: AdminSidebarTheme;
}

export interface ResolvedAdminLayoutConfig {
  sidebarWidth: number;
  collapsedSidebarWidth: number;
  headerHeight: number;
  contentMaxWidth: string;
  contentPadding: AdminContentPadding;
  sidebarTheme: AdminSidebarTheme;
}

export const defaultAdminLayoutConfig: Readonly<ResolvedAdminLayoutConfig> = Object.freeze({
  sidebarWidth: 224,
  collapsedSidebarWidth: 60,
  headerHeight: 50,
  contentMaxWidth: 'none',
  contentPadding: 'comfortable',
  sidebarTheme: 'dark',
});

function positiveDimension(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}

export function resolveAdminLayoutConfig(config?: AdminLayoutConfig): ResolvedAdminLayoutConfig {
  return {
    sidebarWidth: positiveDimension(config?.sidebarWidth, defaultAdminLayoutConfig.sidebarWidth),
    collapsedSidebarWidth: positiveDimension(
      config?.collapsedSidebarWidth,
      defaultAdminLayoutConfig.collapsedSidebarWidth,
    ),
    headerHeight: positiveDimension(config?.headerHeight, defaultAdminLayoutConfig.headerHeight),
    contentMaxWidth: config?.contentMaxWidth?.trim() || defaultAdminLayoutConfig.contentMaxWidth,
    contentPadding: config?.contentPadding ?? defaultAdminLayoutConfig.contentPadding,
    sidebarTheme: config?.sidebarTheme ?? defaultAdminLayoutConfig.sidebarTheme,
  };
}
