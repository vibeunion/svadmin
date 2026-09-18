import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { expect, test } from 'bun:test';

function propertyName(name: ts.PropertyName): string {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
  throw new Error('Locale keys must be static property names');
}

// 从 AST 检查源词典，避免 JavaScript 对象求值覆盖重复键后让测试假通过。
test('base locale dictionaries contain unique keys and retain processing labels', () => {
  const text = readFileSync(new URL('./i18n.svelte.ts', import.meta.url), 'utf8');
  const source = ts.createSourceFile('i18n.svelte.ts', text, ts.ScriptTarget.Latest, true);
  const declarations = source.statements.flatMap(statement =>
    ts.isVariableStatement(statement) ? statement.declarationList.declarations : []);
  const declaration = declarations.find(candidate =>
    ts.isIdentifier(candidate.name) && candidate.name.text === 'baseLocales');
  const initializer = declaration?.initializer;
  if (!initializer || !ts.isObjectLiteralExpression(initializer)) throw new Error('Missing base locale dictionaries');

  const locales = new Set<string>();
  const processing = new Map<string, string>();
  for (const locale of initializer.properties) {
    if (!ts.isPropertyAssignment(locale) || !ts.isObjectLiteralExpression(locale.initializer)) {
      throw new Error('Locale dictionaries must use explicit object literals');
    }
    const localeName = propertyName(locale.name);
    if (locales.has(localeName)) throw new Error(`Duplicate locale: ${localeName}`);
    locales.add(localeName);
    const keys = new Set<string>();
    for (const entry of locale.initializer.properties) {
      if (!ts.isPropertyAssignment(entry)) throw new Error(`Invalid locale entry in ${localeName}`);
      const key = propertyName(entry.name);
      if (keys.has(key)) throw new Error(`Duplicate translation: ${localeName}.${key}`);
      keys.add(key);
      if (key === 'common.processing' && ts.isStringLiteral(entry.initializer)) {
        processing.set(localeName, entry.initializer.text);
      }
    }
  }
  expect(locales.size).toBeGreaterThanOrEqual(2);
  expect(processing.get('zh-CN')).toBe('处理中...');
  expect([...processing.values()]).toContain('Processing...');
});
