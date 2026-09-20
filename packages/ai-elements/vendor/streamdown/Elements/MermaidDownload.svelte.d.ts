type $$ComponentProps = {
    id: string;
    chart: string;
    renderSvg?: () => Promise<string>;
};
declare const MermaidDownload: import("svelte").Component<$$ComponentProps, {}, "">;
type MermaidDownload = ReturnType<typeof MermaidDownload>;
export default MermaidDownload;
