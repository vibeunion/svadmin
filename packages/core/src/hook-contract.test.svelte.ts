import { describe, expect, it } from 'vitest';
import * as core from './index';
import { keys } from './query-keys';

const FROZEN_CORE_HOOKS = [
  'useList', 'useInfiniteList', 'useOne', 'useShow', 'useMany', 'useSelect', 'useCustom', 'useApiUrl',
  'useCreate', 'useCreateMany', 'useUpdate', 'useUpdateMany', 'useDelete', 'useDeleteMany',
  'useCustomMutation', 'useInvalidate',
  'useForm', 'useTable', 'useStepsForm',
  'useLogin', 'useLogout', 'useRegister', 'useForgotPassword', 'useUpdatePassword',
  'useUpdateIdentity', 'useUpdateProfile', 'useGetIdentity', 'useIsAuthenticated', 'useOnError', 'usePermissions',
  'useSubmitTask', 'useTask', 'useTaskList', 'useTaskSubscription',
  'useCan', 'useLive', 'useSubscription', 'usePublish',
  'useNavigation', 'useGo', 'useBack', 'useGetToPath', 'useLink', 'useResource',
  'useModal', 'useModalForm', 'useDrawerForm', 'useMenu', 'useBreadcrumb', 'useThemedLayoutContext',
  'useNotification', 'useDataProvider', 'useOvertime', 'useRelation',
  'useCheckboxGroup', 'useRadioGroup', 'useAutocomplete',
  'useExport', 'useImport', 'useParsed', 'useTranslation',
] as const;

describe('0.36 core hook contract (deprecated helpers retained until 0.39)', () => {
  it.each(FROZEN_CORE_HOOKS)('keeps %s as a public function', (hookName) => {
    expect(core[hookName]).toBeTypeOf('function');
  });

  it('keeps deprecated positional Query Key helpers until 0.39', () => {
    const exports = core as Record<string, unknown>;

    expect(exports.appendTenantCacheKey).toBeTypeOf('function');
    expect(exports.queryKeyMatchesTenant).toBeTypeOf('function');
    expect(core.parseQueryKey(['default', 'posts', 'list'])).toBeUndefined();
    expect(core.parseQueryKey(keys().data.list('posts'))).toBeDefined();
  });
});
