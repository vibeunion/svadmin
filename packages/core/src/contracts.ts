/**
 * Runtime contract decoders shared with adapters.
 *
 * This subpath intentionally avoids the runes-backed core entry so adapters and
 * non-Svelte tooling can validate provider results without loading app state.
 */
export { decodeAuthAction, AuthMutationError } from './auth-mutation-contract';
export { decodeAuthCheck, decodeAuthErrorResult, decodeIdentity, AuthQueryError } from './auth-query-contract';
export { decodeCanResult, decodeCanResults } from './access-control-contract';
export { snapshotLiveEvent, decodeLiveMessage } from './live-transport';
export { decodeAuditEntry, decodeAuditEntries } from './audit-contract';