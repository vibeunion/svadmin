<script lang="ts">
  import RadioGroup, { type RadioGroupOption } from '../../../packages/ui/src/components/RadioGroup.svelte';

  type Visibility = 'personal' | 'team' | 'company' | 'department';
  type SubmissionKey = 'namedFirst' | 'namedSecond' | 'unnamed' | 'disabled';

  const options: readonly RadioGroupOption<Visibility>[] = [
    { value: 'personal', label: 'Personal', description: 'Only you can access it.' },
    { value: 'team', label: 'Team', disabled: true },
    { value: 'company', label: 'Company' },
  ];
  const rtlOptions: readonly RadioGroupOption<Visibility>[] = [
    ...options,
    { value: 'department', label: 'Department' },
  ];

  let namedFirst = $state<Visibility | null>(null);
  let namedSecond = $state<Visibility | null>(null);
  let unnamedFirst = $state<Visibility | null>(null);
  let unnamedSecond = $state<Visibility>('company');
  let rtlValue = $state<Visibility>('company');
  let disabledValue = $state<Visibility>('personal');
  let outerValue = $state<Visibility>('personal');
  let parentValue = $state<Visibility | null>('personal');
  let groupDisabled = $state(true);
  let outerDisabled = $state(true);
  let editableFirst = $state<Visibility | null>(null);
  let editableSecond = $state<Visibility | null>(null);
  let inertFirst = $state<Visibility | null>(null);
  let inertSecond = $state<Visibility | null>(null);
  let emptyNameFirst = $state<Visibility | null>(null);
  let emptyNameSecond = $state<Visibility | null>(null);
  let hostBoundaryFirst = $state<Visibility | null>(null);
  let hostBoundarySecond = $state<Visibility | null>(null);
  let outerRequiredValue = $state<Visibility | null>(null);
  let outerRequiredDisabled = $state(true);
  const submissions = $state<Record<SubmissionKey, number>>({
    namedFirst: 0, namedSecond: 0, unnamed: 0, disabled: 0,
  });
  const changes = $state({
    namedFirst: 0, namedSecond: 0, unnamedFirst: 0, unnamedSecond: 0,
    rtl: 0, disabled: 0, outer: 0, parent: 0,
  });

  function submit(event: SubmitEvent, key: SubmissionKey): void {
    event.preventDefault();
    submissions[key] += 1;
  }
</script>

<main data-testid="radio-group-fixture">
  <section aria-label="Named forms">
    <form aria-label="Named first form" onsubmit={(event) => submit(event, 'namedFirst')}>
      <RadioGroup
        name="visibility"
        required
        legend="Named first visibility"
        {options}
        bind:value={namedFirst}
        onchange={() => changes.namedFirst += 1}
      />
      <button type="submit">Submit named first</button>
    </form>
    <form aria-label="Named second form" onsubmit={(event) => submit(event, 'namedSecond')}>
      <RadioGroup
        name="visibility"
        required
        legend="Named second visibility"
        {options}
        bind:value={namedSecond}
        onchange={() => changes.namedSecond += 1}
      />
      <button type="submit">Submit named second</button>
    </form>
    <output data-testid="named-first-value">{namedFirst ?? 'null'}</output>
    <output data-testid="named-second-value">{namedSecond ?? 'null'}</output>
    <output data-testid="named-first-changes">{changes.namedFirst}</output>
    <output data-testid="named-second-changes">{changes.namedSecond}</output>
    <output data-testid="named-first-submissions">{submissions.namedFirst}</output>
    <output data-testid="named-second-submissions">{submissions.namedSecond}</output>
  </section>

  <section aria-label="Unnamed shared form">
    <form aria-label="Unnamed shared form" onsubmit={(event) => submit(event, 'unnamed')}>
      <RadioGroup
        required
        legend="Unnamed required visibility"
        {options}
        bind:value={unnamedFirst}
        onchange={() => changes.unnamedFirst += 1}
      />
      <RadioGroup
        legend="Unnamed second visibility"
        {options}
        bind:value={unnamedSecond}
        onchange={() => changes.unnamedSecond += 1}
      />
      <button type="submit">Submit unnamed</button>
    </form>
    <output data-testid="unnamed-first-value">{unnamedFirst ?? 'null'}</output>
    <output data-testid="unnamed-second-value">{unnamedSecond ?? 'null'}</output>
    <output data-testid="unnamed-first-changes">{changes.unnamedFirst}</output>
    <output data-testid="unnamed-second-changes">{changes.unnamedSecond}</output>
    <output data-testid="unnamed-submissions">{submissions.unnamed}</output>
  </section>

  <section aria-label="RTL unnamed form">
    <form aria-label="RTL form">
      <div style="direction: rtl">
        <RadioGroup
          legend="RTL visibility"
          options={rtlOptions}
          bind:value={rtlValue}
          onchange={() => changes.rtl += 1}
        />
      </div>
    </form>
    <output data-testid="rtl-value">{rtlValue}</output>
    <output data-testid="rtl-changes">{changes.rtl}</output>
    <button type="button" onclick={() => rtlValue = 'company'}>Set RTL company</button>
  </section>

  <section aria-label="Disabled groups">
    <form aria-label="Disabled form" onsubmit={(event) => submit(event, 'disabled')}>
      <RadioGroup
        name="disabled_visibility"
        legend="Disabled visibility"
        {options}
        disabled={groupDisabled}
        bind:value={disabledValue}
        onchange={() => changes.disabled += 1}
      />
      <fieldset disabled={outerDisabled}>
        <legend>Outer disabled fieldset</legend>
        <RadioGroup
          name="outer_visibility"
          legend="Outer disabled visibility"
          {options}
          bind:value={outerValue}
          onchange={() => changes.outer += 1}
        />
      </fieldset>
      <button type="submit">Submit disabled</button>
    </form>
    <output data-testid="disabled-value">{disabledValue}</output>
    <output data-testid="outer-value">{outerValue}</output>
    <output data-testid="disabled-changes">{changes.disabled}</output>
    <output data-testid="outer-changes">{changes.outer}</output>
    <output data-testid="disabled-submissions">{submissions.disabled}</output>
    <button type="button" onclick={() => groupDisabled = !groupDisabled}>Toggle group disabled</button>
    <button type="button" onclick={() => outerDisabled = !outerDisabled}>Toggle outer disabled</button>
  </section>

  <section aria-label="Parent updates">
    <form aria-label="Parent form">
      <RadioGroup
        name="parent_visibility"
        legend="Parent visibility"
        {options}
        bind:value={parentValue}
        onchange={() => changes.parent += 1}
      />
    </form>
    <output data-testid="parent-value">{parentValue ?? 'null'}</output>
    <output data-testid="parent-changes">{changes.parent}</output>
    <button type="button" onclick={() => parentValue = 'company'}>Set parent company</button>
    <button type="button" onclick={() => parentValue = null}>Clear parent value</button>
  </section>

  <section aria-label="Tab boundary scenarios">
    <form aria-label="Editable boundary form">
      <RadioGroup
        legend="Editable boundary first"
        {options}
        bind:value={editableFirst}
      />
      <div contenteditable="true" role="textbox" aria-label="Editable boundary">Editable boundary</div>
      <RadioGroup
        legend="Editable boundary second"
        {options}
        bind:value={editableSecond}
      />
    </form>
    <output data-testid="editable-first-value">{editableFirst ?? 'null'}</output>
    <output data-testid="editable-second-value">{editableSecond ?? 'null'}</output>

    <form aria-label="Inert boundary form">
      <RadioGroup
        legend="Inert boundary first"
        {options}
        bind:value={inertFirst}
      />
      <input type="radio" aria-label="Inert adjacent radio" inert />
      <RadioGroup
        legend="Inert boundary second"
        {options}
        bind:value={inertSecond}
      />
    </form>
    <output data-testid="inert-first-value">{inertFirst ?? 'null'}</output>
    <output data-testid="inert-second-value">{inertSecond ?? 'null'}</output>
  </section>

  <section aria-label="Empty name shared form">
    <form aria-label="Empty name shared form">
      <RadioGroup
        name=""
        legend="Empty name first"
        {options}
        bind:value={emptyNameFirst}
      />
      <RadioGroup
        name=""
        legend="Empty name second"
        {options}
        bind:value={emptyNameSecond}
      />
      <button type="button">Empty name action</button>
    </form>
    <output data-testid="empty-name-first-value">{emptyNameFirst ?? 'null'}</output>
    <output data-testid="empty-name-second-value">{emptyNameSecond ?? 'null'}</output>
  </section>

  <section aria-label="Host focus boundary">
    <form aria-label="Host focus boundary form">
      <RadioGroup
        legend="Host boundary first"
        {options}
        bind:value={hostBoundaryFirst}
      />
      <button type="button" tabindex="0" aria-disabled="true">Host boundary action</button>
      <RadioGroup
        legend="Host boundary second"
        {options}
        bind:value={hostBoundarySecond}
      />
    </form>
    <output data-testid="host-boundary-first-value">{hostBoundaryFirst ?? 'null'}</output>
    <output data-testid="host-boundary-second-value">{hostBoundarySecond ?? 'null'}</output>
  </section>

  <section aria-label="Outer required fieldset">
    <form aria-label="Outer required form">
      <fieldset disabled={outerRequiredDisabled}>
        <legend>Outer required fieldset</legend>
        <RadioGroup
          required
          legend="Outer required visibility"
          {options}
          bind:value={outerRequiredValue}
        />
      </fieldset>
    </form>
    <output data-testid="outer-required-value">{outerRequiredValue ?? 'null'}</output>
    <button type="button" onclick={() => outerRequiredDisabled = !outerRequiredDisabled}>Toggle outer required disabled</button>
  </section>
</main>
