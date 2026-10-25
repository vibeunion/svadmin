<script lang="ts">
  import TimePicker from '../../../packages/ui/src/components/TimePicker.svelte';
  import DateTimePicker from '../../../packages/ui/src/components/DateTimePicker.svelte';

  let timeValue = $state<string | null>('09:30');
  let datetimeValue = $state<string | null>('2026-09-21T09:30');
  let lockedTime = $state<string | null>('08:00');
  let lockedDatetime = $state<string | null>('2026-09-21T08:00');
  let timeChanges = $state(0);
  let datetimeChanges = $state(0);
  let lockedChanges = $state(0);
  let submits = $state(0);
  let payload = $state('null');

  function submit(event: SubmitEvent): void {
    event.preventDefault();
    const form = event.currentTarget;
    if (!(form instanceof HTMLFormElement)) return;
    submits += 1;
    payload = JSON.stringify(Object.fromEntries(new FormData(form)));
  }
</script>

<main data-testid="date-time-keyboard-fixture">
  <form onsubmit={submit}>
    <fieldset>
      <legend>Time</legend>
      <button type="button" data-testid="before-time">Before time</button>
      <TimePicker
        name="meetingTime"
        ariaLabel="Keyboard time"
        bind:value={timeValue}
        onchange={() => (timeChanges += 1)}
      />
      <button type="button" data-testid="after-time">After time</button>
    </fieldset>

    <fieldset>
      <legend>Date and time</legend>
      <button type="button" data-testid="before-datetime">Before datetime</button>
      <DateTimePicker
        name="meetingAt"
        ariaLabel="Keyboard datetime"
        bind:value={datetimeValue}
        onchange={() => (datetimeChanges += 1)}
      />
      <button type="button" data-testid="after-datetime">After datetime</button>
    </fieldset>

    <fieldset>
      <legend>Locked</legend>
      <button type="button" data-testid="before-locked">Before locked</button>
      <TimePicker
        name="lockedTime"
        ariaLabel="Locked time"
        disabled
        bind:value={lockedTime}
        onchange={() => (lockedChanges += 1)}
      />
      <DateTimePicker
        name="lockedAt"
        ariaLabel="Locked datetime"
        disabled
        bind:value={lockedDatetime}
        onchange={() => (lockedChanges += 1)}
      />
      <button type="button" data-testid="after-locked">After locked</button>
    </fieldset>

    <button type="submit">Submit keyboard form</button>
  </form>

  <output data-testid="time-bound">{timeValue ?? 'null'}</output>
  <output data-testid="datetime-bound">{datetimeValue ?? 'null'}</output>
  <output data-testid="locked-time-bound">{lockedTime ?? 'null'}</output>
  <output data-testid="locked-datetime-bound">{lockedDatetime ?? 'null'}</output>
  <output data-testid="time-changes">{timeChanges}</output>
  <output data-testid="datetime-changes">{datetimeChanges}</output>
  <output data-testid="locked-changes">{lockedChanges}</output>
  <output data-testid="keyboard-submits">{submits}</output>
  <output data-testid="keyboard-payload">{payload}</output>
</main>