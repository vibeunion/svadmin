const CODE_FENCE_PATTERN = /^[ \t]{0,3}(`{3,}|~{3,})/;
export function hasIncompleteCodeFence(markdown) {
    const lines = markdown.split('\n');
    let openFenceChar = null;
    let openFenceLength = 0;
    for (const line of lines) {
        const match = CODE_FENCE_PATTERN.exec(line);
        if (!match) {
            continue;
        }
        const fenceRun = match[1];
        const fenceChar = fenceRun[0];
        const fenceLength = fenceRun.length;
        if (openFenceChar === null) {
            openFenceChar = fenceChar;
            openFenceLength = fenceLength;
            continue;
        }
        if (fenceChar === openFenceChar && fenceLength >= openFenceLength) {
            openFenceChar = null;
            openFenceLength = 0;
        }
    }
    return openFenceChar !== null;
}
export function parseCodeFenceInfo(rawLanguage) {
    const parts = rawLanguage?.trim().split(/\s+/).filter(Boolean) ?? [];
    const [language = '', ...metaParts] = parts;
    const meta = metaParts.join(' ');
    const startLineMatch = meta.match(/(?:^|\s)startLine=(\d+)(?:\s|$)/);
    const parsedStartLine = startLineMatch ? Number.parseInt(startLineMatch[1], 10) : undefined;
    return {
        language,
        meta,
        startLine: parsedStartLine && parsedStartLine >= 1 ? parsedStartLine : undefined,
        showLineNumbers: !/(?:^|\s)noLineNumbers(?:\s|$)/.test(meta)
    };
}
