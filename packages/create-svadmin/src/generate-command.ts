import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import {
  generateResourceBundle,
  type FieldDefinition,
  type ResourceDefinition,
} from '@svadmin/core/inferencer';
import {
  executeInfer,
  planGeneratedFiles,
  parseInferArguments,
  printInferResult,
  type InferCommandOptions,
} from './infer-command';

export type GenerateCommandOptions = InferCommandOptions;

export function parseGenerateArguments(args: string[]): GenerateCommandOptions {
  return parseInferArguments(args);
}

const fieldTypes = {
  text: true, number: true, boolean: true, date: true, select: true, multiselect: true,
  tags: true, textarea: true, richtext: true, image: true, images: true, json: true,
  relation: true, color: true, url: true, email: true, phone: true, currency: true,
  file: true, markdown: true, password: true, array: true, 'tree-select': true,
  treeselect: true, cascader: true, transfer: true, rate: true, rating: true,
  avatar: true, copy: true, code: true,
} satisfies Record<FieldDefinition['type'], true>;

function isFieldType(value: string): value is FieldDefinition['type'] {
  return Object.hasOwn(fieldTypes, value);
}

export function parseManualFields(fields: string, primaryKey: string): FieldDefinition[] {
  const keys = new Set<string>();
  return fields.split(',').map((field) => {
    const [rawKey, rawType, extra] = field.split(':');
    const key = rawKey?.trim();
    const type = rawType === undefined ? 'text' : rawType.trim();
    if (!key || extra !== undefined) throw new Error(`Invalid field definition: ${field}`);
    if (!isFieldType(type)) throw new Error(`Invalid field type: ${type}`);
    if (keys.has(key)) throw new Error(`Duplicate field: ${key}`);
    keys.add(key);
    return {
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      type,
      required: key === primaryKey,
    };
  });
}

export async function generateCommand(args: string[]): Promise<void> {
  const options = parseGenerateArguments(args);

  // If manual resource and fields are provided
  if (options.resource && options.fields) {
    const resourceName = options.resource;
    const primaryKey = options.primaryKey ?? 'id';
    const fieldDefs = parseManualFields(options.fields, primaryKey);
    const resource: ResourceDefinition = {
        name: resourceName,
        label: resourceName.charAt(0).toUpperCase() + resourceName.slice(1),
        primaryKey,
        fields: fieldDefs,
    };
    const resources = [resource];
    const inferRes = generateResourceBundle(resource);
    const bundles = new Map([[resourceName, inferRes]]);
    const files = planGeneratedFiles(resources, bundles, options.format);
    let wrote = false;

    if (options.outDir && options.write) {
      const targetDir = path.resolve(process.cwd(), options.outDir);
      for (const file of files) {
        const fullPath = path.join(targetDir, file.relativePath);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, file.content, 'utf-8');
      }
      wrote = true;
    }

    printInferResult({
      resources,
      bundles,
      files,
      sourceDescription: `manual schema: ${options.fields}`,
      wrote,
      ...(options.outDir === undefined ? {} : { outDir: options.outDir }),
    });
    return;
  }

  // Otherwise delegate to API / schema inference
  if (options.url || options.file) {
    const result = await executeInfer(options);
    printInferResult(result);
    return;
  }

  console.log(`
${pc.bold('svadmin generate')} — Generate complete Resource Definitions, Schemas, and CRUD pages.

${pc.bold('USAGE:')}
  svadmin generate --resource <name> --fields <field:type,...> [OPTIONS]
  svadmin generate --file <schema.json|openapi.yaml|schema.graphql> [OPTIONS]
  svadmin generate --url <api-url|openapi-url> [OPTIONS]

${pc.bold('EXAMPLES:')}
  svadmin generate --resource posts --fields "id:number,title:text,content:textarea,published:boolean" --out-dir src/resources --write
  svadmin generate --file openapi.json --out-dir src/resources --write
`);
}
