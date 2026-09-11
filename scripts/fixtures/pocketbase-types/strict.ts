import PocketBase from 'pocketbase';
import { createPocketBaseAuthProvider, type PocketBaseAuthClient } from '../../../packages/pocketbase/src/auth-provider';
import { createPocketBaseLiveProvider, type PocketBaseRealtimeClient } from '../../../packages/pocketbase/src/live-provider';

declare const sdk: PocketBase;
const auth: PocketBaseAuthClient = sdk;
const live: PocketBaseRealtimeClient = sdk;
createPocketBaseAuthProvider({ pb: auth });
createPocketBaseLiveProvider({ pb: live });
// @ts-expect-error The removed unknown-client shortcut cannot admit arbitrary objects.
createPocketBaseAuthProvider({ pb: {} });
// @ts-expect-error The legacy model property does not supply the current auth-store contract.
createPocketBaseAuthProvider({ pb: { ...auth, authStore: { isValid: true, model: {}, token: '', clear() {} } } });
// @ts-expect-error Optional settings cannot be explicitly undefined.
createPocketBaseLiveProvider({ pb: live, onError: undefined });
live.collection('posts').subscribe('*', event => {
  // @ts-expect-error Raw SDK event properties require runtime validation.
  void event.id;
});
// @ts-expect-error Subscription topics are strings, not arbitrary identifiers.
live.collection('posts').subscribe(1, () => {});
