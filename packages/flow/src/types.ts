import type { Edge, Node, NodeTypes, EdgeTypes, OnConnect, XYPosition } from '@xyflow/svelte';
import type { PaletteRecord } from './palette-schema.js';

/** A node that can be rendered by {@link FlowCanvas}. */
export type FlowNode<
  Data extends Record<string, unknown> = Record<string, unknown>,
  Type extends string | undefined = string | undefined,
> = Node<Data, Type>;

/** An edge that can be rendered by {@link FlowCanvas}. */
export type FlowEdge<
  Data extends Record<string, unknown> = Record<string, unknown>,
  Type extends string | undefined = string | undefined,
> = Edge<Data, Type>;

/** A serializable node template made draggable by {@link FlowPalette}. */
export type FlowPaletteItem<Data extends PaletteRecord['data'] = PaletteRecord['data']> =
  Omit<PaletteRecord, 'data'> & { data: Data };

/** Details emitted when a palette template is dropped on a {@link FlowCanvas}. */
export interface FlowItemDropDetail {
  template: FlowPaletteItem;
  position: XYPosition;
  event: DragEvent;
}

/** The small canvas control surface exposed through `FlowCanvas`'s `onready` callback. */
export interface FlowCanvasApi {
  /** Resolves to false when there are no nodes to fit. */
  fitView: () => Promise<boolean>;
  screenToFlowPosition: (position: XYPosition, options?: { snapToGrid: boolean }) => XYPosition;
}

export type { EdgeTypes, NodeTypes, OnConnect, XYPosition };
