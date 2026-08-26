import type { AuditLog, AuthProvider, AuthActionResult, CheckResult, Identity, Role } from '@svadmin/core';

/**
 * Mock AuthProvider for demo/development purposes.
 * Uses localStorage to simulate authentication state.
 */

const STORAGE_KEY = 'svadmin_demo_auth';
const ROLE_PERMISSIONS_KEY = 'svadmin_demo_role_permissions';

const demoRoles: Role[] = [
  { id: '1', name: 'Inventory Admin', description: 'Full inventory and access administration.' },
  { id: '2', name: 'Warehouse Manager', description: 'Warehouse and stock operations.' },
  { id: '3', name: 'Operations Analyst', description: 'Planning and reporting access.' },
  { id: '4', name: 'Read Only Auditor', description: 'Read-only compliance review.' },
];

const defaultRolePermissions: Record<string, Record<string, string[]>> = {
  '1': { products: ['create', 'read', 'update', 'delete'], users: ['create', 'read', 'update', 'delete'] },
  '2': { products: ['read', 'update'], warehouses: ['create', 'read', 'update'] },
  '3': { products: ['read'], todos: ['create', 'read', 'update'] },
  '4': { products: ['read'], user_logs: ['read'] },
};

const demoAuditLogs: AuditLog[] = [
  { id: 1, userName: 'Jordan Lee', action: 'update', resource: 'products', createdAt: '2026-08-25T09:30:00Z', ipAddress: '10.0.1.24', details: { id: 2, field: 'stock' } },
  { id: 2, userName: 'Priya Raman', action: 'create', resource: 'stock_transfers', createdAt: '2026-08-25T08:10:00Z', ipAddress: '10.0.2.18', details: { id: 3 } },
  { id: 3, userName: 'Evelyn Brooks', action: 'delete', resource: 'api_credentials', createdAt: '2026-08-24T16:45:00Z', ipAddress: '10.0.3.12', details: { credential: 'sv_demo_***' } },
];

function getRolePermissionsState(): Record<string, Record<string, string[]>> {
  try {
    const stored = localStorage.getItem(ROLE_PERMISSIONS_KEY);
    return stored ? JSON.parse(stored) : structuredClone(defaultRolePermissions);
  } catch {
    return structuredClone(defaultRolePermissions);
  }
}

function getStoredAuth(): { email: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const mockAuthProvider: AuthProvider = {
  login: async (params): Promise<AuthActionResult> => {
    const { email, password } = params as { email: string; password: string };
    // Simulate login — accept any email with password "demo"
    if (!email) return { success: false, error: { message: 'Email is required' } };
    if (password !== 'demo') return { success: false, error: { message: 'Invalid password. Use "demo".' } };

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ email }));
    return { success: true, redirectTo: '/' };
  },

  logout: async (): Promise<AuthActionResult> => {
    localStorage.removeItem(STORAGE_KEY);
    return { success: true, redirectTo: '/login' };
  },

  check: async (): Promise<CheckResult> => {
    const auth = getStoredAuth();
    return auth
      ? { authenticated: true }
      : { authenticated: false, redirectTo: '/login' };
  },

  getIdentity: async (): Promise<Identity | null> => {
    const auth = getStoredAuth();
    if (!auth) return null;
    return {
      id: '1',
      name: auth.email.split('@')[0],
      email: auth.email,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${auth.email}`,
    };
  },

  register: async (params): Promise<AuthActionResult> => {
    const { email, password } = params as { email: string; password: string };
    if (!email || !password) return { success: false, error: { message: 'Email and password are required' } };
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ email }));
    return { success: true, redirectTo: '/' };
  },

  forgotPassword: async (params): Promise<AuthActionResult> => {
    const { email } = params as { email: string };
    if (!email) return { success: false, error: { message: 'Email is required' } };
    // Simulate sending reset email
    return { success: true };
  },

  updatePassword: async (params): Promise<AuthActionResult> => {
    const { password, confirmPassword } = params as { password: string; confirmPassword: string };
    if (!password) return { success: false, error: { message: 'Password is required' } };
    if (password !== confirmPassword) return { success: false, error: { message: 'Passwords do not match' } };
    return { success: true, redirectTo: '/login' };
  },

  getRoles: async () => demoRoles,

  getRolePermissions: async (roleId) => getRolePermissionsState()[roleId] ?? {},

  updateRolePermissions: async (roleId, permissions) => {
    const state = getRolePermissionsState();
    state[roleId] = permissions;
    localStorage.setItem(ROLE_PERMISSIONS_KEY, JSON.stringify(state));
    return { success: true };
  },

  getAuditLogs: async ({ page = 1, pageSize = 20 } = {}) => {
    const start = (page - 1) * pageSize;
    return { data: demoAuditLogs.slice(start, start + pageSize), total: demoAuditLogs.length };
  },
};
