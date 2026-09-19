export const parseUrl = (url, defaultOrigin) => {
    if (typeof url !== 'string')
        return null;
    try {
        // Try to parse as absolute URL first
        const urlObject = new URL(url);
        return urlObject;
    }
    catch (error) {
        // If that fails and we have a defaultOrigin, try with it
        if (defaultOrigin) {
            try {
                const urlObject = new URL(url, defaultOrigin);
                return urlObject;
            }
            catch (error) {
                return null;
            }
        }
        return null;
    }
};
export const isPathRelativeUrl = (url) => {
    if (typeof url !== 'string')
        return false;
    return ((url.startsWith('/') && !url.startsWith('//')) ||
        url.startsWith('./') ||
        url.startsWith('../') ||
        url.startsWith('#') ||
        url.startsWith('?'));
};
const WILDCARD_PROTOCOLS = {
    link: new Set(['http:', 'https:', 'mailto:', 'tel:']),
    image: new Set(['http:', 'https:'])
};
const PROTOCOL_ONLY_PREFIX_PATTERN = /^(?<protocol>[A-Za-z][A-Za-z\d+.-]*:)(\/\/)?$/;
function isAllowedByWildcard(url, kind) {
    if (WILDCARD_PROTOCOLS[kind].has(url.protocol)) {
        return true;
    }
    return kind === 'image' && url.protocol === 'data:' && /^data:image\//i.test(url.href);
}
const parseAllowedUrlPrefix = (prefix, defaultOrigin) => {
    if (prefix === '*') {
        return { type: 'wildcard' };
    }
    if (typeof prefix !== 'string') {
        return null;
    }
    const protocolOnlyMatch = prefix.match(PROTOCOL_ONLY_PREFIX_PATTERN);
    if (protocolOnlyMatch?.groups?.protocol) {
        return {
            type: 'protocol',
            protocol: protocolOnlyMatch.groups.protocol.toLowerCase()
        };
    }
    const parsedPrefix = parseUrl(prefix, defaultOrigin);
    if (!parsedPrefix) {
        return null;
    }
    return {
        type: 'url',
        url: parsedPrefix
    };
};
export const parseAllowedUrlPrefixes = (allowedPrefixes, defaultOrigin) => allowedPrefixes
    .map((prefix) => parseAllowedUrlPrefix(prefix, defaultOrigin))
    .filter((prefix) => prefix !== null);
function isAllowedByPrefix(url, prefix, kind) {
    switch (prefix.type) {
        case 'wildcard':
            return isAllowedByWildcard(url, kind);
        case 'protocol':
            return url.protocol.toLowerCase() === prefix.protocol;
        case 'url':
            return prefix.url.origin === url.origin && url.href.startsWith(prefix.url.href);
    }
}
export const transformParsedUrl = (url, allowedPrefixes, defaultOrigin, { kind = 'link' } = {}) => {
    if (!url)
        return null;
    if (typeof url !== 'string')
        return null;
    const inputWasRelative = isPathRelativeUrl(url);
    const parsedUrl = parseUrl(url, defaultOrigin);
    if (!parsedUrl)
        return null;
    if (allowedPrefixes.some((prefix) => isAllowedByPrefix(parsedUrl, prefix, kind))) {
        if (inputWasRelative) {
            return url;
        }
        return parsedUrl.href;
    }
    return null;
};
export const transformUrl = (url, allowedPrefixes, defaultOrigin, { kind = 'link' } = {}) => transformParsedUrl(url, parseAllowedUrlPrefixes(allowedPrefixes, defaultOrigin), defaultOrigin, {
    kind
});
