export const defaultTranslations = {
    copyCode: 'Copy Code',
    copyLink: 'Copy link',
    copied: 'Copied',
    openLink: 'Open link',
    openExternalLink: 'Open external link?',
    externalLinkWarning: "You're about to visit an external website.",
    close: 'Close',
    downloadFile: 'Download file',
    downloadDiagram: 'Download diagram',
    downloadDiagramAsSvg: 'Download diagram as SVG',
    downloadDiagramAsPng: 'Download diagram as PNG',
    downloadDiagramAsMmd: 'Download diagram as MMD',
    viewFullscreen: 'View fullscreen',
    exitFullscreen: 'Exit fullscreen',
    mermaidFormatSvg: 'SVG',
    mermaidFormatPng: 'PNG',
    mermaidFormatMmd: 'MMD',
    copyTable: 'Copy table',
    copyTableAsMarkdown: 'Copy table as Markdown',
    copyTableAsHtml: 'Copy table as HTML',
    copyTableAsCsv: 'Copy table as CSV',
    copyTableAsTsv: 'Copy table as TSV',
    downloadTable: 'Download table',
    downloadTableAsCsv: 'Download table as CSV',
    downloadTableAsMarkdown: 'Download table as Markdown',
    downloadTableAsHtml: 'Download table as HTML',
    tableFormatMarkdown: 'Markdown',
    tableFormatHtml: 'HTML',
    tableFormatCsv: 'CSV',
    tableFormatTsv: 'TSV',
    imageNotAvailable: 'Image not available',
    downloadImage: 'Download image',
    alert: {
        note: 'note',
        tip: 'tip',
        warning: 'warning',
        caution: 'caution',
        important: 'important'
    }
};
export function mergeTranslations(translations) {
    if (!translations) {
        return defaultTranslations;
    }
    return {
        ...defaultTranslations,
        ...translations,
        alert: {
            ...defaultTranslations.alert,
            ...translations.alert
        }
    };
}
