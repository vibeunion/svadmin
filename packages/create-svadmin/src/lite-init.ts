import fs from 'node:fs';
import path from 'node:path';

export interface LiteInitArguments {
  projectDirectory: string;
  write: boolean;
}

export interface LiteInitPlanEntry {
  filePath: string;
  relativePath: string;
  content: string;
  exists: boolean;
}

export interface LiteInitPlan {
  projectDirectory: string;
  entries: LiteInitPlanEntry[];
}

export interface LiteInitResult {
  plan: LiteInitPlan;
  written: string[];
  preserved: string[];
}

const GENERATED_FILES: Record<string, string> = {
  'src/lib/svadmin-lite.ts': `import { dataProvider, resources } from '$lib/admin';
import type { ResourceDefinition } from '@svadmin/core';

export { dataProvider, resources };

export function getResource(name: string): ResourceDefinition | undefined {
  return resources.find((resource) => resource.name === name);
}
`,
  'src/routes/lite/+layout.ts': `export const ssr = true;
export const csr = false;
`,
  'src/routes/lite/+layout.server.ts': `import { resources } from '$lib/svadmin-lite';
import type { LayoutServerLoad } from './$types';

export const load = (({ url }) => {
  const segments = url.pathname.split('/').filter(Boolean);
  const currentResource = segments[1] ?? '';

  return { resources, currentResource };
}) satisfies LayoutServerLoad;
`,
  'src/routes/lite/+layout.svelte': `<script lang="ts">
  import type { Snippet } from 'svelte';
  import { LiteLayout } from '@svadmin/lite';
  import '@svadmin/lite/lite.css';
  import type { LayoutData } from './$types';

  let { data, children }: { data: LayoutData; children: Snippet } = $props();
</script>

<LiteLayout
  resources={data.resources}
  currentResource={data.currentResource}
  brandName="Lite Admin"
  basePath="/lite"
>
  {@render children()}
</LiteLayout>
`,
  'src/routes/lite/+page.server.ts': `import { error, redirect } from '@sveltejs/kit';
import { resources } from '$lib/svadmin-lite';
import type { PageServerLoad } from './$types';

export const load = (() => {
  const firstResource = resources[0];
  if (!firstResource) throw error(404, 'No Lite resources configured');
  throw redirect(302, \`/lite/\${firstResource.name}\`);
}) satisfies PageServerLoad;
`,
  'src/routes/lite/[resource]/+page.server.ts': `import { error } from '@sveltejs/kit';
import { createCrudActions, createListLoader } from '@svadmin/lite';
import { dataProvider, getResource } from '$lib/svadmin-lite';
import type { Actions, PageServerLoad } from './$types';

export const load = ((event) => {
  const resource = getResource(event.params.resource);
  if (!resource) throw error(404, \`Resource "\${event.params.resource}" not found\`);
  return createListLoader(dataProvider, resource)(event);
}) satisfies PageServerLoad;

export const actions = {
  delete: (event) => {
    const resource = getResource(event.params.resource);
    if (!resource) throw error(404, \`Resource "\${event.params.resource}" not found\`);
    return createCrudActions(dataProvider, resource).delete(event);
  },
  batchDelete: (event) => {
    const resource = getResource(event.params.resource);
    if (!resource) throw error(404, \`Resource "\${event.params.resource}" not found\`);
    return createCrudActions(dataProvider, resource).batchDelete(event);
  },
} satisfies Actions;
`,
  'src/routes/lite/[resource]/+page.svelte': `<script lang="ts">
  import { LiteListPage } from '@svadmin/lite';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
</script>

<LiteListPage {...data} basePath="/lite" />
`,
  'src/routes/lite/[resource]/create/+page.server.ts': `import { error, redirect } from '@sveltejs/kit';
import { createCrudActions } from '@svadmin/lite';
import { dataProvider, getResource } from '$lib/svadmin-lite';
import type { Actions, PageServerLoad } from './$types';

export const load = (({ params }) => {
  const resource = getResource(params.resource);
  if (!resource) throw error(404, \`Resource "\${params.resource}" not found\`);
  return { resource };
}) satisfies PageServerLoad;

export const actions = {
  create: async (event) => {
    const resource = getResource(event.params.resource);
    if (!resource) throw error(404, \`Resource "\${event.params.resource}" not found\`);
    const result = await createCrudActions(dataProvider, resource).create(event);
    if (result && 'success' in result && result.success) {
      throw redirect(303, \`/lite/\${resource.name}\`);
    }
    return result;
  },
} satisfies Actions;
`,
  'src/routes/lite/[resource]/create/+page.svelte': `<script lang="ts">
  import { LiteCreatePage } from '@svadmin/lite';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();
</script>

<LiteCreatePage
  resource={data.resource}
  errors={form?.errors}
  values={form?.values}
  basePath="/lite"
/>
`,
  'src/routes/lite/[resource]/show/[id]/+page.server.ts': `import { error } from '@sveltejs/kit';
import { createDetailLoader } from '@svadmin/lite';
import { dataProvider, getResource } from '$lib/svadmin-lite';
import type { PageServerLoad } from './$types';

export const load = ((event) => {
  const resource = getResource(event.params.resource);
  if (!resource) throw error(404, \`Resource "\${event.params.resource}" not found\`);
  return createDetailLoader(dataProvider, resource)(event);
}) satisfies PageServerLoad;
`,
  'src/routes/lite/[resource]/show/[id]/+page.svelte': `<script lang="ts">
  import { LiteShowPage } from '@svadmin/lite';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
</script>

<LiteShowPage resource={data.resource} record={data.record} basePath="/lite" />
`,
  'src/routes/lite/[resource]/edit/[id]/+page.server.ts': `import { error, redirect } from '@sveltejs/kit';
import { createCrudActions, createDetailLoader } from '@svadmin/lite';
import { dataProvider, getResource } from '$lib/svadmin-lite';
import type { Actions, PageServerLoad } from './$types';

export const load = ((event) => {
  const resource = getResource(event.params.resource);
  if (!resource) throw error(404, \`Resource "\${event.params.resource}" not found\`);
  return createDetailLoader(dataProvider, resource)(event);
}) satisfies PageServerLoad;

export const actions = {
  update: async (event) => {
    const resource = getResource(event.params.resource);
    if (!resource) throw error(404, \`Resource "\${event.params.resource}" not found\`);
    const result = await createCrudActions(dataProvider, resource).update(event);
    if (result && 'success' in result && result.success) {
      throw redirect(303, \`/lite/\${resource.name}/show/\${event.params.id}\`);
    }
    return result;
  },
  delete: (event) => {
    const resource = getResource(event.params.resource);
    if (!resource) throw error(404, \`Resource "\${event.params.resource}" not found\`);
    return createCrudActions(dataProvider, resource).delete(event);
  },
} satisfies Actions;
`,
  'src/routes/lite/[resource]/edit/[id]/+page.svelte': `<script lang="ts">
  import { LiteEditPage } from '@svadmin/lite';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();
</script>

<LiteEditPage
  resource={data.resource}
  record={data.record}
  errors={form?.errors}
  basePath="/lite"
/>
`,
};

export function parseLiteInitArguments(args: string[]): LiteInitArguments {
  let write = false;
  const positional: string[] = [];
  for (const argument of args) {
    if (argument === '--write') write = true;
    else if (argument.startsWith('-')) throw new Error(`Unknown option: ${argument}`);
    else positional.push(argument);
  }
  if (positional.length > 1) {
    throw new Error(`Expected at most one project directory, received: ${positional.join(', ')}`);
  }
  return {
    projectDirectory: path.resolve(process.cwd(), positional[0] ?? '.'),
    write,
  };
}

function assertLiteProject(projectDirectory: string): void {
  if (!fs.existsSync(projectDirectory)) {
    throw new Error(`Project directory does not exist: ${projectDirectory}`);
  }
  if (!fs.existsSync(path.join(projectDirectory, 'package.json'))) {
    throw new Error(`Not a Node project: ${path.join(projectDirectory, 'package.json')} is missing`);
  }
  if (!fs.existsSync(path.join(projectDirectory, 'src', 'routes'))) {
    throw new Error(
      'Lite routes require a SvelteKit project with src/routes. Keep the existing SPA and add a SvelteKit Lite app alongside it.',
    );
  }
  const adminModuleExists = ['ts', 'js', 'svelte'].some((extension) =>
    fs.existsSync(path.join(projectDirectory, 'src', 'lib', `admin.${extension}`)),
  );
  if (!adminModuleExists) {
    throw new Error(
      'Lite routes require src/lib/admin.ts (or .js/.svelte) exporting resources and dataProvider.',
    );
  }
}

export function planLiteInit(projectDirectory: string): LiteInitPlan {
  assertLiteProject(projectDirectory);
  const entries = Object.entries(GENERATED_FILES).map(([relativePath, content]) => {
    const filePath = path.join(projectDirectory, relativePath);
    return { filePath, relativePath, content, exists: fs.existsSync(filePath) };
  });
  return { projectDirectory, entries };
}

export function writeLiteInit(plan: LiteInitPlan): LiteInitResult {
  const written: string[] = [];
  const preserved: string[] = [];
  for (const entry of plan.entries) {
    if (entry.exists || fs.existsSync(entry.filePath)) {
      preserved.push(entry.relativePath);
      continue;
    }
    fs.mkdirSync(path.dirname(entry.filePath), { recursive: true });
    fs.writeFileSync(entry.filePath, entry.content);
    written.push(entry.relativePath);
  }
  return { plan, written, preserved };
}

export function liteInitCommand(args: string[]): void {
  const options = parseLiteInitArguments(args);
  const plan = planLiteInit(options.projectDirectory);
  console.log(`\nsvadmin lite init — ${options.projectDirectory}`);
  for (const entry of plan.entries) {
    console.log(`  ${entry.exists ? 'preserve' : 'add'} ${entry.relativePath}`);
  }
  if (!options.write) {
    console.log('\nDry run only; re-run with --write to add missing Lite routes.');
    return;
  }
  const result = writeLiteInit(plan);
  console.log(`\nWritten ${result.written.length} file(s); preserved ${result.preserved.length} existing file(s).`);
}
