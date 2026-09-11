import { Type } from '@sinclair/typebox';
import { useContractForm, type ContractFormOptions } from './contract-form.svelte';
import { getContractFormFields, type ContractSchemas, type ContractFormValues } from './resource-contract';
import { snapshotPlainData } from './plain-data';
import { checkExact } from './schema-validation';
import { replaceReactiveMembers } from './reactive-projection';
import { HttpError } from './types';
import { captureAdminContext } from './context.svelte';
import { captureAuthLiveScope } from './auth-hooks.svelte';

type Action = 'create' | 'edit';
type Field<S extends ContractSchemas, A extends Action> = Extract<keyof ContractFormValues<S, A>, string>;
export type UseStepsFormOptions<S extends ContractSchemas = ContractSchemas, A extends Action = Action> =
  ContractFormOptions<S, A> & {
    steps: readonly { readonly fields: readonly NoInfer<Field<S, A>>[] }[];
    defaultStep?: number;
    isBackValidate?: boolean;
  };

const stepsSchema = Type.Array(Type.Object({
  fields: Type.Array(Type.String(), { uniqueItems: true }),
}, { additionalProperties: false }), { minItems: 1 });
function invalid(): HttpError {
  return new HttpError('Invalid form steps', 422, undefined, { code: 'INVALID_RESOURCE_INPUT' });
}

/** Step navigation shares the form's validation, request lifecycle and checked receipts. */
export function useStepsForm<S extends ContractSchemas, A extends Action>(options: UseStepsFormOptions<S, A>) {
  const context = captureAdminContext();
  const layout = $derived.by(() => {
    try {
      const steps = snapshotPlainData(options.steps);
      if (!checkExact(stepsSchema, steps)) throw invalid();
      const names: readonly string[] = getContractFormFields(options.resource, options.action);
      if (steps.some(step => step.fields.some(field => !names.includes(field)))) throw invalid();
      const defaultStep = options.defaultStep ?? 0;
      if (!Number.isInteger(defaultStep) || defaultStep < 0 || defaultStep >= steps.length ||
          (options.isBackValidate !== undefined && typeof options.isBackValidate !== 'boolean')) throw invalid();
      return { ok: true as const, steps, defaultStep, key: JSON.stringify([steps, defaultStep]) };
    } catch {
      return { ok: false as const, error: invalid() };
    }
  });
  let currentStep = $state(0);
  let epoch = 0;
  let navigation: object | undefined;
  let submission: object | undefined;
  let mounted = true;
  function resetNavigation() {
    currentStep = layout.ok ? layout.defaultStep : 0;
    epoch++;
    navigation = undefined;
    submission = undefined;
  }
  const form = useContractForm<S, A>(options, {
    get enabled() { return layout.ok; },
    get key() { return layout.ok ? layout.key : 'invalid'; },
    reset: resetNavigation,
  });
  $effect(() => () => { mounted = false; resetNavigation(); });

  function capture() {
    const revision = epoch;
    const auth = context.authProvider;
    const session = captureAuthLiveScope(auth);
    const router = context.routerProvider;
    const key = layout.ok ? layout.key : undefined;
    return () => mounted && revision === epoch && session.isCurrent() && context.authProvider === auth &&
      context.routerProvider === router && layout.ok && layout.key === key && form.ready;
  }

  function focusErrorStep(current: () => boolean): void {
    if (!current() || !layout.ok) return;
    const first = layout.steps.findIndex(step => step.fields.some(field => Boolean(form.errors[field])));
    if (first >= 0 && current()) currentStep = first;
  }
  function validateTo(step: number, current: () => boolean): boolean {
    if (!current() || !layout.ok) return false;
    const fields = step > currentStep
      ? layout.steps.slice(0, step).flatMap(item => item.fields)
      : layout.steps[currentStep]?.fields ?? [];
    const selected = getContractFormFields(options.resource, options.action).filter(field => fields.includes(field));
    const valid = form.validateFields(selected);
    if (!current()) return false;
    if (!valid) focusErrorStep(current);
    return valid;
  }
  function gotoStep(step: number): boolean {
    if (!layout.ok || !form.ready || form.submitting) return false;
    if (!Number.isInteger(step) || step < 0 || step >= layout.steps.length) throw invalid();
    const token = {};
    navigation = token;
    const active = capture();
    const current = () => navigation === token && active();
    if (step === currentStep) return true;
    if ((step > currentStep || options.isBackValidate === true) && !validateTo(step, current)) return false;
    if (!current()) return false;
    currentStep = step;
    return true;
  }
  function submit(overrides?: Parameters<typeof form.submit>[0]) {
    const current = capture();
    const navigationAtSubmit = navigation;
    const token = {};
    submission = token;
    const source = form.submit(overrides);
    // Observe errors without adding another result handoff after the base form's final check.
    void source.catch(() => {
      try {
        if (submission === token && navigation === navigationAtSubmit && current() && !form.submitting) {
          focusErrorStep(() => submission === token && navigation === navigationAtSubmit && current());
        }
      } catch { /* Workflow presentation cannot replace a checked submission result. */ }
    });
    return source;
  }
  function reset() {
    form.reset();
    resetNavigation();
  }
  const steps = {
    get currentStep() { return mounted && form.ready ? currentStep : 0; },
    get totalSteps() { return layout.ok ? layout.steps.length : 0; },
    get canGoNext() { return form.ready && !form.submitting && layout.ok && currentStep < layout.steps.length - 1; },
    get canGoPrev() { return form.ready && !form.submitting && currentStep > 0; },
    gotoStep,
    nextStep() { return layout.ok && currentStep < layout.steps.length - 1 ? gotoStep(currentStep + 1) : false; },
    prevStep() { return currentStep > 0 ? gotoStep(currentStep - 1) : false; },
  };
  return replaceReactiveMembers(form, {
    steps, submit, reset,
    get error() { return layout.ok ? form.error : invalid(); },
  });
}

export type UseStepsFormReturn<S extends ContractSchemas = ContractSchemas, A extends Action = Action> =
  ReturnType<typeof useStepsForm<S, A>>;
