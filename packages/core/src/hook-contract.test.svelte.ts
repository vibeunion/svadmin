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
  'useModal', 'useMenu', 'useBreadcrumb', 'useThemedLayoutContext',
  'useNotification', 'useOvertime',
  'useParsed', 'useTranslation',
] as const;

describe('core hook export boundaries', () => {
  it.each(FROZEN_CORE_HOOKS)('keeps %s as a public function', (hookName) => {
    expect(core[hookName]).toBeTypeOf('function');
  });

  it.each(['useDataProvider', 'useRelation', 'useCheckboxGroup', 'useRadioGroup', 'useAutocomplete'] as const)(
    'isolates unchecked %s behind an explicit unsafe entry point', name => {
      expect(unsafe[name]).toBeTypeOf('function');
      expect(name in core).toBe(false);
    },
  );

  it.each(['useModalForm', 'useDrawerForm'] as const)('does not keep retired %s on the public or unsafe surface', name => {
    expect(name in core).toBe(false);
    expect(name in unsafe).toBe(false);
  });

  it('keeps deprecated positional Query Key helpers until 0.39', () => {
    const exports = core as Record<string, unknown>;

    expect(exports['appendTenantCacheKey']).toBeTypeOf('function');
    expect(exports['queryKeyMatchesTenant']).toBeTypeOf('function');
    expect(core.parseQueryKey(['default', 'posts', 'list'])).toBeUndefined();
    expect(core.parseQueryKey(keys().data.list('posts'))).toBeDefined();
  });
});
