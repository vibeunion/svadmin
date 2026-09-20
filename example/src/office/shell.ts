import { createI18nScope, type I18nProvider } from '@svadmin/core/i18n';
import { createHashRouterProvider, type AuthActionResult, type AuthProvider, type RouterProvider } from '@svadmin/core';
import { chineseMenuLabel } from './zh-CN';

/** 独立中文作用域，不改全局翻译表或其他示例应用的语言偏好。 */
export function createOfficeI18nProvider(): I18nProvider {
  const chinese = createI18nScope({ locale: 'zh-CN' });
  return {
    getLocale: () => 'zh-CN',
    getAvailableLocales: () => ['zh-CN'],
    setLocale: () => { /* 产品固定使用简体中文。 */ },
    translate: (key, params) => chineseMenuLabel(chinese.translate(key, params)),
  };
}
function localizeAuthResult(result: AuthActionResult): AuthActionResult {
  if (!result.error) return result;
  const messages: Record<string, string> = {
    'Email is required': '请输入用户名或邮箱。',
    'Invalid password. Use "demo".': '密码不正确，请使用页面预填的演示密码。',
    'Email and password are required': '请输入邮箱和密码。',
    'Password is required': '请输入密码。',
    'Passwords do not match': '两次输入的密码不一致。',
  };
  const message = result.error.message ?? '';
  return { ...result, error: { ...result.error, message: messages[message] ?? '操作失败，请核对输入后重试。' } };
}
/** 只包装现有演示认证，不新增账号、不改变登录校验或真实权限。 */
export function createOfficeAuthProvider(source: AuthProvider): AuthProvider {
  return {
    ...source,
    async login(params) {
      const result = localizeAuthResult(await source.login(params));
      return result.success ? { ...result, redirectTo: '/health_office' } : result;
    },
    async getIdentity() {
      const identity = await source.getIdentity?.();
      return identity ? { ...identity, name: '演示登录用户' } : null;
    },
    ...(source.register ? { register: async (params: Parameters<NonNullable<AuthProvider['register']>>[0]) => {
      const result = localizeAuthResult(await source.register?.(params) ?? { success: false });
      return result.success ? { ...result, redirectTo: '/health_office' } : result;
    } } : {}),
    ...(source.forgotPassword ? { forgotPassword: async (params: Parameters<NonNullable<AuthProvider['forgotPassword']>>[0]) =>
      localizeAuthResult(await source.forgotPassword?.(params) ?? { success: false }) } : {}),
    ...(source.updatePassword ? { updatePassword: async (params: Parameters<NonNullable<AuthProvider['updatePassword']>>[0]) =>
      localizeAuthResult(await source.updatePassword?.(params) ?? { success: false }) } : {}),
  };
}

/** 办公模式的首页仍为办公工作区，覆盖框架登录成功后的通用首页跳转。 */
export function createOfficeRouterProvider(): RouterProvider {
  const router = createHashRouterProvider();
  const officePath = (path: string) => path === '/' ? '/health_office' : path;
  return {
    ...router,
    go(options) { router.go({ ...options, to: officePath(options.to) }); },
    formatLink(path) { return router.formatLink?.(officePath(path)) ?? `#${officePath(path)}`; },
  };
}
