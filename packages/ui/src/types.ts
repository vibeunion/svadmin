/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  I18nProvider,
  ProviderBundle,
} from '@svadmin/core';

/**
 * AdminApp 的可组合 provider 配置。
 *
 * 旧版顶层 props 仍然可用，且在同时传入时优先于这里的同名配置。
 * Access control 仅控制浏览器端呈现，后端仍必须独立鉴权。
 */
export type AdminProviderBundle = ProviderBundle & {
  /** UI-only locale integration; all other fields come from Core's canonical ProviderBundle. */
  readonly i18nProvider?: I18nProvider;
};

export type RoleInfo = { code: string; name: string; [key: string]: any };
export type ResourceInfo = { code: string; name: string; section?: string; [key: string]: any };
export type ActionInfo = { code: string; name: string; [key: string]: any };

export interface Tenant {
  id: string;
  name: string;
  logo?: string;
  [key: string]: unknown;
}

export interface GridModule {
  id: string;
  w: number;
  h: number;
  x: number;
  y: number;
  title?: string;
  componentProps?: any; // Component specific props
}
