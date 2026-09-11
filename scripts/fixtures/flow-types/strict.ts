import type { InternalNodeBase, NodeBase, NodeLookup, ParentLookup } from '@xyflow/system';
import { withResolvers } from '@xyflow/system';
import type { FlowPaletteItem } from '../../../packages/flow/src/types.js';

type Review = NodeBase<{ kind: 'review'; count: number }, 'review'> & {
  measured: { width: 100; height: 40 };
};
declare const original: Review;
const internal: InternalNodeBase<Review> = {
  id: 'review',
  type: 'review',
  position: { x: 0, y: 0 },
  data: { kind: 'review', count: 1 },
  // Internal dimensions are remeasured and must not retain user literals.
  measured: { width: 140, height: 60 },
  internals: { positionAbsolute: { x: 0, y: 0 }, z: 0, userNode: original },
};
const kind: 'review' = internal.data.kind;
const source: Review = internal.internals.userNode;
const base: NodeBase = internal;
void kind;
void source;
void base;

// @ts-expect-error Custom data must not be widened to unknown.
internal.data.count = 'one';
// @ts-expect-error Internal nodes preserve custom node type literals.
internal.type = 'other';
// @ts-expect-error An optional flag cannot be explicitly undefined.
internal.hidden = undefined;
// @ts-expect-error Measured dimensions retain exact optionality.
internal.measured.width = undefined;
// @ts-expect-error Original user nodes retain their original measured literals.
internal.internals.userNode.measured.width = 140;

export function checkGenericNode<N extends NodeBase>(
  node: InternalNodeBase<N>,
  lookup: NodeLookup<InternalNodeBase<N>>,
  parents: ParentLookup<InternalNodeBase<N>>,
): NodeBase {
  lookup.set(node.id, node);
  parents.set(node.id, lookup);
  return node;
}

const resolver = withResolvers<boolean>();
const promise: Promise<boolean> = resolver.promise;
resolver.resolve(true);
// @ts-expect-error The ES2022-compatible resolver remains boolean-only.
resolver.resolve('true');
void promise;

const template: FlowPaletteItem<{ count: number }> = {
  id: 'review', type: 'review', label: 'Review', data: { count: 1 },
};
// @ts-expect-error Palette metadata must preserve exact optionality.
template.description = undefined;
// @ts-expect-error Typed palette data is not widened to arbitrary JSON.
template.data.count = 'one';
// @ts-expect-error Palette data cannot claim unserializable function values.
type InvalidPalette = FlowPaletteItem<{ run: () => void }>;
declare const invalid: InvalidPalette;
void invalid;
