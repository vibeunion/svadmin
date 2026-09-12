/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  I18nProvider,
  ProviderBundle,
} from '@svadmin/core';

/**
 * Composable provider configuration for AdminApp.
 *
 * Legacy top-level props remain supported and take precedence over matching fields here when both are provided.
 * Access control only affects browser rendering; the backend must still authenticate independently.
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
