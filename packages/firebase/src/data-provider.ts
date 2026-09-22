import type { DataProvider } from '@svadmin/core';
import { createRefineAdapter } from '../../refine-adapter/src/index';
// Note: @refinedev/simple-rest is often used as the base for custom Firebase REST, 
// but here we intend to wrap the proper Firebase package.
// We expect the user to pass initialized Firebase instances depending on the 
// specific refinedev package used (e.g., @refinedev/firebase).

// Since refine doesn't have a single official "firestore" package in monorepo often, 
// they usually have community packages or one you can use. 
// Assuming a generic `RefineFirebaseProvider` exists.
export function createFirebaseDataProvider(firebaseDataProvider: unknown): DataProvider {
  return createRefineAdapter(firebaseDataProvider);
}
