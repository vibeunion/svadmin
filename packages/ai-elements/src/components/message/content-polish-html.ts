import type { Extension } from 'streamdown-svelte';

type LiteralToken = {
  type: string;
  raw: string;
  text?: string;
  lang?: string;
  tokens?: LiteralToken[];
};

export function createResponseHtmlPreparer() {
  const noExtensions: Extension[] = [];
  let cached: { source: Extension[]; lessThan: string; extensions: Extension[] } | undefined;

  return function prepareResponseHtml(markdown: string, extensions: Extension[] = noExtensions): {
    content: string;
    extensions: Extension[];
  } {
    // Use collision-free character references so literal entities in code are not
    // confused with the tag brackets escaped by this response.
    let zeros = '';
    while (markdown.includes(`&#${zeros}60;`) || markdown.includes(`&#${zeros}62;`)) zeros += '0';
    const lessThan = `&#${zeros}60;`;
    const greaterThan = `&#${zeros}62;`;
    const content = markdown.replace(
      /<\/?[A-Za-z][A-Za-z0-9:-]*(?:\s[^<>]*?)?\/?\s*>|<[A-Za-z/][^>]*$/g,
      tag => tag.replaceAll('<', lessThan).replaceAll('>', greaterThan),
    );
    if (content === markdown) return { content, extensions };
    // Streamdown scopes its parse cache by extension-array identity.
    if (cached?.source === extensions && cached.lessThan === lessThan) {
      return { content, extensions: cached.extensions };
    }

    const restore = (value: string): string =>
      value.replaceAll(lessThan, '<').replaceAll(greaterThan, '>');

    function restoreCode<T extends LiteralToken>(token: T): T {
      const result = { ...token };
      if ((token.type === 'code' || token.type === 'codespan') &&
          (token.raw.includes(lessThan) || token.raw.includes(greaterThan))) {
        if (token.text !== undefined) result.text = restore(token.text);
        if (token.lang !== undefined) result.lang = restore(token.lang);
      }
      if (token.tokens) result.tokens = token.tokens.map(restoreCode);
      return result;
    }

    const blockCode: Extension = {
      name: 'svadmin-response-literal-block-code',
      level: 'block',
      tokenizer(source, tokens) {
        const tokenizer = this.lexer.options.tokenizer;
        const fenced = tokenizer?.fences(source);
        if (fenced) return restoreCode(fenced);
        // Indented continuation belongs to the preceding paragraph, not code.
        const previous = tokens.at(-1);
        if (previous?.type === 'paragraph' || previous?.type === 'text') return undefined;
        const indented = tokenizer?.code(source);
        return indented ? restoreCode(indented) : undefined;
      },
    };
    const inlineCode: Extension = {
      name: 'svadmin-response-literal-inline-code',
      level: 'inline',
      tokenizer(source) {
        const token = this.lexer.options.tokenizer?.codespan(source);
        return token ? restoreCode(token) : undefined;
      },
    };

    cached = {
      source: extensions,
      lessThan,
      extensions: [
        // Preserve caller precedence and restore code produced by custom parsers.
        ...extensions.map(extension => ({
          ...extension,
          tokenizer: function (this: ThisParameterType<Extension['tokenizer']>, ...args: Parameters<Extension['tokenizer']>) {
            const token = extension.tokenizer.apply(this, args);
            return token ? restoreCode(token) : undefined;
          },
        })),
        blockCode,
        inlineCode,
      ],
    };
    return { content, extensions: cached.extensions };
  };
}
