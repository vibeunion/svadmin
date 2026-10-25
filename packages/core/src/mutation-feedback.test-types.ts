export type FeedbackOperation = 'create' | 'update' | 'delete';

export interface FeedbackState {
  run: () => Promise<unknown>;
  ready: () => boolean;
}
