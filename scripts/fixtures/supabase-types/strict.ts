import type { RegistrationCredential, AuthenticationCredential, RegistrationResponseJSON } from '../../../node_modules/@supabase/auth-js/dist/module/lib/webauthn.dom';
import type { SerializableRegistrationCredential } from '../../../node_modules/@supabase/auth-js/dist/module/lib/webauthn';
import { serializeCredentialCreationResponse } from '../../../node_modules/@supabase/auth-js/dist/module/lib/webauthn';

declare const registration: RegistrationCredential;
declare const authentication: AuthenticationCredential;
const nativeRegistration: PublicKeyCredential = registration;
const nativeAuthentication: PublicKeyCredential = authentication;
const nativeJSON: ReturnType<PublicKeyCredential['toJSON']> = registration.toJSON();
const decoded = serializeCredentialCreationResponse(registration);
const json: RegistrationResponseJSON = decoded;

declare const legacy: Omit<SerializableRegistrationCredential, 'toJSON'>;
serializeCredentialCreationResponse(legacy);
// @ts-expect-error An optional native serializer must return serialized data, not raw bytes.
serializeCredentialCreationResponse({ ...legacy, toJSON: () => new ArrayBuffer(1) });
// @ts-expect-error An attestation response must contain the binary attestation data.
serializeCredentialCreationResponse({ ...legacy, response: {} });
// @ts-expect-error JSON extension blobs are encoded strings, never ArrayBuffers.
json.clientExtensionResults.largeBlob = { blob: new ArrayBuffer(1) };
// @ts-expect-error JSON PRF results cannot contain native byte views.
json.clientExtensionResults.prf = { results: { first: new Uint8Array(1) } };
// @ts-expect-error Absent fields cannot be replaced with explicit undefined.
json.authenticatorAttachment = undefined;
void [nativeRegistration, nativeAuthentication, nativeJSON];
