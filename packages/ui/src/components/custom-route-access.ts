import type { MenuItem } from '@svadmin/core';

/** 自定义页面的直接访问权限。与菜单 `meta.resource` / `meta.action` 使用同一套检查。 */
export interface CustomRouteAccessConfig {
  readonly resource: string;
  /** 缺省为 `list`，与侧栏菜单一致。 */
  readonly action?: string;
  readonly id?: string | number;
  /** 从匹配到的路由参数读取记录 id，用于带参数的直接 URL。 */
  readonly idParam?: string;
}

export interface CustomRouteAccess {
  readonly resource: string;
  readonly action: string;
  readonly id?: string | number;
}

export interface CustomRouteAccessSource {
  /**
   * 显式权限覆盖菜单继承。`false` 表示该路由保持公开，即使同路径菜单受保护。
   */
  readonly access?: CustomRouteAccessConfig | false;
}

export function normalizeNavPath(value: string | undefined): string {
  if (!value) return '';
  const path = value.replace(/^#/, '').split(/[?#]/)[0] || '/';
  if (path === '/') return '/';
  const withSlash = path.startsWith('/') ? path : `/${path}`;
  return withSlash.replace(/\/+$/, '');
}

interface ScoredMenuItem {
  score: number;
  item: MenuItem;
}

function consider(item: MenuItem, current: string, best: ScoredMenuItem | undefined): ScoredMenuItem | undefined {
  const href = normalizeNavPath(item.href);
  if (href) {
    const exact = href === current;
    const prefix = href !== '/' && current.startsWith(`${href}/`);
    if (exact || prefix) {
      const score = (exact ? 1_000_000 : 0) + href.length;
      if (!best || score > best.score) best = { score, item };
    }
  }
  for (const child of item.children ?? []) best = consider(child, current, best);
  return best;
}

function inheritedMenuAccess(menu: readonly MenuItem[] | undefined, pathname: string): CustomRouteAccess | undefined {
  const current = normalizeNavPath(pathname);
  if (!current) return undefined;
  let best: ScoredMenuItem | undefined;
  for (const item of menu ?? []) best = consider(item, current, best);
  const resource = best?.item.meta?.resource;
  if (!resource) return undefined;
  const action = best?.item.meta?.action;
  return { resource, action: action && action.length > 0 ? action : 'list' };
}

/**
 * 自定义路由的直接 URL 权限。
 * 显式 `access` 优先；否则继承当前 URL 上最具体的菜单项。
 * 更具体的菜单项没有 `meta.resource` 时视为公开，不回退到父级。
 */
export function resolveCustomRouteAccess(
  route: CustomRouteAccessSource,
  pathname: string,
  menu: readonly MenuItem[] | undefined,
  params: Record<string, string | undefined> = {},
): CustomRouteAccess | undefined {
  if (route.access === false) return undefined;
  if (route.access) {
    const action = route.access.action && route.access.action.length > 0 ? route.access.action : 'list';
    const paramId = route.access.idParam ? params[route.access.idParam] : undefined;
    const id = route.access.id !== undefined ? route.access.id : paramId;
    return {
      resource: route.access.resource,
      action,
      ...(id !== undefined && id !== '' ? { id } : {}),
    };
  }
  return inheritedMenuAccess(menu, pathname);
}
