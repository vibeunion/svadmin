export declare const parseUrl: (url: unknown, defaultOrigin?: string) => URL | null;
export declare const isPathRelativeUrl: (url: unknown) => boolean;
export type UrlPolicyKind = 'image' | 'link';
export type TransformUrlOptions = {
    kind?: UrlPolicyKind;
};
type WildcardAllowedUrlPrefix = {
    type: 'wildcard';
};
type ProtocolAllowedUrlPrefix = {
    type: 'protocol';
    protocol: string;
};
type AbsoluteAllowedUrlPrefix = {
    type: 'url';
    url: URL;
};
export type AllowedUrlPrefix = WildcardAllowedUrlPrefix | ProtocolAllowedUrlPrefix | AbsoluteAllowedUrlPrefix;
export declare const parseAllowedUrlPrefixes: (allowedPrefixes: readonly unknown[], defaultOrigin?: string) => AllowedUrlPrefix[];
export declare const transformParsedUrl: (url: unknown, allowedPrefixes: readonly AllowedUrlPrefix[], defaultOrigin?: string, { kind }?: TransformUrlOptions) => string | null;
export declare const transformUrl: (url: unknown, allowedPrefixes: string[], defaultOrigin?: string, { kind }?: TransformUrlOptions) => string | null;
export {};
