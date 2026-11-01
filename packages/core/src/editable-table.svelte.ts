import { captureAdminContext } from './context.svelte';
import { getAdminOptions } from './options.svelte';
import { createEditableTableController, resolveEditableTableQuery, type EditableTableQuery } from './editable-table';
import { readURLState } from './url-sync';
import type { DataProvider, Filter, Pagination, Sort } from './types';
import type { ResourceContract } from './resource-contract';

export interface UseEditableTableOptions {
  resource: ResourceContract;
  dataProviderName?: string;
  provider?: DataProvider;
  pagination?: Pagination;
  sorters?: Sort[];
  filters?: Filter[];
  syncWithLocation?: boolean;
  /**
   * enabled 与 retry 会作用到这次加载。
   * refetchInterval、select、placeholderData 仍由 useList / useTable 提供，这里的加载是命令式的。
   */
  queryOptions?: { enabled?: boolean; retry?: EditableTableQuery['retry'] };
}

/**
 * Refine-like editable table hook.
 * The returned `editor` object is the prop EditableTable understands.
 */
export function useEditableTable(options: UseEditableTableOptions) {
  const provider = options.provider ?? captureAdminContext().getDataProvider(options.dataProviderName);
  const syncWithLocation = options.syncWithLocation ?? getAdminOptions().syncWithLocation ?? false;
  const url = syncWithLocation && typeof window !== 'undefined' ? readURLState() : undefined;
  const controller = createEditableTableController(options.resource, provider, {
    ...resolveEditableTableQuery({ ...options, syncWithLocation }, url),
    ...(options.queryOptions?.retry === undefined ? {} : { retry: options.queryOptions.retry }),
  });
  let version = $state(0);

  $effect(() => {
    if (options.queryOptions?.enabled === false) return;
    void controller.load().then(() => {
      version += 1;
    }, () => {
      version += 1;
    });
  });

  function bump(): void {
    version += 1;
  }

  return {
    get snapshot() {
      void version;
      return controller.snapshot();
    },
    get editor() {
      void version;
      const current = controller.snapshot();
      return {
        rows: current.rows,
        errors: current.errors,
        saving: current.saving,
        failure: current.failure,
        onCell: (rowIndex: number, key: string, value: unknown) => {
          controller.setCell(rowIndex, key, value);
          bump();
        },
        onSubmit: async () => {
          await controller.submit();
          bump();
        },
        onRetry: async () => {
          await controller.retry();
          bump();
        },
        onAdd: () => {
          controller.addRow();
          bump();
        },
        onDelete: (rowIndex: number) => {
          controller.deleteRow(rowIndex);
          bump();
        },
      };
    },
    submitBatch: async (patch: Record<string, unknown>) => {
      await controller.submitBatch(patch);
      bump();
    },
  };
}
