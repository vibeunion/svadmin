/**
 * CodeMirror language presets for `@svadmin/ui/code-editor`.
 *
 * Each language is an optional peer dependency. Import this module only if you
 * need the presets, and install the languages you actually use:
 *
 * ```bash
 * bun add @codemirror/lang-json
 * ```
 */
export { json } from '@codemirror/lang-json';
export {
  javascript,
  javascriptLanguage,
  typescriptLanguage,
  jsxLanguage,
  tsxLanguage,
} from '@codemirror/lang-javascript';
export { sql } from '@codemirror/lang-sql';
export { markdown } from '@codemirror/lang-markdown';