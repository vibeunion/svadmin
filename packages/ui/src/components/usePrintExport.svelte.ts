export interface PrintExportOptions {
  filename?: string | undefined;
  orientation?: ('portrait' | 'landscape') | undefined;
  onBeforePrint?: (() => void) | undefined;
  onAfterPrint?: (() => void) | undefined;
}

export function printElement(element?: HTMLElement | null, options: PrintExportOptions = {}): boolean {
  if (typeof window === 'undefined') return false;

  const originalTitle = document.title;
  if (options.filename) {
    document.title = options.filename;
  }

  options.onBeforePrint?.();

  const handleAfter = () => {
    document.title = originalTitle;
    options.onAfterPrint?.();
    window.removeEventListener('afterprint', handleAfter);
  };
  window.addEventListener('afterprint', handleAfter);

  try {
    window.print();
    return true;
  } catch {
    document.title = originalTitle;
    return false;
  }
}

export function usePrintExport(defaultOptions: PrintExportOptions = {}) {
  let isPrinting = $state(false);

  return {
    get isPrinting() {
      return isPrinting;
    },
    print: (element?: HTMLElement | null, options?: PrintExportOptions) => {
      isPrinting = true;
      const opts = { ...defaultOptions, ...options };
      const ok = printElement(element, {
        ...opts,
        onAfterPrint: () => {
          isPrinting = false;
          opts.onAfterPrint?.();
        },
      });
      if (!ok) isPrinting = false;
      return ok;
    },
  };
}
