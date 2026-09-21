import type { AuthProvider, AuthActionResult, CheckResult, Identity } from '@svadmin/core';

/**
 * Mock AuthProvider for demo/development purposes.
 * Uses localStorage to simulate authentication state.
 */

const STORAGE_KEY = 'svadmin_demo_auth';

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
      name: auth.email.split('@')[0] ?? auth.email,
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
};
