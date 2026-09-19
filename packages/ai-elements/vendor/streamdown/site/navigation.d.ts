export type SiteNavItem = {
    label: string;
    href: string;
    match: (pathname: string, hash: string) => boolean;
};
export declare const siteNavItems: readonly SiteNavItem[];
