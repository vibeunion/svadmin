import { captureAuthSession, type AdminContextAccessor, type CanParams } from '@svadmin/core';
import {
  inMemoryDataProvider, moveLocalMail, sendLocalMail,
  type LocalMailMove, type LocalMailSend,
} from './inMemoryDb';

type MailContext = Pick<AdminContextAccessor,
  'providers' | 'authProvider' | 'accessControlProvider' | 'resources' | 'tenant' | 'routerProvider' | 'getProviderMeta'>;
type MailOperation = { kind: 'move'; input: LocalMailMove } | { kind: 'send'; input: LocalMailSend };

/** 本地邮件写入必须仍属于发起操作的宿主与会话，不能绕过替换后的受保护 provider。 */
export async function executeLocalMail(context: MailContext, operation: MailOperation, isMounted: () => boolean = () => true) {
  const request = structuredClone(operation);
  const provider = context.providers?.['default'];
  const auth = context.authProvider;
  const access = context.accessControlProvider;
  const router = context.routerProvider;
  const resources = context.resources;
  const session = captureAuthSession(auth);
  const permissions: CanParams[] = request.kind === 'move'
    ? [{ resource: request.input.target, action: 'create' },
      { resource: request.input.source, action: 'delete', params: { id: request.input.id } }]
    : [{ resource: 'mail_sent', action: 'create' },
      ...(request.input.draftId === undefined ? [] : [{ resource: 'mail_draft', action: 'delete', params: { id: request.input.draftId } }])];
  const ensureCurrent = () => {
    if (!isMounted() || provider !== inMemoryDataProvider || context.providers?.['default'] !== provider ||
      context.authProvider !== auth || context.accessControlProvider !== access || context.routerProvider !== router ||
      context.resources !== resources || context.tenant !== undefined || !session.isCurrent()) {
      throw new Error('Local mail operation scope changed or is unsupported');
    }
    for (const permission of permissions) {
      const resource = resources.find(item => item.name === permission.resource);
      if (!resource || (resource.provider?.dataProviderName && resource.provider.dataProviderName !== 'default') ||
        (resource.meta?.dataProviderName && resource.meta.dataProviderName !== 'default') ||
        (permission.action === 'create' ? resource.canCreate === false : resource.canDelete === false)) {
        throw new Error('Mail resource operation is not permitted');
      }
    }
  };
  ensureCurrent();
  if (auth && (await auth.check()).authenticated !== true) throw new Error('Sign in before changing local mail');
  ensureCurrent();
  const identityKey = async () => {
    if (!auth?.getIdentity) return null;
    const identity = await auth.getIdentity();
    if (!identity) throw new Error('Mail identity unavailable');
    return JSON.stringify([identity.id, identity.email]);
  };
  const identity = await identityKey();
  ensureCurrent();
  for (const permission of permissions) {
    const meta = context.getProviderMeta(permission.resource);
    if (access && (await access.can({
      ...permission, ...(meta === undefined ? {} : { meta }),
    })).can !== true) throw new Error('Mail permission denied');
    ensureCurrent();
  }
  if (auth && (await auth.check()).authenticated !== true) throw new Error('Mail session is no longer authenticated');
  ensureCurrent();
  if (identity !== await identityKey()) throw new Error('Mail identity changed during authorization');
  ensureCurrent();
  // 最后一次授权检查到同步提交之间不再 await，避免会话切换后写入。
  return request.kind === 'move' ? moveLocalMail(request.input) : sendLocalMail(request.input);
}
