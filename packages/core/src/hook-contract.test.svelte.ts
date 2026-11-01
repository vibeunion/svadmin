import { describe, expect, it } from 'vitest';
import * as core from './index';
import * as unsafe from './unsafe';
import { keys } from './query-keys';

const FROZEN_CORE_HOOKS = [
  'useList', 'useInfiniteList', 'useOne', 'useShow', 'useMany', 'useSelect', 'useCustom', 'useApiUrl',
  'useCreate', 'useCreateMany', 'useUpdate', 'useUpdateMany', 'useDelete', 'useDeleteMany',
  'useCustomMutation', 'useInvalidate',
  'useForm', 'useTable', 'useExport', 'useImport', 'useStepsForm',
  'useLogin', 'useLogout', 'useRegister', 'useForgotPassword', 'useUpdatePassword',
  'useUpdateIdentity', 'useUpdateProfile', 'useGetIdentity', 'useIsAuthenticated', 'useOnError', 'usePermissions',
  'useSubmitTask', 'useTask', 'useTaskList', 'useTaskSubscription',
  'useCan', 'useLive', 'useSubscription', 'usePublish',
  'useNavigation', 'useGo', 'useBack', 'useGetToPath', 'useLink', 'useResource',
  'useResourceParams', 'useKeys', 'useSimpleList',
  'useMutationMode', 'useWarnAboutChange', 'useSyncWithLocation', 'useMeta', 'useEditableTable',
  'useModal', 'useMenu', 'useBreadcrumb', 'useThemedLayoutContext',
  'useNotification', 'useOvertime',
  'useParsed', 'useTranslation',
] as const;

describe('core hook export boundaries', () => {
  it.each(FROZEN_CORE_HOOKS)('keeps %s as a public function', (hookName) => {
    expect(core[hookName]).toBeTypeOf('function');
  });

  it.each(['useDataProvider', 'useCheckboxGroup', 'useRadioGroup', 'useAutocomplete'] as const)(
    'isolates unchecked %s behind an explicit unsafe entry point', name => {
      expect(unsafe[name]).toBeTypeOf('function');
      expect(name in core).toBe(false);
    },
  );

  it.each(['useModalForm', 'useDrawerForm', 'useRelation'] as const)('does not keep retired %s on the public or unsafe surface', name => {
    expect(name in core).toBe(false);
    expect(name in unsafe).toBe(false);
  });

  it('uses tenant-scoped Query Key v2 without positional compatibility helpers', () => {
    expect('appendTenantCacheKey' in core).toBe(false);
    expect('queryKeyMatchesTenant' in core).toBe(false);

    const queryKey = keys({ provider: 'cms', tenant: 'tenant-a' }).data.list('posts');
    const matcher = { provider: 'cms', tenant: 'tenant-a', kind: 'data', resource: 'posts' } as const;
    expect(core.parseQueryKey(queryKey)).toBeDefined();
    expect(core.queryKeyMatches(queryKey, matcher)).toBe(true);
    expect(core.queryKeyMatches(queryKey, { ...matcher, tenant: 'tenant-b' })).toBe(false);

    const positionalKey = ['cms', 'posts', 'list', { __svadminTenant: 'tenant-a' }];
    expect(core.parseQueryKey(positionalKey)).toBeUndefined();
    expect(core.queryKeyMatches(positionalKey, matcher)).toBe(false);
  });
});
