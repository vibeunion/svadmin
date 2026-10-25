<script lang="ts">
  import SegmentedControl, { type SegmentedControlOption } from '../../../packages/ui/src/components/SegmentedControl.svelte';

  type Mode = 'table' | 'board' | 'calendar' | 'timeline';
  type RtlMode = 'personal' | 'team' | 'company';

  const options: readonly SegmentedControlOption<Mode>[] = [
    { value: 'table', label: 'Table' },
    { value: 'board', label: 'Board' },
    { value: 'calendar', label: 'Calendar', disabled: true },
    { value: 'timeline', label: 'Timeline' },
  ];
  const keyboardOptions: readonly SegmentedControlOption<Mode>[] = [
    { value: 'table', label: 'Keyboard table' },
    { value: 'board', label: 'Keyboard board' },
    { value: 'timeline', label: 'Keyboard timeline' },
  ];
  const rtlOptions: readonly SegmentedControlOption<RtlMode>[] = [
    { value: 'personal', label: 'Personal' },
    { value: 'team', label: 'Team', disabled: true },
    { value: 'company', label: 'Company' },
  ];

  let firstValue = $state<Mode>('table');
  let secondValue = $state<Mode>('board');
  let keyboardValue = $state<Mode | undefined>();
  let rtlValue = $state<RtlMode>('company');
  let groupDisabled = $state(true);
  let disabledValue = $state<Mode>('board');
  let disabledCurrentValue = $state<Mode>('calendar');
  let nativeFieldsetDisabled = $state(true);
  let nativeFieldsetValue = $state<Mode>('table');
  let dynamicBoardDisabled = $state(false);
  let dynamicValue = $state<Mode>('table');
  let removedOptions = $state<readonly SegmentedControlOption<Mode>[]>(options);
  let removedValue = $state<Mode>('timeline');
  let formValue = $state<Mode>('table');
  let bottomValue = $state<Mode>('table');
  let tabFirstValue = $state<Mode>('table');
  let tabSecondValue = $state<Mode>('board');
  const changes = $state({
    first: 0,
    second: 0,
    keyboard: 0,
    rtl: 0,
    disabled: 0,
    disabledCurrent: 0,
    nativeFieldset: 0,
    dynamic: 0,
    removed: 0,
    form: 0,
  });
  const tabChanges = $state({ first: 0, second: 0 });
  const submissions = $state({ form: 0 });
  const dynamicOptions = $derived(options.map(option =>
    option.value === 'board' ? { ...option, disabled: dynamicBoardDisabled } : option
  ));

  function submit(event: SubmitEvent): void {
    event.preventDefault();
    submissions.form += 1;
  }
</script>

<main data-testid="segmented-control-fixture">
  <section aria-label="Independent instances">
    <SegmentedControl
      {options}
      bind:value={firstValue}
      ariaLabel="Primary view"
      onchange={() => changes.first += 1}
    />
    <SegmentedControl
      {options}
      bind:value={secondValue}
      ariaLabel="Secondary view"
      onchange={() => changes.second += 1}
    />
    <output data-testid="first-value">{firstValue}</output>
    <output data-testid="second-value">{secondValue}</output>
    <output data-testid="first-changes">{changes.first}</output>
    <output data-testid="second-changes">{changes.second}</output>
  </section>

  <section aria-label="Keyboard selection">
    <SegmentedControl
      options={keyboardOptions}
      bind:value={keyboardValue}
      ariaLabel="Keyboard view"
      onchange={() => changes.keyboard += 1}
    />
    <output data-testid="keyboard-value">{keyboardValue ?? 'unset'}</output>
    <output data-testid="keyboard-changes">{changes.keyboard}</output>
    <button type="button" onclick={() => keyboardValue = 'timeline'}>Assign keyboard value externally</button>
    <button type="button" onclick={() => keyboardValue = undefined}>Clear keyboard value</button>
  </section>

  <section aria-label="Natural tab navigation">
    <button type="button" tabindex="0" aria-label="Before segmented groups">Before groups</button>
    <SegmentedControl
      options={keyboardOptions}
      bind:value={tabFirstValue}
      ariaLabel="First tab group"
      onchange={() => tabChanges.first += 1}
    />
    <SegmentedControl
      options={keyboardOptions}
      bind:value={tabSecondValue}
      ariaLabel="Second tab group"
      onchange={() => tabChanges.second += 1}
    />
    <button type="button" tabindex="0" aria-label="After segmented groups">After groups</button>
    <output data-testid="tab-first-changes">{tabChanges.first}</output>
    <output data-testid="tab-second-changes">{tabChanges.second}</output>
  </section>

  <section aria-label="RTL selection">
    <div style="direction: rtl">
      <SegmentedControl
        options={rtlOptions}
        bind:value={rtlValue}
        ariaLabel="RTL view"
        dir="rtl"
        onchange={() => changes.rtl += 1}
      />
    </div>
    <output data-testid="rtl-value">{rtlValue}</output>
    <output data-testid="rtl-changes">{changes.rtl}</output>
  </section>

  <section aria-label="Disabled selection">
    <SegmentedControl
      {options}
      bind:value={disabledValue}
      ariaLabel="Disabled view"
      disabled={groupDisabled}
      onchange={() => changes.disabled += 1}
    />
    <output data-testid="disabled-value">{disabledValue}</output>
    <output data-testid="disabled-changes">{changes.disabled}</output>
    <button type="button" onclick={() => groupDisabled = !groupDisabled}>Toggle segmented disabled</button>
  </section>

  <section aria-label="Unavailable controlled values">
    <SegmentedControl
      {options}
      bind:value={disabledCurrentValue}
      ariaLabel="Controlled disabled current"
      onchange={() => changes.disabledCurrent += 1}
    />
    <output data-testid="controlled-disabled-value">{disabledCurrentValue}</output>
    <output data-testid="controlled-disabled-changes">{changes.disabledCurrent}</output>

    <SegmentedControl
      options={removedOptions}
      bind:value={removedValue}
      ariaLabel="Controlled removed current"
      onchange={() => changes.removed += 1}
    />
    <output data-testid="controlled-removed-value">{removedValue}</output>
    <output data-testid="controlled-removed-changes">{changes.removed}</output>
    <button type="button" onclick={() => removedOptions = options.slice(0, 3)}>Remove selected option</button>
  </section>

  <section aria-label="Native fieldset disabled">
    <fieldset disabled={nativeFieldsetDisabled} aria-label="Native fieldset host">
      <SegmentedControl
        {options}
        bind:value={nativeFieldsetValue}
        ariaLabel="Fieldset inherited disabled"
        onchange={() => changes.nativeFieldset += 1}
      />
    </fieldset>
    <output data-testid="native-fieldset-value">{nativeFieldsetValue}</output>
    <output data-testid="native-fieldset-changes">{changes.nativeFieldset}</output>
    <button type="button" onclick={() => nativeFieldsetDisabled = !nativeFieldsetDisabled}>
      Toggle native fieldset disabled
    </button>
  </section>

  <section aria-label="Dynamic option disabled">
    <SegmentedControl
      options={dynamicOptions}
      bind:value={dynamicValue}
      ariaLabel="Dynamic view"
      onchange={() => changes.dynamic += 1}
    />
    <output data-testid="dynamic-value">{dynamicValue}</output>
    <output data-testid="dynamic-changes">{changes.dynamic}</output>
    <output data-testid="dynamic-board-disabled">{dynamicBoardDisabled ? 'true' : 'false'}</output>
    <button type="button" onclick={() => dynamicBoardDisabled = !dynamicBoardDisabled}>
      Toggle board option disabled
    </button>
  </section>

  <section aria-label="Form host">
    <form aria-label="Segmented form" onsubmit={submit}>
      <SegmentedControl
        {options}
        bind:value={formValue}
        ariaLabel="Form view"
        onchange={() => changes.form += 1}
      />
      <output data-testid="form-value">{formValue}</output>
      <output data-testid="form-changes">{changes.form}</output>
      <output data-testid="form-submissions">{submissions.form}</output>
      <button type="submit">Submit segmented form</button>
    </form>
  </section>

  <div style="height: 1400px" aria-hidden="true"></div>
  <section aria-label="Lower viewport selection">
    <SegmentedControl
      {options}
      bind:value={bottomValue}
      ariaLabel="Lower view"
      onchange={() => undefined}
    />
    <output data-testid="bottom-value">{bottomValue}</output>
  </section>
</main>
