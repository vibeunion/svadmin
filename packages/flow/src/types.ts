import type { Edge, Node, NodeTypes, EdgeTypes, OnConnect, XYPosition } from '@xyflow/svelte';

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
export interface FlowPaletteItem<Data extends Record<string, unknown> = Record<string, unknown>> {
  /** Stable host-defined template identifier. */
  id: string;
  /** The Svelte Flow node type that the host will create. */
  type: string;
  /** Plain-text label shown in the palette. */
  label: string;
  /** Optional plain-text helper copy shown below the label. */
  description?: string;
  /** JSON-serializable initial data for the host-created node. */
  data: Data;
  /** Disables click and drag for the template. */
  disabled?: boolean;
}

/** Details emitted when a palette template is dropped on a {@link FlowCanvas}. */
export interface FlowItemDropDetail {
  template: FlowPaletteItem;
  position: XYPosition;
  event: DragEvent;
}

/** The small canvas control surface exposed through `FlowCanvas`'s `onready` callback. */
export interface FlowCanvasApi {
  fitView: () => Promise<boolean>;
  screenToFlowPosition: (position: XYPosition, options?: { snapToGrid: boolean }) => XYPosition;
}

export type { EdgeTypes, NodeTypes, OnConnect, XYPosition };
