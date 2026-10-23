<script lang="ts">
  import RadioGroup, { type RadioGroupOption } from './RadioGroup.svelte';
  import SegmentedControl, { type SegmentedControlOption } from './SegmentedControl.svelte';

  type Mode = 'table' | 'board' | 'disabled';
  const radioOptions: readonly RadioGroupOption<Mode>[] = [
    { value: 'table', label: 'Table' },
    { value: 'board', label: 'Board' },
    { value: 'disabled', label: 'Disabled', disabled: true },
  ];
  const segmentOptions: readonly SegmentedControlOption<Mode>[] = [
    { value: 'table', label: 'Table' },
    { value: 'board', label: 'Board' },
  ];

  let radioValue = $state<Mode | null>(null);
  let segmentValue = $state<Mode | undefined>(undefined);
  let { onchange }: { onchange?: (kind: 'radio' | 'segment', value: Mode) => void } = $props();
</script>

<form aria-label="Choice binding verification">
  <RadioGroup
    options={radioOptions}
    bind:value={radioValue}
    name="view"
    legend="View"
    onchange={value => onchange?.('radio', value)}
  />
  <SegmentedControl
    options={segmentOptions}
    bind:value={segmentValue}
    ariaLabel="Display mode"
    onchange={value => onchange?.('segment', value)}
  />
  <button
    type="button"
    onclick={() => {
      radioValue = 'board';
      segmentValue = 'table';
    }}
  >
    Set parent values
  </button>
  <button
    type="button"
    onclick={() => {
      radioValue = null;
      segmentValue = undefined;
    }}
  >
    Clear parent values
  </button>
</form>

<output data-testid="radio-value">{radioValue ?? 'null'}</output>
<output data-testid="segment-value">{segmentValue ?? 'undefined'}</output>
