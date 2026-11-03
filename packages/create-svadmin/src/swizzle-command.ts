/**
 * `svadmin swizzle` — eject official UI components into user space for deep customization.
 *
 * Implements the Vibe Coding 4-Tier Escape Hatch Ladder (Level 4: source customization).
 * Dry-run by default, applies with `--write`.
 */
import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';

export interface SwizzleCommandOptions {
  component?: string;
  list?: boolean;
  projectDirectory?: string;
  targetDir?: string;
  write?: boolean;
}

export interface SwizzleCatalogEntry {
  name: string;
  description: string;
  sourceFile: string;
}

export const SWIZZLE_CATALOG: SwizzleCatalogEntry[] = [
  {
    name: 'AutoTable',
    description: 'Declarative data table with sorting, filtering, selection, and pagination',
    sourceFile: 'AutoTable.svelte',
  },
  {
    name: 'AutoForm',
    description: 'Schema-driven form with validation, dirty tracking, and responsive layout',
    sourceFile: 'AutoForm.svelte',
  },
  {
    name: 'ModalForm',
    description: 'Dialog-based modal form with submit and cancel lifecycle',
    sourceFile: 'ModalForm.svelte',
  },
  {
    name: 'DrawerForm',
    description: 'Slide-over drawer form for detail editing without page leaves',
    sourceFile: 'DrawerForm.svelte',
  },
  {
    name: 'Sidebar',
    description: 'Application navigation sidebar with collapsible menu tree and badge indicators',
    sourceFile: 'Sidebar.svelte',
  },
  {
    name: 'ThemeSwitcher',
    description: 'Theme mode toggle (light, dark, system) and color palette picker',
    sourceFile: 'ThemeSwitcher.svelte',
  },
  {
    name: 'RecordDetailDrawer',
    description: 'High-density record preview and detail drawer',
    sourceFile: 'RecordDetailDrawer.svelte',
  },
];

export interface SwizzlePlan {
  component: string;
  targetFilePath: string;
  relativePath: string;
  content: string;
  exists: boolean;
}

export function planSwizzle(options: SwizzleCommandOptions): SwizzlePlan {
  if (!options.component) {
    throw new Error('Component name is required. Use --list to see available components.');
  }

  const catalogEntry = SWIZZLE_CATALOG.find(
    (c) => c.name.toLowerCase() === options.component!.toLowerCase(),
  );

  if (!catalogEntry) {
    const valid = SWIZZLE_CATALOG.map((c) => c.name).join(', ');
    throw new Error(`Unknown component "${options.component}". Available components: ${valid}`);
  }

  const projectDir = path.resolve(process.cwd(), options.projectDirectory ?? '.');
  const targetSubDir = options.targetDir ?? 'src/components/svadmin';
  const targetFileName = `${catalogEntry.name}.svelte`;
  const targetFilePath = path.join(projectDir, targetSubDir, targetFileName);
  const relativePath = path.relative(projectDir, targetFilePath);

  // Eject template: wrapping or direct source stub that imports from @svadmin/ui while exposing full markup
  const content = `<script lang="ts">
  // Swizzled from @svadmin/ui: ${catalogEntry.name}
  // Customize this component directly to match your custom design system.
  import { ${catalogEntry.name} as Base${catalogEntry.name} } from '@svadmin/ui';
  let { ...props } = $props();
</script>

<!-- Custom markup override hook -->
<div class="svadmin-swizzled-${catalogEntry.name.toLowerCase()}">
  <Base${catalogEntry.name} {...props}>
    {#snippet children?.(slotProps)}
      {@render props.children?.(slotProps)}
    {/snippet}
  </Base${catalogEntry.name}>
</div>
`;

  return {
    component: catalogEntry.name,
    targetFilePath,
    relativePath,
    content,
    exists: fs.existsSync(targetFilePath),
  };
}

export async function swizzleCommand(args: string[]): Promise<void> {
  let list = false;
  let write = false;
  let component: string | undefined;
  let targetDir: string | undefined;
  let projectDirectory: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--list' || arg === '-l') {
      list = true;
    } else if (arg === '--write' || arg === '-w') {
      write = true;
    } else if (arg === '--target' || arg === '-t') {
      targetDir = args[++i];
    } else if (!arg.startsWith('-') && !component) {
      component = arg;
    } else if (!arg.startsWith('-') && component && !projectDirectory) {
      projectDirectory = arg;
    }
  }

  if (list) {
    console.log(pc.cyan('\nAvailable ejectable components for `svadmin swizzle`:\n'));
    for (const entry of SWIZZLE_CATALOG) {
      console.log(`  ${pc.bold(entry.name.padEnd(20))} ${pc.dim(entry.description)}`);
    }
    console.log('');
    return;
  }

  if (!component) {
    console.log(pc.yellow('Usage: svadmin swizzle <component> [--write] [--target <dir>]'));
    console.log(pc.dim('Run `svadmin swizzle --list` to view all available components.\n'));
    return;
  }

  const plan = planSwizzle({
    component,
    projectDirectory,
    targetDir,
    write,
  });

  console.log(pc.cyan(`\nSwizzle Plan for <${plan.component}>:`));
  console.log(`  Target: ${pc.bold(plan.relativePath)}`);
  console.log(`  Status: ${plan.exists ? pc.yellow('File exists (will overwrite with --write)') : pc.green('New file')}`);

  if (write) {
    fs.mkdirSync(path.dirname(plan.targetFilePath), { recursive: true });
    fs.writeFileSync(plan.targetFilePath, plan.content, 'utf8');
    console.log(pc.green(`\n✓ Successfully swizzled <${plan.component}> to ${plan.relativePath}!\n`));
  } else {
    console.log(pc.dim('\nDry-run complete. Re-run with `--write` to apply.\n'));
  }
}
