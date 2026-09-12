import { describe, expect, test } from 'bun:test';
import * as esm from '../../../node_modules/@supabase/auth-js/dist/module/lib/webauthn';
import * as commonjs from '../../../node_modules/@supabase/auth-js/dist/main/lib/webauthn';
import { serializeExtensionResults as esmExtensions } from '../../../node_modules/@supabase/auth-js/dist/module/lib/webauthn.serialization';
import { serializeExtensionResults as commonjsExtensions } from '../../../node_modules/@supabase/auth-js/dist/main/lib/webauthn.serialization';
import { bytesToBase64URL } from '../../../node_modules/@supabase/auth-js/dist/module/lib/base64url';

const bytes = new Uint8Array([0, 1, 254, 255]);
function extensions(): AuthenticationExtensionsClientOutputs {
  return {
    appid: false, credProps: { rk: true }, hmacCreateSecret: true,
    largeBlob: { supported: true, written: false, blob: bytes.buffer },
    prf: { enabled: true, results: { first: bytes.subarray(1, 3), second: new DataView(bytes.buffer, 2, 2) } },
  };
}

function creation(): esm.SerializableRegistrationCredential {
  return {
    id: 'AAH-_w', authenticatorAttachment: null,
    response: {
      attestationObject: bytes.buffer, clientDataJSON: bytes.buffer,
      getAuthenticatorData: () => bytes.buffer,
      getPublicKey: () => null, getPublicKeyAlgorithm: () => -7,
      getTransports: () => ['internal'],
    },
    getClientExtensionResults: extensions,
  };
}

function request(): esm.SerializableAuthenticationCredential {
  return {
    id: 'AAH-_w', authenticatorAttachment: 'platform',
    response: {
      authenticatorData: bytes.buffer, clientDataJSON: bytes.buffer,
      signature: bytes.buffer, userHandle: null,
    },
    getClientExtensionResults: extensions,
  };
}

const expected = {
  appid: false, credProps: { rk: true }, hmacCreateSecret: true,
  largeBlob: { supported: true, written: false, blob: 'AAH-_w' },
  prf: { enabled: true, results: { first: 'Af4', second: '_v8' } },
};

for (const [name, sdk, serialize] of [
  ['ESM', esm, esmExtensions], ['CommonJS', commonjs, commonjsExtensions],
] as const) {
  describe(`${name} WebAuthn serialization`, () => {
    test('serializes creation extensions and preserves byte view boundaries', () => {
      const value = sdk.serializeCredentialCreationResponse(creation());
      expect(value.clientExtensionResults).toEqual(expected);
      expect(value.response.attestationObject).toBe('AAH-_w');
      expect(value.response.authenticatorData).toBe('AAH-_w');
      expect(value.response.publicKeyAlgorithm).toBe(-7);
      expect(value.response.transports).toEqual(['internal']);
      expect(Object.hasOwn(value.response, 'publicKey')).toBe(false);
      expect(Object.hasOwn(value, 'authenticatorAttachment')).toBe(false);
      expect(JSON.stringify(value)).toContain('"blob":"AAH-_w"');
      const withPublicKey = creation();
      withPublicKey.response.getPublicKey = () => bytes.buffer;
      expect(sdk.serializeCredentialCreationResponse(withPublicKey).response.publicKey).toBe('AAH-_w');
    });

    test('serializes assertion extensions and omits absent user handles', () => {
      const value = sdk.serializeCredentialRequestResponse(request());
      expect(value.clientExtensionResults).toEqual(expected);
      expect(value.authenticatorAttachment).toBe('platform');
      expect(Object.hasOwn(value.response, 'userHandle')).toBe(false);
      const original = request();
      const emptyHandle = { ...original, response: { ...original.response, userHandle: new ArrayBuffer(0) } };
      expect(sdk.serializeCredentialRequestResponse(emptyHandle).response.userHandle).toBe('');
    });

    test('uses native JSON methods with their receiver intact', () => {
      const nativeCreation = sdk.serializeCredentialCreationResponse(creation());
      const nativeRequest = sdk.serializeCredentialRequestResponse(request());
      const registration = {
        ...creation(),
        toJSON() { expect(this.id).toBe('AAH-_w'); return nativeCreation; },
        getClientExtensionResults() { throw new Error('Native serialization must not use fallback'); },
      };
      const assertion = {
        ...request(),
        toJSON() { expect(this.id).toBe('AAH-_w'); return nativeRequest; },
        getClientExtensionResults() { throw new Error('Native serialization must not use fallback'); },
      };
      expect(sdk.serializeCredentialCreationResponse(registration)).toBe(nativeCreation);
      expect(sdk.serializeCredentialRequestResponse(assertion)).toBe(nativeRequest);
    });

    test('copies extension snapshots without retaining buffers or mutating inputs', () => {
      const input = extensions();
      const result = serialize(input, bytesToBase64URL);
      const blob = input.largeBlob?.blob;
      if (!blob) throw new Error('Expected a blob');
      expect(blob).toBe(bytes.buffer);
      input.credProps = { rk: false };
      expect(result).toEqual(expected);
      expect(serialize({}, bytesToBase64URL)).toEqual({});
      expect(serialize({ largeBlob: { blob: new ArrayBuffer(0) } }, bytesToBase64URL))
        .toEqual({ largeBlob: { blob: '' } });
    });

    test('rejects malformed extensions without exposing their contents', () => {
      const invalid: unknown[] = [
        null, [], 'secret', { appid: 'secret' }, { unexpected: 'secret' },
        { credProps: { rk: 1 } }, { largeBlob: { supported: 'secret' } },
        { largeBlob: { blob: 'secret' } }, { prf: { enabled: 1 } },
        { prf: { results: {} } }, { prf: { results: { first: bytes, second: 1 } } },
        { largeBlob: new Date() },
      ];
      for (const value of invalid) {
        expect(() => serialize(value, bytesToBase64URL)).toThrow('Invalid WebAuthn extension results');
      }
    });

    test('rejects accessors, hidden data, and symbol properties without evaluating getters', () => {
      let reads = 0;
      const accessor = { get appid() { reads++; return true; } };
      const hidden = Object.defineProperty({}, 'appid', { value: true });
      for (const value of [accessor, hidden, { [Symbol('private')]: true }]) {
        expect(() => serialize(value, bytesToBase64URL)).toThrow('Invalid WebAuthn extension results');
      }
      expect(reads).toBe(0);
    });

    test('rejects unsupported attachment strings instead of asserting their type', () => {
      expect(() => sdk.serializeCredentialCreationResponse({ ...creation(), authenticatorAttachment: 'secret' }))
        .toThrow('Invalid WebAuthn authenticator attachment');
    });
  });
}
