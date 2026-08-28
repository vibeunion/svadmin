/**
 * Browser capability metadata for optional Lite enhancements.
 *
 * The SSR baseline never reads browser globals. Consumers may call
 * `detectLiteCapabilities(globalThis)` from an explicitly client-only entry.
 */

export type LiteCapability =
  | 'canvas-2d'
  | 'webgl'
  | 'wasm'
  | 'wasm-streaming'
  | 'websocket'
  | 'event-source'
  | 'worker'
  | 'directory-upload'
  | 'file-system-access'
  | 'clipboard'
  | 'broadcast-channel'
  | 'intersection-observer'
  | 'resize-observer'
  | 'service-worker'
  | 'indexed-db'
  | 'notifications'
  | 'media-capture'
  | 'web-rtc'
  | 'geolocation'
  | 'web-streams';

export type LiteFallbackKind =
  | 'structured-data'
  | 'static-snapshot'
  | 'server-action'
  | 'server-refresh'
  | 'server-pagination'
  | 'standard-upload'
  | 'manual-copy'
  | 'server-storage'
  | 'in-page-status'
  | 'download';

export interface LiteCompatibilityDescriptor {
  capability: LiteCapability;
  fallbackKind: LiteFallbackKind;
  fallback: string;
  enhancement: string;
}

export type LiteCapabilitySupport = Record<LiteCapability, boolean>;

export interface LiteCompatibilityResolution extends LiteCompatibilityDescriptor {
  supported: boolean;
  mode: 'enhanced' | 'fallback';
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | undefined {
  return value !== null && (typeof value === 'object' || typeof value === 'function')
    ? value as UnknownRecord
    : undefined;
}

function hasFunction(record: UnknownRecord | undefined, key: string): boolean {
  return typeof record?.[key] === 'function';
}

function supportsCanvas(documentValue: unknown, context: '2d' | 'webgl'): boolean {
  const documentRecord = asRecord(documentValue);
  if (!hasFunction(documentRecord, 'createElement')) return false;
  const canvas = (documentRecord.createElement as (name: string) => unknown)('canvas');
  const canvasRecord = asRecord(canvas);
  if (!hasFunction(canvasRecord, 'getContext')) return false;
  return Boolean((canvasRecord.getContext as (name: string) => unknown)(context));
}

function supportsDirectoryUpload(environment: UnknownRecord): boolean {
  const inputConstructor = asRecord(environment.HTMLInputElement);
  const prototype = asRecord(inputConstructor?.prototype);
  return prototype !== undefined && ('webkitdirectory' in prototype || 'directory' in prototype);
}

export const LITE_COMPATIBILITY_CATALOG: readonly LiteCompatibilityDescriptor[] = [
  { capability: 'canvas-2d', fallbackKind: 'structured-data', fallback: 'Render a data table or static image.', enhancement: 'Load the Canvas UI in a modern client.' },
  { capability: 'webgl', fallbackKind: 'static-snapshot', fallback: 'Render a server-generated image and structured values.', enhancement: 'Load the WebGL view in a modern client.' },
  { capability: 'wasm', fallbackKind: 'server-action', fallback: 'Submit the task to a server action or background job.', enhancement: 'Run the WebAssembly module in a modern client.' },
  { capability: 'wasm-streaming', fallbackKind: 'server-action', fallback: 'Use a server computation or downloadable result.', enhancement: 'Instantiate WebAssembly from a streamed response.' },
  { capability: 'websocket', fallbackKind: 'server-refresh', fallback: 'Show the last snapshot with a native refresh link.', enhancement: 'Subscribe through WebSocket.' },
  { capability: 'event-source', fallbackKind: 'server-refresh', fallback: 'Use refresh, polling, or a server status page.', enhancement: 'Subscribe through server-sent events.' },
  { capability: 'worker', fallbackKind: 'server-action', fallback: 'Run work synchronously or as a server job.', enhancement: 'Move client computation into a Worker.' },
  { capability: 'directory-upload', fallbackKind: 'standard-upload', fallback: 'Upload multiple files or a ZIP archive.', enhancement: 'Select a directory and preserve relative paths.' },
  { capability: 'file-system-access', fallbackKind: 'standard-upload', fallback: 'Use standard file inputs and download links.', enhancement: 'Use the File System Access API.' },
  { capability: 'clipboard', fallbackKind: 'manual-copy', fallback: 'Expose selectable text for manual copy and paste.', enhancement: 'Use the Clipboard API.' },
  { capability: 'broadcast-channel', fallbackKind: 'server-refresh', fallback: 'Reload server-owned session state.', enhancement: 'Synchronize non-authoritative UI state between tabs.' },
  { capability: 'intersection-observer', fallbackKind: 'server-pagination', fallback: 'Render eagerly or use server pagination.', enhancement: 'Lazy-load or virtualize visible content.' },
  { capability: 'resize-observer', fallbackKind: 'structured-data', fallback: 'Use stable responsive dimensions and normal document flow.', enhancement: 'React to element-size changes.' },
  { capability: 'service-worker', fallbackKind: 'download', fallback: 'Offer static snapshots and downloadable exports.', enhancement: 'Cache explicitly selected offline assets.' },
  { capability: 'indexed-db', fallbackKind: 'server-storage', fallback: 'Persist authoritative state on the server.', enhancement: 'Cache drafts and non-authoritative preferences locally.' },
  { capability: 'notifications', fallbackKind: 'in-page-status', fallback: 'Render an in-page alert and audit log.', enhancement: 'Show a browser notification after permission is granted.' },
  { capability: 'media-capture', fallbackKind: 'standard-upload', fallback: 'Upload an existing image, audio, or video file.', enhancement: 'Capture media from the browser.' },
  { capability: 'web-rtc', fallbackKind: 'standard-upload', fallback: 'Upload a recording or use a server-managed workflow.', enhancement: 'Enable a real-time peer media session.' },
  { capability: 'geolocation', fallbackKind: 'structured-data', fallback: 'Enter an address or coordinates manually.', enhancement: 'Read the current location with user permission.' },
  { capability: 'web-streams', fallbackKind: 'download', fallback: 'Use a normal request, response, upload, or download.', enhancement: 'Process streamed data in the modern client.' },
] as const;

const descriptorByCapability = new Map(
  LITE_COMPATIBILITY_CATALOG.map((descriptor) => [descriptor.capability, descriptor]),
);

/** Detect optional browser APIs without accessing globals during SSR. */
export function detectLiteCapabilities(environment?: unknown): LiteCapabilitySupport {
  const explicitEnvironment = arguments.length > 0;
  const env = asRecord(explicitEnvironment
    ? environment
    : typeof globalThis === 'undefined' ? undefined : globalThis) ?? {};
  const navigator = asRecord(env.navigator);
  const clipboard = asRecord(navigator?.clipboard);
  const webAssembly = asRecord(env.WebAssembly);
  const readableStream = asRecord(env.ReadableStream);

  return {
    'canvas-2d': supportsCanvas(env.document, '2d'),
    webgl: supportsCanvas(env.document, 'webgl'),
    wasm: hasFunction(webAssembly, 'instantiate'),
    'wasm-streaming': hasFunction(webAssembly, 'instantiateStreaming'),
    websocket: typeof env.WebSocket === 'function',
    'event-source': typeof env.EventSource === 'function',
    worker: typeof env.Worker === 'function',
    'directory-upload': supportsDirectoryUpload(env),
    'file-system-access': typeof env.showOpenFilePicker === 'function'
      || typeof env.showDirectoryPicker === 'function',
    clipboard: hasFunction(clipboard, 'writeText'),
    'broadcast-channel': typeof env.BroadcastChannel === 'function',
    'intersection-observer': typeof env.IntersectionObserver === 'function',
    'resize-observer': typeof env.ResizeObserver === 'function',
    'service-worker': asRecord(navigator?.serviceWorker) !== undefined,
    'indexed-db': asRecord(env.indexedDB) !== undefined,
    notifications: typeof env.Notification === 'function',
    'media-capture': hasFunction(asRecord(navigator?.mediaDevices), 'getUserMedia')
      || typeof env.MediaRecorder === 'function',
    'web-rtc': typeof env.RTCPeerConnection === 'function',
    geolocation: asRecord(navigator?.geolocation) !== undefined,
    'web-streams': asRecord(env.ReadableStream) !== undefined
      && (hasFunction(readableStream, 'from') || typeof env.WritableStream === 'function'),
  };
}

export function resolveLiteCompatibility(
  capability: LiteCapability,
  support: LiteCapabilitySupport = detectLiteCapabilities(),
): LiteCompatibilityResolution {
  const descriptor = descriptorByCapability.get(capability);
  if (!descriptor) throw new Error(`Unknown Lite capability: ${capability}`);
  const supported = support[capability];
  return { ...descriptor, supported, mode: supported ? 'enhanced' : 'fallback' };
}
