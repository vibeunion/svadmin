export type DetailExtensionEvent = {
  type: 'mount' | 'destroy';
  recordId: string | number | null | undefined;
};

export const detailExtensionEvents: DetailExtensionEvent[] = [];
