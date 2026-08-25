#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import prompts from 'prompts';
import pc from 'picocolors';
import {
  createProjectPackageJson,
  loadScaffoldManifest,
  type AuthProviderChoice,
  type DataProviderChoice,
  type ScaffoldManifest,
} from './project-manifest';
import {
  doctorProjectPackageJson,
  planProjectPackageFileUpgrade,
  readMaintainedPackageJson,
  writeProjectPackageJsonUpgrade,
  type DoctorIssue,
  type DoctorReport,
  type UpgradeChange,
  type UpgradeResult,
} from './project-maintenance';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Types ─────────────────────────────────────────────────────
interface InitResponse {
  projectName: string;
  dataProvider: DataProviderChoice;
  authProvider: AuthProviderChoice;
  installDeps: boolean;
}

interface UpgradeCommandArguments {
  projectDirectory: string;
  write: boolean;
}

function loadShippedScaffoldManifest(): ScaffoldManifest {
  return loadScaffoldManifest(path.join(__dirname, '..', 'scaffold-manifest.json'));
}

function projectDirectoryFromArguments(positional: string[]): string {
  if (positional.length > 1) {
    throw new Error(`Expected at most one project directory, received: ${positional.join(', ')}`);
  }
  return path.resolve(process.cwd(), positional[0] ?? '.');
}

function doctorProjectDirectory(args: string[]): string {
  const unknownOption = args.find((argument) => argument.startsWith('-'));
  if (unknownOption !== undefined) throw new Error(`Unknown option: ${unknownOption}`);
  return projectDirectoryFromArguments(args);
}

function parseUpgradeArguments(args: string[]): UpgradeCommandArguments {
  let write = false;
  const positional: string[] = [];
  for (const argument of args) {
    if (argument === '--write') {
      write = true;
    } else if (argument.startsWith('-')) {
      throw new Error(`Unknown option: ${argument}`);
    } else {
      positional.push(argument);
    }
  }
  return { projectDirectory: projectDirectoryFromArguments(positional), write };
}

function doctorIssueMessage(issue: DoctorIssue): string {
  const actualDescription = issue.actualVersion === undefined
    ? 'missing'
    : `${issue.actualVersion}${issue.actualSection ? ` in ${issue.actualSection}` : ''}`;
  return `${issue.packageName}: ${issue.kind}; expected ${issue.expectedVersion} in ` +
    `${issue.expectedSection}, found ${actualDescription}`;
}

function upgradeChangeMessage(change: UpgradeChange): string {
  if (change.action === 'add') {
    return `add ${change.packageName}@${change.to} to ${change.section}`;
  }
  if (change.action === 'move') {
    return `move ${change.packageName} to ${change.section} and set ${change.to}`;
  }
  return `update ${change.packageName} from ${change.from ?? 'missing'} to ${change.to}`;
}

function printDoctorIssue(issue: DoctorIssue): void {
  const marker = issue.kind === 'drift' || issue.kind === 'section'
    ? pc.yellow('  ⚠')
    : pc.red('  ✗');
  console.log(`${marker} ${doctorIssueMessage(issue)}`);
  console.log(pc.dim(`    → ${issue.action}`));
}

function printDoctorReport(report: DoctorReport, projectDirectory: string): void {
  console.log();
  console.log(pc.bold(`svadmin doctor — ${projectDirectory}`));
  if (report.status === 'clean') {
    console.log(pc.green('  ✔ Dependencies match the shipped svadmin scaffold.'));
  } else {
    for (const issue of report.issues) printDoctorIssue(issue);
    console.log();
    console.log(pc.yellow(`  ${report.issues.length} actionable issue(s) found.`));
  }
  console.log();
}

function doctor(args: string[]): void {
  const projectDirectory = doctorProjectDirectory(args);
  const project = readMaintainedPackageJson(path.join(projectDirectory, 'package.json'));
  const report = doctorProjectPackageJson(project, loadShippedScaffoldManifest());
  printDoctorReport(report, projectDirectory);
  process.exitCode = report.exitCode;
}

function printUpgradeChanges(upgradeExecution: UpgradeResult): void {
  for (const change of upgradeExecution.plan.changes) {
    console.log(`  ${pc.cyan('•')} ${upgradeChangeMessage(change)}`);
  }
  console.log();
}

function printUpgradeOutcome(upgradeExecution: UpgradeResult, packagePath: string): void {
  if (upgradeExecution.wrote) {
    console.log(pc.green('  ✔ package.json updated.'));
    console.log(`  Backup: ${pc.cyan(upgradeExecution.backupPath)}`);
    console.log(`  Restore by copying the backup over: ${pc.cyan(packagePath)}`);
  } else {
    console.log(pc.yellow('  Dry run only; package.json was not changed.'));
    console.log('  Re-run this command with --write to apply the plan.');
  }
  console.log();
}

function printUpgradeExecution(
  upgradeExecution: UpgradeResult,
  projectDirectory: string,
  packagePath: string,
): void {
  console.log();
  console.log(pc.bold(`svadmin upgrade — ${projectDirectory}`));
  if (upgradeExecution.plan.changes.length === 0) {
    console.log(pc.green('  ✔ package.json already matches the shipped scaffold.'));
    console.log();
    return;
  }
  printUpgradeChanges(upgradeExecution);
  printUpgradeOutcome(upgradeExecution, packagePath);
}

function upgrade(args: string[]): void {
  const commandArguments = parseUpgradeArguments(args);
  const packagePath = path.join(commandArguments.projectDirectory, 'package.json');
  const scaffoldManifest = loadShippedScaffoldManifest();
  const upgradeExecution = commandArguments.write
    ? writeProjectPackageJsonUpgrade(packagePath, scaffoldManifest, new Date())
    : planProjectPackageFileUpgrade(packagePath, scaffoldManifest);
  printUpgradeExecution(upgradeExecution, commandArguments.projectDirectory, packagePath);
}

const GUIDANCE_FILES = ['DESIGN.md', 'AGENTS.md'] as const;
type GuidanceFile = (typeof GUIDANCE_FILES)[number];

function missingGuidanceFiles(projectDirectory: string): GuidanceFile[] {
  return GUIDANCE_FILES.filter(
    (fileName) => !fs.existsSync(path.join(projectDirectory, fileName)),
  );
}

function printGuidancePlan(projectDirectory: string, missingFiles: readonly string[]): void {
  console.log();
  console.log(pc.bold(`svadmin guidance — ${projectDirectory}`));
  for (const fileName of missingFiles) {
    console.log(`  ${pc.cyan('•')} add ${fileName}`);
  }
  console.log();
}

function installMissingGuidanceFiles(
  guidanceDirectory: string,
  projectDirectory: string,
  missingFiles: readonly string[],
): void {
  for (const fileName of missingFiles) {
    fs.copyFileSync(
      path.join(guidanceDirectory, fileName),
      path.join(projectDirectory, fileName),
    );
  }
}

function guidance(args: string[]): void {
  const { projectDirectory, write } = parseUpgradeArguments(args);
  const guidanceDirectory = path.join(__dirname, '..', 'guidance');
  if (!fs.existsSync(projectDirectory)) throw new Error(`Project directory does not exist: ${projectDirectory}`);
  if (!fs.existsSync(guidanceDirectory)) throw new Error('Shipped svadmin guidance files are missing');

  const missingFiles = missingGuidanceFiles(projectDirectory);
  if (missingFiles.length === 0) {
    console.log(pc.green('\n  ✔ DESIGN.md and AGENTS.md already exist; nothing was changed.\n'));
    return;
  }
  printGuidancePlan(projectDirectory, missingFiles);
  if (!write) {
    console.log(pc.yellow('  Dry run only; re-run with --write to add missing guidance files.\n'));
    return;
  }
  installMissingGuidanceFiles(guidanceDirectory, projectDirectory, missingFiles);
  console.log(pc.green(`  ✔ Added ${missingFiles.length} guidance file(s); existing files were preserved.`));
  console.log();
}

// ─── Scaffold (init) ───────────────────────────────────────────
async function init(): Promise<void> {
  console.log();
  console.log(pc.cyan('  ╔═══════════════════════════════════╗'));
  console.log(pc.cyan('  ║  ') + pc.bold('create-svadmin') + pc.cyan('                    ║'));
  console.log(pc.cyan('  ║  ') + pc.dim('Headless Admin for Svelte 5') + pc.cyan('    ║'));
  console.log(pc.cyan('  ╚═══════════════════════════════════╝'));
  console.log();

  const response = await prompts([
    {
      type: 'text',
      name: 'projectName',
      message: 'Project name:',
      initial: 'svadmin-app',
      validate: (value: string) => {
        if (!value.trim()) return 'Project name is required';
        if (fs.existsSync(value.trim()) && fs.readdirSync(value.trim()).length > 0) {
          return 'Directory already exists and is not empty';
        }
        return true;
      }
    },
    {
      type: 'select',
      name: 'dataProvider',
      message: 'Data Provider:',
      choices: [
        { title: 'Simple REST', value: 'simple-rest', description: 'Standard JSON APIs / JSON Server' },
        { title: 'Supabase', value: 'supabase', description: 'PostgreSQL Backend-as-a-Service' },
        { title: 'GraphQL', value: 'graphql', description: 'Generic GraphQL endpoints' },
        { title: 'Custom', value: 'none', description: 'Implement your own DataProvider' }
      ],
      initial: 0
    },
    {
      type: 'select',
      name: 'authProvider',
      message: 'Auth Provider:',
      choices: [
        { title: 'Mock (Demo)', value: 'mock', description: 'Built-in mock for development' },
        { title: 'Simple REST JWT', value: 'jwt', description: 'JWT-based auth via REST API' },
        { title: 'Supabase Auth', value: 'supabase', description: 'Supabase authentication' },
        { title: 'None', value: 'none', description: 'No authentication' }
      ],
      initial: 0
    },
    {
      type: 'confirm',
      name: 'installDeps',
      message: 'Install dependencies now?',
      initial: true
    }
  ]) as InitResponse;

  if (!response.projectName) {
    console.log(pc.red('\nOperation cancelled.\n'));
    return;
  }

  const projectDir = path.resolve(process.cwd(), response.projectName.trim());

  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true });
  }

  console.log(`\n${pc.bold('Scaffolding')} project in ${pc.green(projectDir)}...\n`);

  // 1. Copy template files
  const templateDir = path.join(__dirname, '..', 'template');
  const guidanceDir = path.join(__dirname, '..', 'guidance');
  const scaffoldManifest = loadShippedScaffoldManifest();

  function copyDir(src: string, dest: string): void {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name === '_gitignore' ? '.gitignore' : entry.name);
      if (entry.isDirectory()) {
        copyDir(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  if (fs.existsSync(templateDir)) {
    copyDir(templateDir, projectDir);
    console.log(pc.green('  ✔') + ' Template files copied');
  }

  if (fs.existsSync(guidanceDir)) {
    copyDir(guidanceDir, projectDir);
    console.log(pc.green('  ✔') + ' AI and design guidance copied');
  }

  // 2. Generate package.json
  const packageJson = createProjectPackageJson(scaffoldManifest, {
    projectName: response.projectName,
    dataProvider: response.dataProvider,
    authProvider: response.authProvider,
  });

  fs.writeFileSync(path.join(projectDir, 'package.json'), `${JSON.stringify(packageJson, null, 2)}\n`);
  console.log(pc.green('  ✔') + ' package.json generated');

  // 3. Generate .gitignore
  fs.writeFileSync(path.join(projectDir, '.gitignore'), `node_modules
dist
.svelte-kit
.env
.env.local
*.local
`);
  console.log(pc.green('  ✔') + ' .gitignore generated');

  // 4. Generate README
  const dpLabel = response.dataProvider === 'simple-rest' ? 'Simple REST'
    : response.dataProvider === 'supabase' ? 'Supabase'
    : response.dataProvider === 'graphql' ? 'GraphQL' : 'Custom';
  const authLabel = response.authProvider === 'mock' ? 'Mock (demo)'
    : response.authProvider === 'jwt' ? 'JWT'
    : response.authProvider === 'supabase' ? 'Supabase Auth' : 'None';

  fs.writeFileSync(path.join(projectDir, 'README.md'), `# ${response.projectName}

Built with [svadmin](https://github.com/vibeunion/svadmin) — Headless Admin Framework for Svelte 5.

## Getting Started

\`\`\`bash
bun install
bun run dev
\`\`\`

## Stack

- **UI**: Svelte 5 + Shadcn Svelte + TailwindCSS
- **Data**: ${dpLabel} DataProvider
- **Auth**: ${authLabel}
- **State**: TanStack Query v6
`);
  console.log(pc.green('  ✔') + ' README.md generated');

  // 5. Install dependencies
  if (response.installDeps) {
    console.log(`\n${pc.bold('Installing dependencies...')}\n`);
    const bunInstall = spawnSync('bun', ['install'], { cwd: projectDir, stdio: 'inherit' });
    if (bunInstall.status !== 0) {
      const npmInstall = spawnSync('npm', ['install'], { cwd: projectDir, stdio: 'inherit' });
      if (npmInstall.status !== 0) {
        console.log(pc.yellow('\n  ⚠ Auto-install failed. Run `bun install` or `npm install` manually.'));
      }
    }
  }

  // 6. Done!
  console.log();
  console.log(pc.green(pc.bold('  ✔ Project ready!')));
  console.log();
  console.log('  Next steps:');
  console.log(`    ${pc.cyan(`cd ${response.projectName}`)}`);
  if (!response.installDeps) {
    console.log(`    ${pc.cyan('bun install')}`);
  }
  console.log(`    ${pc.cyan('bun run dev')}`);
  console.log();
  console.log(`  Docs: ${pc.blue('https://github.com/vibeunion/svadmin')}`);
  console.log();
}

// ─── Eject subcommand ──────────────────────────────────────────
const EJECT_COMPONENTS = [
  'Layout', 'Sidebar', 'Header', 'LoginPage',
  'AutoTable', 'AutoForm', 'ShowPage', 'ProfilePage',
  'StatsCard', 'AuditLogDrawer', 'LiveIndicator',
  'CommandPalette', 'AICommandBar', 'ChatDialog',
  'PasswordInput', 'BooleanField', 'FieldRenderer',
  'MarkdownRenderer', 'AnomalyBadge', 'Toast',
  'ConfirmDialog', 'TooltipButton', 'Breadcrumbs',
  'ConfigErrorScreen', 'DevTools',
] as const;

async function eject(args: string[]): Promise<void> {
  console.log();
  console.log(pc.cyan('  svadmin eject') + pc.dim(' — copy internal components for deep customization'));
  console.log();

  // Resolve which components to eject
  const requested = args.filter(a => !a.startsWith('-'));
  const toEject = requested.length > 0
    ? requested.filter(name => {
        if (!(EJECT_COMPONENTS as readonly string[]).includes(name)) {
          console.log(pc.yellow(`  ⚠ Unknown component: ${name} (skipped)`));
          return false;
        }
        return true;
      })
    : [...EJECT_COMPONENTS];

  if (toEject.length === 0) {
    console.log(pc.red('  No valid components to eject.'));
    console.log(`  Available: ${EJECT_COMPONENTS.join(', ')}`);
    return;
  }

  // Find @svadmin/ui source
  let uiSrcDir: string | undefined;
  try {
    const require = createRequire(import.meta.url);
    const uiPkg = path.dirname(require.resolve('@svadmin/ui/package.json'));
    uiSrcDir = path.join(uiPkg, 'src', 'components');
  } catch {
    // Fallback: look in node_modules
    const nm = path.join(process.cwd(), 'node_modules', '@svadmin', 'ui', 'src', 'components');
    if (fs.existsSync(nm)) {
      uiSrcDir = nm;
    } else {
      console.log(pc.red('  ✗ Cannot find @svadmin/ui. Run `bun install` first.'));
      return;
    }
  }

  const destDir = path.join(process.cwd(), 'src', 'components', 'svadmin');
  fs.mkdirSync(destDir, { recursive: true });

  let copied = 0;
  for (const name of toEject) {
    const srcFile = path.join(uiSrcDir, `${name}.svelte`);
    // Also try fields/ subdirectory
    const srcFileAlt = path.join(uiSrcDir, 'fields', `${name}.svelte`);
    const src = fs.existsSync(srcFile) ? srcFile : fs.existsSync(srcFileAlt) ? srcFileAlt : null;

    if (!src) {
      console.log(pc.yellow(`  ⚠ ${name}.svelte not found in @svadmin/ui (skipped)`));
      continue;
    }

    let content = fs.readFileSync(src, 'utf-8');
    // Rewrite relative ./ui/ imports to use @svadmin/ui path (shadcn primitives stay in node_modules)
    content = content.replace(
      /from\s+['"]\.\/ui\//g,
      "from '@svadmin/ui/components/ui/"
    );
    // Rewrite relative ./ sibling imports to local directory
    content = content.replace(
      /from\s+['"]\.\/((?!ui\/)[^'"]+)['"]/g,
      "from './$1'"
    );

    const destFile = path.join(destDir, `${name}.svelte`);
    fs.writeFileSync(destFile, content);
    console.log(pc.green('  ✔') + ` ${name}.svelte → src/components/svadmin/`);
    copied++;
  }

  console.log();
  if (copied > 0) {
    console.log(pc.green(pc.bold(`  ✔ Ejected ${copied} component(s)`)));
    console.log();
    console.log('  Usage: import overrides in your AdminApp and pass via `components` prop:');
    console.log();
    console.log(pc.dim('    import CustomLayout from "./components/svadmin/Layout.svelte";'));
    console.log(pc.dim('    <AdminApp components={{ Layout: CustomLayout }} ... />'));
  } else {
    console.log(pc.yellow('  No components were ejected.'));
  }
  console.log();
}

// ─── CLI dispatch ──────────────────────────────────────────────
const [,, subcommand, ...rest] = process.argv;
const runCommand = (command: () => void | Promise<void>): void => {
  Promise.resolve()
    .then(command)
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(pc.red(`\n  ✗ ${message}\n`));
      process.exitCode = 2;
    });
};

if (subcommand === 'eject') {
  runCommand(() => eject(rest));
} else if (subcommand === 'doctor') {
  runCommand(() => doctor(rest));
} else if (subcommand === 'upgrade') {
  runCommand(() => upgrade(rest));
} else if (subcommand === 'guidance') {
  runCommand(() => guidance(rest));
} else {
  runCommand(init);
}
