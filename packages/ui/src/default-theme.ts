import type { ThemeConfig } from '@svadmin/core';

/** UI 默认值不改变 headless core 的主题归属规则，也不覆盖已保存的配色。 */
export function resolveAdminThemeConfig(config?: ThemeConfig): ThemeConfig {
  return { ...config, layoutPreset: config?.layoutPreset ?? 'clean-flat' };
}
