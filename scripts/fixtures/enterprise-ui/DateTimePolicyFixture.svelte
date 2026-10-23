<script lang="ts">
  import DatePicker from '../../../packages/ui/src/components/DatePicker.svelte';
  import DateRangePicker from '../../../packages/ui/src/components/DateRangePicker.svelte';
  import DateTimePicker from '../../../packages/ui/src/components/DateTimePicker.svelte';
  import type { DateRangeInputValue } from '../../../packages/ui/src/components/DateRangeInput.svelte';

  let dateValue = $state<string | null>('2026-09-18');
  let dateChanges = $state(0);
  let dateSubmits = $state(0);
  let datePayload = $state('null');

  let rangeValue = $state<DateRangeInputValue>({ start: '2026-09-10', end: '2026-09-20' });
  let rangeChanges = $state(0);
  let rangeSubmits = $state(0);
  let rangePayload = $state('null');
  const rangePresets = [
    { label: 'Working week', value: { start: '2026-09-14', end: '2026-09-18' } },
    { label: 'Blocked day', value: { start: '2026-09-19', end: '2026-09-20' } },
    { label: 'Reversed', value: { start: '2026-09-25', end: '2026-09-15' } },
  ];
  function blockedDate(date: string): boolean {
    return date === '2026-09-19';
  }

  let gapValue = $state<string | null>('2026-03-08T09:00:00.000Z');
  let gapChanges = $state(0);
  let gapSubmits = $state(0);
  let gapPayload = $state('null');

  let foldRejectValue = $state<string | null>(null);
  let foldRejectChanges = $state(0);
  let foldRejectSubmits = $state(0);
  let foldRejectPayload = $state('null');

  let foldEarlierValue = $state<string | null>(null);
  let foldEarlierChanges = $state(0);
  let foldEarlierSubmits = $state(0);
  let foldEarlierPayload = $state('null');

  let foldLaterValue = $state<string | null>(null);
  let foldLaterChanges = $state(0);
  let foldLaterSubmits = $state(0);
  let foldLaterPayload = $state('null');

  function serialize(form: HTMLFormElement): string {
    return JSON.stringify(Object.fromEntries(new FormData(form).entries()));
  }

  function submitDate(event: SubmitEvent): void {
    event.preventDefault();
    dateSubmits += 1;
    datePayload = serialize(event.currentTarget as HTMLFormElement);
  }

  function submitRange(event: SubmitEvent): void {
    event.preventDefault();
    rangeSubmits += 1;
    rangePayload = serialize(event.currentTarget as HTMLFormElement);
  }

  function submitGap(event: SubmitEvent): void {
    event.preventDefault();
    gapSubmits += 1;
    gapPayload = serialize(event.currentTarget as HTMLFormElement);
  }

  function submitFoldReject(event: SubmitEvent): void {
    event.preventDefault();
    foldRejectSubmits += 1;
    foldRejectPayload = serialize(event.currentTarget as HTMLFormElement);
  }

  function submitFoldEarlier(event: SubmitEvent): void {
    event.preventDefault();
    foldEarlierSubmits += 1;
    foldEarlierPayload = serialize(event.currentTarget as HTMLFormElement);
  }

  function submitFoldLater(event: SubmitEvent): void {
    event.preventDefault();
    foldLaterSubmits += 1;
    foldLaterPayload = serialize(event.currentTarget as HTMLFormElement);
  }
</script>

<main data-testid="date-time-policy-fixture">
  <section>
    <form data-testid="date-form" onsubmit={submitDate}>
      <DatePicker
        name="booking"
        ariaLabel="Policy date"
        bind:value={dateValue}
        disabledDate={blockedDate}
        onchange={() => { dateChanges += 1; }}
      />
      <button type="submit">Submit date</button>
    </form>
    <output data-testid="date-bound">{dateValue ?? 'null'}</output>
    <output data-testid="date-onchanges">{dateChanges}</output>
    <output data-testid="date-submits">{dateSubmits}</output>
    <output data-testid="date-payload">{datePayload}</output>
  </section>

  <section>
    <form data-testid="range-form" onsubmit={submitRange}>
      <DateRangePicker
        startName="period.start"
        endName="period.end"
        startAriaLabel="Policy range start"
        endAriaLabel="Policy range end"
        min="2026-09-01"
        max="2026-09-30"
        presets={rangePresets}
        disabledDate={blockedDate}
        bind:value={rangeValue}
        onchange={() => { rangeChanges += 1; }}
      />
      <button type="submit">Submit range</button>
    </form>
    <output data-testid="range-bound">{JSON.stringify(rangeValue)}</output>
    <output data-testid="range-onchanges">{rangeChanges}</output>
    <output data-testid="range-submits">{rangeSubmits}</output>
    <output data-testid="range-payload">{rangePayload}</output>
  </section>

  <section>
    <form data-testid="gap-form" onsubmit={submitGap}>
      <DateTimePicker
        name="gapAt"
        ariaLabel="Gap instant"
        valueMode="instant"
        timeZone="America/Los_Angeles"
        bind:value={gapValue}
        onchange={() => { gapChanges += 1; }}
      />
      <button type="submit">Submit gap</button>
    </form>
    <output data-testid="gap-bound">{gapValue ?? 'null'}</output>
    <output data-testid="gap-onchanges">{gapChanges}</output>
    <output data-testid="gap-submits">{gapSubmits}</output>
    <output data-testid="gap-payload">{gapPayload}</output>
  </section>

  <section>
    <form data-testid="fold-reject-form" onsubmit={submitFoldReject}>
      <DateTimePicker
        name="foldRejectAt"
        ariaLabel="Fold reject"
        valueMode="instant"
        timeZone="America/Los_Angeles"
        bind:value={foldRejectValue}
        onchange={() => { foldRejectChanges += 1; }}
      />
      <button type="submit">Submit fold reject</button>
    </form>
    <output data-testid="fold-reject-bound">{foldRejectValue ?? 'null'}</output>
    <output data-testid="fold-reject-onchanges">{foldRejectChanges}</output>
    <output data-testid="fold-reject-submits">{foldRejectSubmits}</output>
    <output data-testid="fold-reject-payload">{foldRejectPayload}</output>
  </section>

  <section>
    <form data-testid="fold-earlier-form" onsubmit={submitFoldEarlier}>
      <DateTimePicker
        name="foldEarlierAt"
        ariaLabel="Fold earlier"
        valueMode="instant"
        timeZone="America/Los_Angeles"
        disambiguation="earlier"
        bind:value={foldEarlierValue}
        onchange={() => { foldEarlierChanges += 1; }}
      />
      <button type="submit">Submit fold earlier</button>
    </form>
    <output data-testid="fold-earlier-bound">{foldEarlierValue ?? 'null'}</output>
    <output data-testid="fold-earlier-onchanges">{foldEarlierChanges}</output>
    <output data-testid="fold-earlier-submits">{foldEarlierSubmits}</output>
    <output data-testid="fold-earlier-payload">{foldEarlierPayload}</output>
  </section>

  <section>
    <form data-testid="fold-later-form" onsubmit={submitFoldLater}>
      <DateTimePicker
        name="foldLaterAt"
        ariaLabel="Fold later"
        valueMode="instant"
        timeZone="America/Los_Angeles"
        disambiguation="later"
        bind:value={foldLaterValue}
        onchange={() => { foldLaterChanges += 1; }}
      />
      <button type="submit">Submit fold later</button>
    </form>
    <output data-testid="fold-later-bound">{foldLaterValue ?? 'null'}</output>
    <output data-testid="fold-later-onchanges">{foldLaterChanges}</output>
    <output data-testid="fold-later-submits">{foldLaterSubmits}</output>
    <output data-testid="fold-later-payload">{foldLaterPayload}</output>
  </section>
</main>