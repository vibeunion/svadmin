export const defaultUrlTransform = (value) => value;
const normalizeElementSet = (elements) => {
    if (!elements || elements.length === 0) {
        return undefined;
    }
    return new Set(elements
        .filter((element) => typeof element === 'string' && element.length > 0)
        .map((element) => element.toLowerCase()));
};
export const createMarkdownElement = (tagName, properties = {}, children) => ({
    tagName: tagName.toLowerCase(),
    properties,
    ...(children && children.length > 0 ? { children } : {})
});
export const applyMarkdownUrlTransform = (url, key, node, urlTransform) => {
    const transform = urlTransform ?? defaultUrlTransform;
    return transform(url, key, node);
};
const parseMarkdownFilteringOptions = (options) => ({
    allowElement: options.allowElement,
    allowedElements: normalizeElementSet(options.allowedElements),
    disallowedElements: normalizeElementSet(options.disallowedElements),
    skipHtml: options.skipHtml === true,
    unwrapDisallowed: options.unwrapDisallowed === true
});
const getHtmlTokenTagName = (token) => {
    const match = token.raw.match(/^\s*<([A-Za-z][\w:-]*)(?=[\s/>])/);
    if (!match) {
        return null;
    }
    return match[1].toLowerCase();
};
const getTokenTagName = (token) => {
    switch (token.type) {
        case 'heading':
            return `h${token.depth}`;
        case 'paragraph':
            return 'p';
        case 'blockquote':
            return 'blockquote';
        case 'code':
            return 'pre';
        case 'codespan':
            return 'code';
        case 'list':
            return token.ordered ? 'ol' : 'ul';
        case 'list_item':
            return 'li';
        case 'table':
            return 'table';
        case 'thead':
            return 'thead';
        case 'tbody':
            return 'tbody';
        case 'tfoot':
            return 'tfoot';
        case 'tr':
            return 'tr';
        case 'td':
            return 'td';
        case 'th':
            return 'th';
        case 'image':
            return 'img';
        case 'link':
            return 'a';
        case 'strong':
            return 'strong';
        case 'em':
            return 'em';
        case 'del':
            return 'del';
        case 'hr':
            return 'hr';
        case 'br':
            return 'br';
        case 'sub':
            return 'sub';
        case 'sup':
            return 'sup';
        case 'descriptionList':
            return 'dl';
        case 'descriptionTerm':
            return 'dt';
        case 'descriptionDetail':
            return 'dd';
        case 'html':
            return getHtmlTokenTagName(token);
        default:
            return null;
    }
};
const getTokenProperties = (token) => {
    switch (token.type) {
        case 'heading':
            return { depth: token.depth };
        case 'paragraph':
            return {
                text: token.text
            };
        case 'code':
            return {
                lang: token.lang ?? undefined,
                text: token.text
            };
        case 'list':
            return {
                listType: token.listType ?? undefined,
                loose: token.loose,
                ordered: token.ordered,
                start: token.start ?? undefined
            };
        case 'list_item':
            return {
                checked: token.checked,
                loose: token.loose,
                task: token.task,
                text: token.text,
                value: token.value
            };
        case 'link':
            return {
                href: token.href,
                title: token.title ?? undefined
            };
        case 'image':
            return {
                alt: token.text,
                src: token.href,
                title: token.title ?? undefined
            };
        default:
            return {};
    }
};
const shouldRemoveElement = (element, index, parent, options) => {
    let remove = false;
    if (options.allowedElements) {
        remove = !options.allowedElements.has(element.tagName);
    }
    else if (options.disallowedElements) {
        remove = options.disallowedElements.has(element.tagName);
    }
    if (!remove && options.allowElement) {
        remove = !options.allowElement(element, index, parent);
    }
    return remove;
};
const filterTokens = (tokens, options, parent) => {
    const prepared = [];
    for (let index = 0; index < tokens.length; index += 1) {
        const token = tokens[index];
        if (!token) {
            continue;
        }
        if (options.skipHtml && token.type === 'html') {
            continue;
        }
        const tagName = getTokenTagName(token);
        const elementProperties = getTokenProperties(token);
        const currentElement = tagName ? createMarkdownElement(tagName, elementProperties) : undefined;
        const hasChildTokens = Array.isArray(token.tokens);
        const filteredChildren = hasChildTokens
            ? filterTokens(token.tokens, options, currentElement ?? parent)
            : undefined;
        const nextToken = hasChildTokens
            ? { ...token, tokens: filteredChildren?.tokens ?? [] }
            : token;
        const nextElement = tagName
            ? createMarkdownElement(tagName, getTokenProperties(nextToken), filteredChildren?.elements)
            : undefined;
        prepared.push({
            element: nextElement,
            filteredChildren,
            token: nextToken
        });
    }
    const siblingElements = prepared.flatMap((entry) => (entry.element ? [entry.element] : []));
    const resolvedParent = parent
        ? createMarkdownElement(parent.tagName, parent.properties, siblingElements)
        : undefined;
    const filtered = {
        elements: [],
        tokens: []
    };
    for (let index = 0; index < prepared.length; index += 1) {
        const entry = prepared[index];
        if (!entry) {
            continue;
        }
        if (entry.element && shouldRemoveElement(entry.element, index, resolvedParent, options)) {
            if (options.unwrapDisallowed && entry.filteredChildren) {
                filtered.elements.push(...entry.filteredChildren.elements);
                filtered.tokens.push(...entry.filteredChildren.tokens);
            }
            continue;
        }
        if (entry.element) {
            filtered.elements.push(entry.element);
        }
        filtered.tokens.push(entry.token);
    }
    return filtered;
};
export const filterMarkdownTokens = (tokens, options) => {
    const parsedOptions = parseMarkdownFilteringOptions(options);
    if (!parsedOptions.allowElement &&
        !parsedOptions.allowedElements &&
        !parsedOptions.disallowedElements &&
        !parsedOptions.skipHtml) {
        return tokens;
    }
    return filterTokens(tokens, parsedOptions).tokens;
};
