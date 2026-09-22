/**
 * Non-interactive argument parsing for `svadmin init`.
 *
 * Supports the golden-path presets advertised in the platform model:
 * `svadmin init my-app --preset supabase|rest|graphql`. Explicit
 * `--data-provider` / `--auth-provider` override the preset.
 */
import {
  AUTH_PROVIDER_CHOICES,
  DATA_PROVIDER_CHOICES,
  type AuthProviderChoice,
  type DataProviderChoice,
} from './project-manifest';

export const PRESET_NAMES = ['supabase', 'rest', 'graphql'] as const;
export type PresetName = (typeof PRESET_NAMES)[number];

export interface PresetSelection {
  dataProvider: DataProviderChoice;
  authProvider: AuthProviderChoice;
}

/** Curated golden paths; see docs/architecture/admin-platform.md. */
export const INIT_PRESETS: Record<PresetName, PresetSelection> = {
  supabase: { dataProvider: 'supabase', authProvider: 'supabase' },
  rest: { dataProvider: 'simple-rest', authProvider: 'jwt' },
  graphql: { dataProvider: 'graphql', authProvider: 'mock' },
};

export interface InitArguments {
  projectName?: string;
  preset?: PresetName;
  dataProvider?: DataProviderChoice;
  authProvider?: AuthProviderChoice;
  installDependencies?: boolean;
}

function isPresetName(value: string): value is PresetName {
  return (PRESET_NAMES as readonly string[]).includes(value);
}

function isDataProviderChoice(value: string): value is DataProviderChoice {
  return (DATA_PROVIDER_CHOICES as readonly string[]).includes(value);
}

function isAuthProviderChoice(value: string): value is AuthProviderChoice {
  return (AUTH_PROVIDER_CHOICES as readonly string[]).includes(value);
}

function takeValue(args: string[], index: number, option: string): string {
  const value = args[index + 1];
  if (value === undefined || value.startsWith('-')) {
    throw new Error(`${option} requires a value`);
  }
  return value;
}

export function parseInitArguments(args: string[]): InitArguments {
  let projectName: string | undefined;
  let preset: PresetName | undefined;
  let dataProvider: DataProviderChoice | undefined;
  let authProvider: AuthProviderChoice | undefined;
  let installDependencies: boolean | undefined;

  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (argument === undefined) continue;
    if (argument === '--preset') {
      const value = takeValue(args, index, '--preset');
      if (!isPresetName(value)) {
        throw new Error(`Unknown preset "${value}"; expected one of: ${PRESET_NAMES.join(', ')}`);
      }
      preset = value;
      index++;
    } else if (argument === '--data-provider') {
      const value = takeValue(args, index, '--data-provider');
      if (!isDataProviderChoice(value)) {
        throw new Error(`Unknown data provider "${value}"; expected one of: ${DATA_PROVIDER_CHOICES.join(', ')}`);
      }
      dataProvider = value;
      index++;
    } else if (argument === '--auth-provider') {
      const value = takeValue(args, index, '--auth-provider');
      if (!isAuthProviderChoice(value)) {
        throw new Error(`Unknown auth provider "${value}"; expected one of: ${AUTH_PROVIDER_CHOICES.join(', ')}`);
      }
      authProvider = value;
      index++;
    } else if (argument === '--install') {
      installDependencies = true;
    } else if (argument === '--no-install') {
      installDependencies = false;
    } else if (argument.startsWith('-')) {
      throw new Error(`Unknown option: ${argument}`);
    } else if (projectName === undefined) {
      projectName = argument;
    } else {
      throw new Error(`Unexpected argument: ${argument}`);
    }
  }

  const resolved: InitArguments = {};
  if (projectName !== undefined) resolved.projectName = projectName;
  if (preset !== undefined) resolved.preset = preset;
  if (dataProvider !== undefined) resolved.dataProvider = dataProvider;
  if (authProvider !== undefined) resolved.authProvider = authProvider;
  if (installDependencies !== undefined) resolved.installDependencies = installDependencies;
  return resolved;
}

export interface ResolvedInitSelections {
  dataProvider: DataProviderChoice;
  authProvider: AuthProviderChoice;
}

/**
 * Applies the preset unless an explicit provider choice overrides it. Returns
 * `undefined` when the caller still needs to prompt.
 */
export function resolvePresetSelections(
  args: InitArguments,
): ResolvedInitSelections | undefined {
  const preset = args.preset === undefined ? undefined : INIT_PRESETS[args.preset];
  const dataProvider = args.dataProvider ?? preset?.dataProvider;
  const authProvider = args.authProvider ?? preset?.authProvider;
  if (dataProvider === undefined || authProvider === undefined) return undefined;
  return { dataProvider, authProvider };
}