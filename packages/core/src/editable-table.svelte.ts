import { captureAdminContext } from './context.svelte';
import { createEditableTableController } from './editable-table';
import type { DataProvider } from './types';
import type { ResourceContract } from './resource-contract';

export interface UseEditableTableOptions {
  resource: ResourceContract;
  dataProviderName?: string;
  provider?: DataProvider;
}

/**
 * Refine-like editable table hook.
 * The returned `editor` object is the prop EditableTable understands.
 */
export function useEditableTable(options: UseEditableTableOptions) {
  const provider = options.provider ?? captureAdminContext().getDataProvider(options.dataProviderName);
  const controller = createEditableTableController(options.resource, provider);
  let version = $state(0);

  $effect(() => {
    void controller.load().then(() => {
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
