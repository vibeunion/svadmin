// Permission / Access Control

// ─── Types ────────────────────────────────────────────────────

/** Actions that can be checked for access control. Extensible via string literal union. */
export type Action = 'list' | 'show' | 'create' | 'edit' | 'delete' | 'export' | 'field' | (string & {});

export interface CanParams {
  resource: string;
  action: Action;
  params?: { id?: string | number; [key: string]: unknown };
  meta?: Record<string, unknown>;
}

export interface CanResult {
  can: boolean;
  reason?: string;
}



/**
 * UI access-control integration point.
 * It can mirror a backend policy decision for navigation and controls, but browser
 * checks never authorize an API request. The backend must enforce the same policy.
 *
 * @example
 * ```ts
 * const accessControlProvider: AccessControlProvider = {
 *   can: async ({ resource, action, params }) => {
 *     if (resource === 'users' && action === 'delete') {
 *       return { can: false, reason: 'Cannot delete users' };
 *     }
 *     return { can: true };
 *   },
 *   options: {
 *     buttons: { enableAccessControl: true, hideIfUnauthorized: false },
 *   },
 * };
 * ```
 */
export interface AccessControlProvider {
  can: (params: CanParams | CanParams[]) => Promise<CanResult | CanResult[]>;
  options?: {
    buttons?: {
      /** Enable access control checks on CRUD buttons globally. Default: false */
      enableAccessControl?: boolean;
      /** Hide buttons when unauthorized instead of disabling. Default: false */
      hideIfUnauthorized?: boolean;
    };
  };
}

// ─── State ────────────────────────────────────────────────────

let provider: AccessControlProvider | null = $state(null);

// ─── API ──────────────────────────────────────────────────────

/**
 * Register an AccessControlProvider.
 */
export function setAccessControlProvider(p: AccessControlProvider): void {
  provider = p;
}

/** Get the current AccessControlProvider (or null) */
export function getAccessControlProvider(): AccessControlProvider | null {
  return provider;
}

export function resetAccessControlProvider(): void {
  provider = null;
}

/** Get global button options from the AccessControlProvider */
export function getAccessControlOptions() {
  return provider?.options ?? {};
}

/**
 * UI access check supporting single capabilities or a batch.
 * Its result can change browser presentation but never authorizes the backend action.
 */
export async function canAccessAsync(params: CanParams[]): Promise<CanResult[]>;
export async function canAccessAsync(resource: string, action: Action, params?: Record<string, unknown>, meta?: Record<string, unknown>): Promise<CanResult>;
export async function canAccessAsync(resourceOrBatch: string | CanParams[], action?: Action, params?: Record<string, unknown>, meta?: Record<string, unknown>): Promise<CanResult | CanResult[]> {
  if (!provider) {
    return Array.isArray(resourceOrBatch)
      ? resourceOrBatch.map(() => ({ can: true }))
      : { can: true };
  }
  
  if (Array.isArray(resourceOrBatch)) {
    return provider.can(resourceOrBatch);
  }
  
  return provider.can({ resource: resourceOrBatch, action: action as string, params, meta }) as Promise<CanResult>;
}

// ─── Feature Gate ─────────────────────────────────────────────

export interface FeatureGateConfig {
  /** 仅用于前端展示的角色列表。 */
  roles?: string[];
  /**
   * 需要的最低角色 (含以上所有角色)。
   * 使用 minRole 时必须同时提供 roleHierarchy。
   */
  minRole?: string;
  /**
   * 角色层级定义 (高权 → 低权)，用于 minRole 比较。
   * 由调用方按自身业务定义，框架不预设任何角色。
   */
  roleHierarchy?: string[];
  /** 仅用于前端展示的权限列表 (全部匹配)。 */
  permissions?: string[];
}

/** 浏览器中的角色和权限提示，不是授权凭据。 */
export interface FeatureGateUser {
  role: string;
  permissions: string[];
}

/**
 * 创建仅用于前端展示的功能门控函数。
 * 输入可被篡改；后端必须独立完成令牌验证和操作授权。
 * 不预设任何角色层级，由调用方完全定义。
 *
 * @example
 * ```ts
 * const HIERARCHY = ['admin', 'editor', 'viewer'];
 * const canEdit = createFeatureGate({
 *   minRole: 'editor',
 *   roleHierarchy: HIERARCHY,
 *   permissions: ['content:write'],
 * });
 *
 * if (canEdit(user)) { ... }
 * ```
 */
export function createFeatureGate(config: FeatureGateConfig): (user: FeatureGateUser) => boolean {
  return (user: FeatureGateUser): boolean => {
    if (config.roles && !config.roles.includes(user.role)) {
      return false;
    }

    if (config.minRole) {
      const hierarchy = config.roleHierarchy;
      if (!hierarchy || hierarchy.length === 0) {
        if (user.role !== config.minRole) return false;
      } else {
        const userIndex = hierarchy.indexOf(user.role);
        const minIndex = hierarchy.indexOf(config.minRole);
        if (userIndex === -1 || minIndex === -1 || userIndex > minIndex) {
          return false;
        }
      }
    }

    if (config.permissions && config.permissions.length > 0) {
      const hasAll = config.permissions.every((permission) => {
        if (user.permissions.includes("*")) return true;
        if (user.permissions.includes(permission)) return true;
        const [resource] = permission.split(":");
        if (resource && user.permissions.includes(`${resource}:*`)) return true;
        return false;
      });
      if (!hasAll) return false;
    }

    return true;
  };
}
