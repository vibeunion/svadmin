import type { StrictResourceDefinition } from '../resource-types';

export const caseResources = [
  {
      name: 'case_workspace',
      label: 'Case Workspace',
      icon: 'flask-conical',
      fields: [],
      showInMenu: false,
    },
] satisfies StrictResourceDefinition<'case_workspace'>[];
