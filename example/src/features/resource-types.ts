import type { FieldDefinition, ResourceDefinition } from '@svadmin/core';
import type { DemoResource, DemoRow } from '../resource-schemas';

export type StrictDemoFieldDefinition<Name extends DemoResource> = Omit<FieldDefinition, 'key'> & {
  key: keyof DemoRow<Name> & string;
};

export type StrictResourceDefinition<Name extends string> = Omit<ResourceDefinition, 'name' | 'fields'> & {
  name: Name;
  fields: Name extends DemoResource ? StrictDemoFieldDefinition<Name>[] : FieldDefinition[];
};
