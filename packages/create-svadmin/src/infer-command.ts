import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import prompts from 'prompts';
import {
  inferResource,
  inferFromOpenAPI,
  inferFromGraphQL,
  generateResourceBundle,
  GRAPHQL_INTROSPECTION_QUERY,
  type ResourceDefinition,
  type InferResult,
} from '@svadmin/core/inferencer';

export interface InferCommandOptions {
  url?: string;
  file?: string;
  type?: 'rest' | 'openapi' | 'graphql' | 'auto';
  resource?: string;
  outDir?: string;
  primaryKey?: string;
  headers?: Record<string, string>;
  method?: string;
  body?: string;
  write?: boolean;
  format?: 'all' | 'resource' | 'typebox' | 'components';
}

export interface GeneratedFile {
  relativePath: string;
  content: string;
}

export interface InferExecutionResult {
  resources: ResourceDefinition[];
  bundles: Map<string, InferResult>;
  files: GeneratedFile[];
  sourceDescription: string;
  wrote: boolean;
  outDir?: string;
}

/**
 * Parse CLI arguments for `infer` subcommand.
 */
export function parseInferArguments(args: string[]): InferCommandOptions {
  const options: InferCommandOptions = {
    headers: {},
    primaryKey: 'id',
    method: 'GET',
    format: 'all',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--write' || arg === '-w') {
      options.write = true;
    } else if (arg === '--dry-run') {
      options.write = false;
    } else if (arg === '--url' || arg === '-u') {
      options.url = args[++i];
    } else if (arg.startsWith('--url=')) {
      options.url = arg.slice(6);
    } else if (arg === '--file' || arg === '-f') {
      options.file = args[++i];
    } else if (arg.startsWith('--file=')) {
      options.file = arg.slice(7);
    } else if (arg === '--type' || arg === '-t') {
      options.type = args[++i] as InferCommandOptions['type'];
    } else if (arg.startsWith('--type=')) {
      options.type = arg.slice(7) as InferCommandOptions['type'];
    } else if (arg === '--resource' || arg === '-r') {
      options.resource = args[++i];
    } else if (arg.startsWith('--resource=')) {
      options.resource = arg.slice(11);
    } else if (arg === '--out-dir' || arg === '-o' || arg === '--output') {
      options.outDir = args[++i];
    } else if (arg.startsWith('--out-dir=')) {
      options.outDir = arg.slice(10);
    } else if (arg.startsWith('--output=')) {
      options.outDir = arg.slice(9);
    } else if (arg === '--primary-key' || arg === '-k') {
      options.primaryKey = args[++i];
    } else if (arg.startsWith('--primary-key=')) {
      options.primaryKey = arg.slice(14);
    } else if (arg === '--header' || arg === '-H') {
      const headerLine = args[++i] ?? '';
      const colonIndex = headerLine.indexOf(':');
      if (colonIndex > 0) {
        const key = headerLine.slice(0, colonIndex).trim();
        const value = headerLine.slice(colonIndex + 1).trim();
        if (!options.headers) options.headers = {};
        options.headers[key] = value;
      }
    } else if (arg.startsWith('--header=')) {
      const headerLine = arg.slice(9);
      const colonIndex = headerLine.indexOf(':');
      if (colonIndex > 0) {
        const key = headerLine.slice(0, colonIndex).trim();
        const value = headerLine.slice(colonIndex + 1).trim();
        if (!options.headers) options.headers = {};
        options.headers[key] = value;
      }
    } else if (arg === '--method' || arg === '-m') {
      options.method = (args[++i] ?? 'GET').toUpperCase();
    } else if (arg.startsWith('--method=')) {
      options.method = arg.slice(9).toUpperCase();
    } else if (arg === '--body' || arg === '-b') {
      options.body = args[++i];
    } else if (arg.startsWith('--body=')) {
      options.body = arg.slice(7);
    } else if (arg === '--format') {
      options.format = args[++i] as InferCommandOptions['format'];
    } else if (arg.startsWith('--format=')) {
      options.format = arg.slice(9) as InferCommandOptions['format'];
    } else if (arg === '--help' || arg === '-h') {
      printInferHelp();
      process.exit(0);
    } else if (!arg.startsWith('-') && !options.url && !options.file) {
      if (arg.startsWith('http://') || arg.startsWith('https://')) {
        options.url = arg;
      } else if (fs.existsSync(arg)) {
        options.file = arg;
      } else {
        options.resource = arg;
      }
    }
  }

  return options;
}

export function printInferHelp(): void {
  console.log(`
${pc.bold('svadmin infer')} — Automatically infer ResourceDefinitions, TypeBox Schemas, and Svelte 5 CRUD components from REST/GraphQL APIs or OpenAPI specs.

${pc.bold('USAGE:')}
  svadmin infer [OPTIONS]
  svadmin infer <url|file> [OPTIONS]

${pc.bold('OPTIONS:')}
  -u, --url <url>              REST API endpoint, OpenAPI schema URL, or GraphQL endpoint
  -f, --file <path>            Local OpenAPI JSON/YAML, GraphQL schema (.graphql/JSON), or sample JSON data file
  -t, --type <type>            Explicit source type: rest | openapi | graphql | auto (default: auto)
  -r, --resource <name>        Target resource name filter or explicit resource name for sample data
  -o, --out-dir <dir>          Target directory for generated code (e.g. src/resources)
  -k, --primary-key <key>      Primary key field name (default: id)
  -H, --header <key:value>     Custom HTTP header for fetch requests (can be specified multiple times)
  -m, --method <GET|POST>      HTTP method for REST fetch (default: GET)
  -b, --body <json>            HTTP request body for POST requests
  -w, --write                  Write generated files to target directory (default is dry-run when --out-dir is set)
      --format <all|resource|typebox|components>
                               Output format (default: all)
  -h, --help                   Show this help message

${pc.bold('EXAMPLES:')}
  svadmin infer --url https://api.example.com/openapi.json --out-dir src/resources --write
  svadmin infer --url https://api.example.com/graphql --out-dir src/resources --write
  svadmin infer --url https://api.example.com/api/v1/posts --resource posts
  svadmin infer --file schema.graphql --out-dir src/resources --write
  svadmin infer --file sample-posts.json --resource posts --out-dir src/resources --write
`);
}

/**
 * Fetch or load data from source (URL or File).
 */
export async function loadSourceData(
  options: InferCommandOptions,
  customFetch: typeof fetch = fetch
): Promise<{
  sourceType: 'openapi' | 'graphql' | 'rest';
  data: unknown;
  derivedResourceName?: string;
  sourceDescription: string;
}> {
  if (options.file) {
    const filePath = path.resolve(process.cwd(), options.file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const ext = path.extname(filePath).toLowerCase();
    const baseName = path.basename(filePath, ext);

    if (ext === '.graphql' || ext === '.gql') {
      return {
        sourceType: 'graphql',
        data: content,
        derivedResourceName: options.resource || baseName,
        sourceDescription: options.file,
      };
    }

    try {
      const json = JSON.parse(content);
      if (
        (typeof json === 'object' && json !== null) &&
        ('openapi' in json || 'swagger' in json || ('paths' in json && 'components' in json))
      ) {
        return {
          sourceType: 'openapi',
          data: json,
          derivedResourceName: options.resource,
          sourceDescription: options.file,
        };
      }

      if (
        (typeof json === 'object' && json !== null) &&
        ('__schema' in json || ('data' in json && json.data && '__schema' in json.data) || ('types' in json && Array.isArray(json.types)))
      ) {
        return {
          sourceType: 'graphql',
          data: json,
          derivedResourceName: options.resource,
          sourceDescription: options.file,
        };
      }

      // REST sample data
      const records = Array.isArray(json)
        ? json
        : Array.isArray(json.data)
        ? json.data
        : Array.isArray(json.items)
        ? json.items
        : [json];

      return {
        sourceType: 'rest',
        data: records,
        derivedResourceName: options.resource || baseName,
        sourceDescription: options.file,
      };
    } catch {
      // If it fails JSON parse, but has GraphQL schema syntax
      if (content.includes('type ') || content.includes('enum ') || content.includes('schema ')) {
        return {
          sourceType: 'graphql',
          data: content,
          derivedResourceName: options.resource || baseName,
          sourceDescription: options.file,
        };
      }
      throw new Error(`Unable to parse file ${filePath}. Expected valid JSON or GraphQL SDL schema.`);
    }
  }

  if (options.url) {
    const url = options.url;
    const isGraphQL = options.type === 'graphql' || url.endsWith('/graphql') || url.includes('/graphql?');

    if (isGraphQL) {
      const response = await customFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(options.headers ?? {}),
        },
        body: JSON.stringify({ query: GRAPHQL_INTROSPECTION_QUERY }),
      });

      if (!response.ok) {
        throw new Error(`GraphQL introspection request failed: HTTP ${response.status} ${response.statusText}`);
      }

      const json: unknown = await response.json();
      return {
        sourceType: 'graphql',
        data: json,
        derivedResourceName: options.resource,
        sourceDescription: url,
      };
    }

    // REST or OpenAPI fetch
    const response = await customFetch(url, {
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(options.headers ?? {}),
      },
      body: options.body,
    });

    if (!response.ok) {
      throw new Error(`HTTP request failed: HTTP ${response.status} ${response.statusText}`);
    }

    const json = (await response.json()) as Record<string, unknown>;

    if (
      (typeof json === 'object' && json !== null) &&
      ('openapi' in json || 'swagger' in json || ('paths' in json && 'components' in json))
    ) {
      return {
        sourceType: 'openapi',
        data: json,
        derivedResourceName: options.resource,
        sourceDescription: url,
      };
    }

    if (
      (typeof json === 'object' && json !== null) &&
      ('__schema' in json || ('data' in json && (json.data as Record<string, unknown>)?.__schema))
    ) {
      return {
        sourceType: 'graphql',
        data: json,
        derivedResourceName: options.resource,
        sourceDescription: url,
      };
    }

    // Derive resource name from pathname (e.g. /api/v1/posts -> posts)
    let derivedName = options.resource;
    if (!derivedName) {
      try {
        const parsedUrl = new URL(url);
        const segments = parsedUrl.pathname.split('/').filter(Boolean);
        derivedName = segments.pop() || 'items';
      } catch {
        derivedName = 'items';
      }
    }

    const records = Array.isArray(json)
      ? json
      : Array.isArray(json.data)
      ? json.data
      : Array.isArray(json.items)
      ? json.items
      : [json];

    return {
      sourceType: 'rest',
      data: records,
      derivedResourceName: derivedName,
      sourceDescription: url,
    };
  }

  throw new Error('Must provide either --url <url> or --file <path>');
}

/**
 * Plan all generated files for the inferred resources.
 */
export function planGeneratedFiles(
  resources: ResourceDefinition[],
  bundles: Map<string, InferResult>,
  format: InferCommandOptions['format'] = 'all'
): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const exportLines: string[] = [];

  for (const resource of resources) {
    const bundle = bundles.get(resource.name);
    if (!bundle) continue;

    const baseName = resource.name;
    const pascalName = capitalize(resource.name.endsWith('s') ? resource.name.slice(0, -1) : resource.name);

    if (format === 'all' || format === 'resource') {
      files.push({
        relativePath: `${baseName}.resource.ts`,
        content: bundle.code,
      });
      exportLines.push(`export * from './${baseName}.resource.js';`);
    }

    if (format === 'all' || format === 'typebox') {
      files.push({
        relativePath: `${baseName}.schema.ts`,
        content: bundle.typeboxCode,
      });
      exportLines.push(`export * from './${baseName}.schema.js';`);
    }

    if (format === 'all' || format === 'components') {
      files.push({
        relativePath: `${baseName}/ListPage.svelte`,
        content: bundle.componentCode.list,
      });
      files.push({
        relativePath: `${baseName}/CreatePage.svelte`,
        content: bundle.componentCode.create,
      });
      files.push({
        relativePath: `${baseName}/EditPage.svelte`,
        content: bundle.componentCode.edit,
      });
      files.push({
        relativePath: `${baseName}/ShowPage.svelte`,
        content: bundle.componentCode.show,
      });

      exportLines.push(`export { default as ${pascalName}ListPage } from './${baseName}/ListPage.svelte';`);
      exportLines.push(`export { default as ${pascalName}CreatePage } from './${baseName}/CreatePage.svelte';`);
      exportLines.push(`export { default as ${pascalName}EditPage } from './${baseName}/EditPage.svelte';`);
      exportLines.push(`export { default as ${pascalName}ShowPage } from './${baseName}/ShowPage.svelte';`);
    }
  }

  if (files.length > 0) {
    files.push({
      relativePath: 'index.ts',
      content: `// Auto-generated by @svadmin/create infer\n\n${exportLines.join('\n')}\n`,
    });
  }

  return files;
}

/**
 * Execute inference and optionally write files.
 */
export async function executeInfer(
  options: InferCommandOptions,
  customFetch: typeof fetch = fetch
): Promise<InferExecutionResult> {
  const loaded = await loadSourceData(options, customFetch);
  const primaryKey = options.primaryKey ?? 'id';
  let resources: ResourceDefinition[];
  const bundles = new Map<string, InferResult>();

  if (loaded.sourceType === 'openapi') {
    resources = inferFromOpenAPI(loaded.data as Record<string, unknown>, {
      primaryKey,
      include: options.resource ? [options.resource] : undefined,
    });
    for (const res of resources) {
      bundles.set(res.name, generateResourceBundle(res));
    }
  } else if (loaded.sourceType === 'graphql') {
    resources = inferFromGraphQL(loaded.data, {
      primaryKey,
      include: options.resource ? [options.resource] : undefined,
    });
    for (const res of resources) {
      bundles.set(res.name, generateResourceBundle(res));
    }
  } else {
    // REST sample data
    const resName = options.resource || loaded.derivedResourceName || 'items';
    const sampleArray = Array.isArray(loaded.data)
      ? (loaded.data as Record<string, unknown>[])
      : [loaded.data as Record<string, unknown>];
    const inferRes = inferResource(resName, sampleArray, { primaryKey });
    resources = [inferRes.resource];
    bundles.set(resName, inferRes);
  }

  if (resources.length === 0) {
    throw new Error(`No resources could be inferred from ${loaded.sourceDescription}`);
  }

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

  return {
    resources,
    bundles,
    files,
    sourceDescription: loaded.sourceDescription,
    wrote,
    outDir: options.outDir,
  };
}

/**
 * Print result to console.
 */
export function printInferResult(result: InferExecutionResult): void {
  console.log();
  console.log(pc.cyan('  ╔═══════════════════════════════════╗'));
  console.log(pc.cyan('  ║  ') + pc.bold('svadmin infer') + pc.cyan('                    ║'));
  console.log(pc.cyan('  ║  ') + pc.dim('Automated Code & UI Inferencer') + pc.cyan(' ║'));
  console.log(pc.cyan('  ╚═══════════════════════════════════╝'));
  console.log();

  console.log(pc.bold(`  Source: ${pc.cyan(result.sourceDescription)}`));
  console.log(pc.bold(`  Inferred: ${pc.green(result.resources.length.toString())} resource(s): ${result.resources.map(r => r.name).join(', ')}`));
  console.log();

  if (result.outDir) {
    if (result.wrote) {
      console.log(pc.green(`  ✔ Written ${result.files.length} file(s) to ${pc.cyan(result.outDir)}:`));
      for (const file of result.files) {
        console.log(`    ${pc.green('•')} ${path.join(result.outDir, file.relativePath)}`);
      }
      console.log();
      console.log(pc.dim('  Next step: import and register your generated resources in src/resources.ts'));
    } else {
      console.log(pc.yellow(`  Dry run plan — ${result.files.length} file(s) planned for ${pc.cyan(result.outDir)}:`));
      for (const file of result.files) {
        console.log(`    ${pc.cyan('•')} ${path.join(result.outDir, file.relativePath)}`);
      }
      console.log();
      console.log(pc.yellow('  Dry run only; re-run with --write to generate files to disk.'));
    }
  } else {
    // Print preview to stdout
    for (const res of result.resources) {
      const bundle = result.bundles.get(res.name);
      console.log(pc.bold(`  Resource: ${pc.green(res.name)} (${res.label})`));
      console.log(`  Primary Key: ${pc.cyan(res.primaryKey ?? 'id')} | Fields: ${res.fields.length}`);
      console.log(pc.dim('  Fields:'));
      for (const f of res.fields) {
        const badges = [
          f.type,
          f.required ? 'required' : null,
          f.resource ? `-> ${f.resource}` : null,
          f.showInList ? 'list' : null,
          f.showInForm ? 'form' : null,
        ].filter(Boolean).join(', ');
        console.log(`    ${pc.cyan(f.key)}: ${pc.dim(`(${badges})`)}`);
      }
      console.log();

      if (bundle) {
        console.log(pc.bold('  TypeBox Schema:'));
        console.log(pc.dim('  ───────────────────────────────────'));
        console.log(bundle.typeboxCode.trim());
        console.log(pc.dim('  ───────────────────────────────────'));
        console.log();
      }
    }
    console.log(pc.dim('  Tip: Pass --out-dir src/resources --write to save generated files directly.'));
  }
  console.log();
}

/**
 * Interactive wizard prompt when run without arguments in terminal.
 */
async function promptInferWizard(): Promise<InferCommandOptions> {
  const answers = await prompts([
    {
      type: 'select',
      name: 'sourceType',
      message: 'Select API source type:',
      choices: [
        { title: 'REST API Endpoint (URL)', value: 'rest-url', description: 'Fetch sample JSON data from REST endpoint' },
        { title: 'OpenAPI / Swagger Spec (URL or File)', value: 'openapi', description: 'OpenAPI 3.x / Swagger schema definition' },
        { title: 'GraphQL Endpoint (URL or Schema File)', value: 'graphql', description: 'GraphQL introspection or SDL schema' },
        { title: 'Local Sample JSON File', value: 'rest-file', description: 'JSON file with sample data records' },
      ],
      initial: 0,
    },
    {
      type: (prev: string) => (prev === 'rest-file' || prev === 'openapi' ? 'text' : null),
      name: 'pathOrUrl',
      message: 'Enter URL or File path:',
      validate: (v: string) => (v.trim() ? true : 'URL or file path is required'),
    },
    {
      type: (prev: unknown, values: { sourceType: string }) => (values.sourceType === 'rest-url' || values.sourceType === 'graphql' ? 'text' : null),
      name: 'endpointUrl',
      message: 'Enter Endpoint URL:',
      validate: (v: string) => (v.trim().startsWith('http') ? true : 'Must be a valid HTTP(S) URL'),
    },
    {
      type: 'text',
      name: 'outDir',
      message: 'Target output directory:',
      initial: 'src/resources',
    },
    {
      type: 'confirm',
      name: 'write',
      message: 'Write generated files to disk now?',
      initial: true,
    },
  ]);

  const targetPath = answers.pathOrUrl || answers.endpointUrl;
  const isUrl = targetPath?.startsWith('http://') || targetPath?.startsWith('https://');

  return {
    url: isUrl ? targetPath : undefined,
    file: !isUrl ? targetPath : undefined,
    type: answers.sourceType.startsWith('graphql') ? 'graphql' : answers.sourceType.startsWith('openapi') ? 'openapi' : 'rest',
    outDir: answers.outDir,
    write: answers.write,
  };
}

/**
 * Infer CLI entrypoint handler.
 */
export async function inferCommand(args: string[]): Promise<void> {
  let options = parseInferArguments(args);

  if (!options.url && !options.file && process.stdin.isTTY) {
    options = await promptInferWizard();
  }

  if (!options.url && !options.file) {
    printInferHelp();
    return;
  }

  const result = await executeInfer(options);
  printInferResult(result);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
