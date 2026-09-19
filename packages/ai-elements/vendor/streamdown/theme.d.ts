import { type ClassValue } from 'clsx';
export declare const cn: (...inputs: ClassValue[]) => string;
export type CnFunction = (...inputs: ClassValue[]) => string;
export declare const prefixClasses: (prefix: string, classString: string) => string;
export declare const createCn: (prefix?: string) => CnFunction;
export declare const prefixThemeClasses: <T>(prefix: string | undefined, value: T) => T;
export declare const theme: {
    link: {
        base: string;
        blocked: string;
    };
    h1: {
        base: string;
    };
    h2: {
        base: string;
    };
    h3: {
        base: string;
    };
    h4: {
        base: string;
    };
    h5: {
        base: string;
    };
    h6: {
        base: string;
    };
    paragraph: {
        base: string;
    };
    ul: {
        base: string;
    };
    ol: {
        base: string;
    };
    li: {
        base: string;
        checkbox: string;
    };
    code: {
        base: string;
        container: string;
        header: string;
        actions: string;
        buttons: string;
        language: string;
        skeleton: string;
        pre: string;
        line: string;
    };
    codespan: {
        base: string;
    };
    image: {
        base: string;
        image: string;
    };
    blockquote: {
        base: string;
    };
    alert: {
        base: string;
        title: string;
        icon: string;
        note: string;
        tip: string;
        warning: string;
        caution: string;
        important: string;
    };
    table: {
        base: string;
        wrapper: string;
        toolbar: string;
        container: string;
        table: string;
    };
    thead: {
        base: string;
    };
    tbody: {
        base: string;
    };
    tfoot: {
        base: string;
    };
    tr: {
        base: string;
    };
    td: {
        base: string;
    };
    th: {
        base: string;
    };
    sup: {
        base: string;
    };
    sub: {
        base: string;
    };
    hr: {
        base: string;
    };
    strong: {
        base: string;
    };
    mermaid: {
        base: string;
        icon: string;
        buttons: string;
    };
    math: {
        block: string;
        inline: string;
    };
    br: {
        base: string;
    };
    em: {
        base: string;
    };
    del: {
        base: string;
    };
    footnoteRef: {
        base: string;
    };
    descriptionList: {
        base: string;
    };
    descriptionTerm: {
        base: string;
    };
    descriptionDetail: {
        base: string;
    };
    inlineCitation: {
        preview: string;
        carousel: {
            header: string;
            stepCounter: string;
            buttons: string;
            title: string;
            url: string;
            favicon: string;
        };
        list: {
            base: string;
            item: string;
            title: string;
            url: string;
            favicon: string;
        };
    };
    mdx: {};
    components: {
        button: string;
        popover: string;
    };
};
export declare const shadcnTheme: {
    link: {
        base: string;
        blocked: string;
    };
    h1: {
        base: string;
    };
    h2: {
        base: string;
    };
    h3: {
        base: string;
    };
    h4: {
        base: string;
    };
    h5: {
        base: string;
    };
    h6: {
        base: string;
    };
    paragraph: {
        base: string;
    };
    ul: {
        base: string;
    };
    ol: {
        base: string;
    };
    li: {
        base: string;
        checkbox: string;
    };
    code: {
        base: string;
        container: string;
        header: string;
        actions: string;
        buttons: string;
        language: string;
        skeleton: string;
        pre: string;
        line: string;
    };
    codespan: {
        base: string;
    };
    image: {
        base: string;
        image: string;
    };
    blockquote: {
        base: string;
    };
    alert: {
        base: string;
        title: string;
        icon: string;
        note: string;
        tip: string;
        warning: string;
        caution: string;
        important: string;
    };
    table: {
        base: string;
        wrapper: string;
        toolbar: string;
        container: string;
        table: string;
    };
    thead: {
        base: string;
    };
    tbody: {
        base: string;
    };
    tfoot: {
        base: string;
    };
    tr: {
        base: string;
    };
    td: {
        base: string;
    };
    th: {
        base: string;
    };
    sup: {
        base: string;
    };
    sub: {
        base: string;
    };
    hr: {
        base: string;
    };
    strong: {
        base: string;
    };
    mermaid: {
        base: string;
        icon: string;
        buttons: string;
    };
    math: {
        block: string;
        inline: string;
    };
    br: {
        base: string;
    };
    em: {
        base: string;
    };
    del: {
        base: string;
    };
    footnoteRef: {
        base: string;
    };
    descriptionList: {
        base: string;
    };
    descriptionTerm: {
        base: string;
    };
    descriptionDetail: {
        base: string;
    };
    inlineCitation: {
        preview: string;
        carousel: {
            header: string;
            stepCounter: string;
            buttons: string;
            title: string;
            url: string;
            favicon: string;
        };
        list: {
            base: string;
            item: string;
            title: string;
            url: string;
            favicon: string;
        };
    };
    mdx: {};
    components: {
        button: string;
        popover: string;
    };
};
export type Theme = typeof theme;
type DeepPartial<T> = {
    [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};
export type DeepPartialTheme = DeepPartial<Theme>;
export declare const mergeTheme: (customTheme?: DeepPartialTheme, baseTheme?: "tailwind" | "shadcn") => {
    link: {
        base: string;
        blocked: string;
    };
    h1: {
        base: string;
    };
    h2: {
        base: string;
    };
    h3: {
        base: string;
    };
    h4: {
        base: string;
    };
    h5: {
        base: string;
    };
    h6: {
        base: string;
    };
    paragraph: {
        base: string;
    };
    ul: {
        base: string;
    };
    ol: {
        base: string;
    };
    li: {
        base: string;
        checkbox: string;
    };
    code: {
        base: string;
        container: string;
        header: string;
        actions: string;
        buttons: string;
        language: string;
        skeleton: string;
        pre: string;
        line: string;
    };
    codespan: {
        base: string;
    };
    image: {
        base: string;
        image: string;
    };
    blockquote: {
        base: string;
    };
    alert: {
        base: string;
        title: string;
        icon: string;
        note: string;
        tip: string;
        warning: string;
        caution: string;
        important: string;
    };
    table: {
        base: string;
        wrapper: string;
        toolbar: string;
        container: string;
        table: string;
    };
    thead: {
        base: string;
    };
    tbody: {
        base: string;
    };
    tfoot: {
        base: string;
    };
    tr: {
        base: string;
    };
    td: {
        base: string;
    };
    th: {
        base: string;
    };
    sup: {
        base: string;
    };
    sub: {
        base: string;
    };
    hr: {
        base: string;
    };
    strong: {
        base: string;
    };
    mermaid: {
        base: string;
        icon: string;
        buttons: string;
    };
    math: {
        block: string;
        inline: string;
    };
    br: {
        base: string;
    };
    em: {
        base: string;
    };
    del: {
        base: string;
    };
    footnoteRef: {
        base: string;
    };
    descriptionList: {
        base: string;
    };
    descriptionTerm: {
        base: string;
    };
    descriptionDetail: {
        base: string;
    };
    inlineCitation: {
        preview: string;
        carousel: {
            header: string;
            stepCounter: string;
            buttons: string;
            title: string;
            url: string;
            favicon: string;
        };
        list: {
            base: string;
            item: string;
            title: string;
            url: string;
            favicon: string;
        };
    };
    mdx: {};
    components: {
        button: string;
        popover: string;
    };
};
export {};
