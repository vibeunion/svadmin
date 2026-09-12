import { Type } from '@sinclair/typebox';
import { defineResource, useStepsForm, type ResourceContract } from '@svadmin/core';
import * as unsafe from '../../../core/src/unsafe';

const posts = defineResource('posts', {
  record: Type.Object({ id: Type.Number(), title: Type.String(), quantity: Type.Number(), serverOnly: Type.String() }),
  create: Type.Object({ title: Type.String(), quantity: Type.Number() }),
  update: Type.Partial(Type.Object({ title: Type.String(), quantity: Type.Number() })),
});
const form = useStepsForm({ resource: posts, action: 'create', steps: [{ fields: ['title'] }, { fields: ['quantity'] }] });
form.setFieldValue('quantity', 1);
form.setFieldValue('quantity', undefined);
form.setValues({ title: 'Draft' });
form.validateFields(['quantity']);
const advanced: boolean = form.steps.nextStep();
void advanced;
form.reset();
// @ts-expect-error Workflow size is derived from the checked layout.
form.steps.totalSteps = 99;
// @ts-expect-error Navigation availability cannot be forged by callers.
form.steps.canGoNext = true;
// @ts-expect-error Step indexes cannot be string values from unchecked input.
form.steps.gotoStep('1');
// @ts-expect-error Step fields belong to the operation input schema.
useStepsForm({ resource: posts, action: 'create', steps: [{ fields: ['serverOnly'] }] });
// @ts-expect-error Unknown names cannot widen the contract.
useStepsForm({ resource: posts, action: 'create', steps: [{ fields: ['invented'] }] });
// @ts-expect-error A numeric count does not describe a validated workflow.
useStepsForm({ resource: posts, action: 'create', stepsCount: 2 });
// @ts-expect-error Raw resource names cannot claim a contract.
useStepsForm({ resource: 'posts', action: 'create', steps: [{ fields: ['title'] }] });
// @ts-expect-error Edit requires an explicit schema-checked identity.
useStepsForm({ resource: posts, action: 'edit', steps: [{ fields: ['title'] }] });
// @ts-expect-error The identity type derives from the record schema.
useStepsForm({ resource: posts, action: 'edit', id: '1', steps: [{ fields: ['title'] }] });
// @ts-expect-error Missing create schemas are not writable.
useStepsForm({ resource: defineResource('readonly', { record: Type.Object({ id: Type.Number() }) }), action: 'create', steps: [] });
// @ts-expect-error Draft reads do not claim validated business values.
const title: string = form.values.title;
void title;
// @ts-expect-error Concrete setter values retain their schema types.
form.setFieldValue('quantity', '1');
// @ts-expect-error Field-validation selection also retains the schema names.
form.validateFields(['invented']);
// @ts-expect-error Step indexes can only be changed by checked navigation.
form.steps.currentStep = 99;
// @ts-expect-error The legacy unsafe alias is removed, not retained for compatibility.
void unsafe.useStepsForm;
// @ts-expect-error Mutations cannot be retried through legacy configuration.
useStepsForm({ resource: posts, action: 'create', steps: [], createMutationOptions: { retry: 3 } });
declare const dynamic: ResourceContract;
useStepsForm({ resource: dynamic, action: 'edit', id: 1, steps: [{ fields: ['checkedAtRuntime'] }] });
async function receipt() {
  const result = await form.submit();
  const id: number = result.data.id;
  void id;
  // @ts-expect-error Return fields cannot be chosen by the caller.
  const wrong: boolean = result.data.title;
  void wrong;
}
void receipt;
