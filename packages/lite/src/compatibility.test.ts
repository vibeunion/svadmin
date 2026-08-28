import { describe, expect, test } from 'bun:test';
import {
  LITE_COMPATIBILITY_CATALOG,
  detectLiteCapabilities,
  resolveLiteCompatibility,
} from './compatibility';

describe('Lite compatibility catalog', () => {
  test('is safe when no browser environment is available', () => {
    const support = detectLiteCapabilities(null);

    expect(support['canvas-2d']).toBe(false);
    expect(support.websocket).toBe(false);
    expect(support.wasm).toBe(false);
    expect(support['directory-upload']).toBe(false);
    expect(support['file-system-access']).toBe(false);
  });

  test('detects injected capabilities without reading the host browser', () => {
    const support = detectLiteCapabilities({
      WebSocket: function WebSocket() {},
      EventSource: function EventSource() {},
      Worker: function Worker() {},
      WebAssembly: { instantiate() {}, instantiateStreaming() {} },
      IntersectionObserver: function IntersectionObserver() {},
      ResizeObserver: function ResizeObserver() {},
      HTMLInputElement: { prototype: { webkitdirectory: '' } },
      showDirectoryPicker() {},
      navigator: {
        clipboard: { writeText() {} },
        serviceWorker: {},
        geolocation: {},
        mediaDevices: { getUserMedia() {} },
      },
      indexedDB: {},
      Notification: function Notification() {},
      RTCPeerConnection: function RTCPeerConnection() {},
      ReadableStream: { from() {} },
      WritableStream: function WritableStream() {},
      document: {
        createElement(name: string) {
          expect(name).toBe('canvas');
          return { getContext: (context: string) => context === '2d' ? {} : null };
        },
      },
    });

    expect(support['canvas-2d']).toBe(true);
    expect(support.webgl).toBe(false);
    expect(support.websocket).toBe(true);
    expect(support['event-source']).toBe(true);
    expect(support.worker).toBe(true);
    expect(support['directory-upload']).toBe(true);
    expect(support['file-system-access']).toBe(true);
    expect(support.clipboard).toBe(true);
    expect(support['service-worker']).toBe(true);
    expect(support['indexed-db']).toBe(true);
    expect(support.notifications).toBe(true);
    expect(support['media-capture']).toBe(true);
    expect(support['web-rtc']).toBe(true);
    expect(support['web-streams']).toBe(true);
  });

  test('resolves every documented capability to a deterministic fallback', () => {
    const support = detectLiteCapabilities(null);
    expect(LITE_COMPATIBILITY_CATALOG).toHaveLength(20);

    for (const descriptor of LITE_COMPATIBILITY_CATALOG) {
      const result = resolveLiteCompatibility(descriptor.capability, support);
      expect(result.capability).toBe(descriptor.capability);
      expect(result.mode).toBe('fallback');
      expect(result.fallback.length).toBeGreaterThan(0);
    }
  });
});
