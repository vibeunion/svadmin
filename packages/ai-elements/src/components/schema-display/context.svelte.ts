import { createContext } from 'svelte';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export interface SchemaParameter { name: string; type: string; required?: boolean; description?: string; location?: 'path' | 'query' | 'header'; }
export interface SchemaProperty { name: string; type: string; required?: boolean; description?: string; properties?: SchemaProperty[]; items?: SchemaProperty; }
export interface SchemaDisplayContextValue { readonly method: HttpMethod; readonly path: string; readonly description?: string; readonly parameters?: SchemaParameter[]; readonly requestBody?: SchemaProperty[]; readonly responseBody?: SchemaProperty[]; }

const [getSchemaDisplayContext, setSchemaDisplayContext] = createContext<SchemaDisplayContextValue>();
export function provideSchemaDisplayContext(value: SchemaDisplayContextValue): SchemaDisplayContextValue { setSchemaDisplayContext(value); return value; }
export function useSchemaDisplayContext(component = 'SchemaDisplay component'): SchemaDisplayContextValue { try { return getSchemaDisplayContext(); } catch { throw new Error(`${component} must be used within SchemaDisplay`); } }
