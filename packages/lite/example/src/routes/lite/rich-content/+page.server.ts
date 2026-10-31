import { richContentSample } from '#lib/rich-content-sample';
import type { PageServerLoad } from './$types';

export const load = (() => ({
  notes: richContentSample.notes,
  insight: richContentSample.insight,
  comments: richContentSample.comments,
  notifications: richContentSample.notifications,
})) satisfies PageServerLoad;
