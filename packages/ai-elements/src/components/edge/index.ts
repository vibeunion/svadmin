import Animated from './Animated.svelte';
import Temporary from './Temporary.svelte';

export { Animated, Temporary };
export const Edge = { Animated, Temporary };
export const Root = Edge;
export default Edge;
export { Position } from '@xyflow/svelte';
export type { EdgeProps, InternalNode } from '@xyflow/svelte';
