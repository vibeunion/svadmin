import Checkpoint from './Checkpoint.svelte';
import CheckpointIcon from './CheckpointIcon.svelte';
import CheckpointTrigger from './CheckpointTrigger.svelte';

export { Checkpoint, CheckpointIcon, CheckpointTrigger };
export const Root = Checkpoint;
export const Icon = CheckpointIcon;
export const Trigger = CheckpointTrigger;
export default Checkpoint;
export type { CheckpointTriggerProps } from './CheckpointTrigger.svelte';
