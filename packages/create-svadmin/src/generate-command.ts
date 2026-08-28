import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import {
  inferResource,
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

export async function generateCommand(args: string[]): Promise<void> {
  const options = parseGenerateArguments(args);

  // If manual resource and fields are provided
  if (options.resource && options.fields) {
    const resourceName = options.resource;
    const primaryKey = options.primaryKey ?? 'id';
    const fieldDefs: FieldDefinition[] = options.fields.split(',').map((f) => {
      const [key, typeRaw] = f.split(':');
      const type = (typeRaw || 'text') as FieldDefinition['type'];
      return {
        key: key.trim(),
        label: key.trim().charAt(0).toUpperCase() + key.trim().slice(1),
        type,
        required: key.trim() === primaryKey,
      };
    });

    const mockSample: Record<string, unknown> = {};
    for (const f of fieldDefs) {
      mockSample[f.key] = f.type === 'number' ? 1 : f.type === 'boolean' ? true : `sample_${f.key}`;
    }

    const inferRes = inferResource(resourceName, [mockSample], { primaryKey });
    const resources: ResourceDefinition[] = [
      {
        name: resourceName,
        label: resourceName.charAt(0).toUpperCase() + resourceName.slice(1),
        primaryKey,
        fields: fieldDefs,
      },
    ];

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
      outDir: options.outDir,
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
