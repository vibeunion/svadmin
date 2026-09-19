export type MermaidSvgMarkupOptions = {
    id: string;
    renderSvg?: () => Promise<string>;
    root?: ParentNode;
};
export type SvgToPngBlobOptions = {
    scale?: number;
};
export declare const DEFAULT_MERMAID_PNG_SCALE = 5;
export declare const getMermaidSvgElement: (id: string, root?: ParentNode) => SVGSVGElement | null;
export declare const serializeSvg: (svg: SVGSVGElement) => string;
export declare const getMermaidSvgMarkup: ({ id, renderSvg, root }: MermaidSvgMarkupOptions) => Promise<string | null>;
export declare const svgToPngBlob: (svgString: string, options?: SvgToPngBlobOptions) => Promise<Blob>;
