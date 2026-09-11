import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

const root = resolve(import.meta.dir, '..');

export function serializerSource(source: string): string {
  const parsed = ts.createSourceFile('webauthn.ts', source, ts.ScriptTarget.Latest, true);
  const needed = new Set([
    'SerializableRegistrationCredential', 'SerializableAuthenticationCredential',
    'credentialAttachment', 'serializeCredentialCreationResponse', 'serializeCredentialRequestResponse',
  ]);
  const declarations: string[] = [];
  for (const node of parsed.statements) {
    if (!ts.isTypeAliasDeclaration(node) && !ts.isFunctionDeclaration(node)) continue;
    if (!node.name || !needed.delete(node.name.text)) continue;
    declarations.push(node.getText(parsed));
  }
  if (needed.size) throw new Error(`Missing Supabase serializer declarations: ${[...needed].join(', ')}`);
  return [
    'import { bytesToBase64URL } from "./base64url";',
    'import { serializeExtensionResults } from "./webauthn.serialization";',
    'import type { RegistrationCredential, AuthenticationCredential, RegistrationResponseJSON, AuthenticationResponseJSON, AuthenticatorAttachment } from "./webauthn.dom";',
    ...declarations,
  ].join('\n');
}

export function checkSupabaseSerializerSource(): void {
  const config = ts.getParsedCommandLineOfConfigFile(
    resolve(root, 'scripts/fixtures/supabase-types/tsconfig.json'), {}, {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: diagnostic => {
        throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
      },
    },
  );
  if (!config || config.errors.length) throw new Error('Could not parse the strict serializer configuration');
  const source = readFileSync(resolve(root, 'node_modules/@supabase/auth-js/src/lib/webauthn.ts'), 'utf8');
  // Check the actual edited functions against the SDK's shipped dependencies,
  // without treating unrelated, un-migrated SDK source as checked.
  const file = resolve(root, 'node_modules/@supabase/auth-js/dist/module/lib/webauthn.checked.ts');
  const extracted = serializerSource(source);
  const options = { ...config.options, noEmit: true };
  const host = ts.createCompilerHost(options);
  const getSourceFile = host.getSourceFile;
  host.getSourceFile = (name, version, onError, fresh) => name === file
    ? ts.createSourceFile(file, extracted, version, true)
    : getSourceFile(name, version, onError, fresh);
  const program = ts.createProgram([file], options, host);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  if (diagnostics.length) {
    throw new Error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: name => name,
      getCurrentDirectory: () => root,
      getNewLine: () => '\n',
    }));
  }
  console.info('Supabase edited serializer source: all strict flags and declaration checks passed.');
}

if (import.meta.main) checkSupabaseSerializerSource();
