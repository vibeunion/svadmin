import type { StrictResourceDefinition } from '../resource-types';

export const showcaseResources = [
  {
      name: 'design_principles',
      label: 'Design Principles',
      icon: 'layers',
      fields: [],
      showInMenu: false,
    },
] satisfies StrictResourceDefinition<'design_principles'>[];
