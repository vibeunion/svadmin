// Default configuration options for the extended tables extension
export const DEFAULT_OPTIONS = {
    useTheadTbody: true,
    useTfoot: false,
    detectFooter: true,
    maxColspan: null,
    handleComplexSpans: true
};
// Creates an HTML table cell with appropriate attributes
export const getTableCell = (text, cell, type, align) => {
    if (!cell.rowspan)
        return '';
    const tag = `<${type}` +
        `${cell.colspan > 1 ? ` colspan=${cell.colspan}` : ''}` +
        `${cell.rowspan > 1 ? ` rowspan=${cell.rowspan}` : ''}` +
        `${align ? ` align=${align}` : ''}>`;
    return `${tag + text}</${type}>\n`;
};
function splitRow(src) {
    const out = [];
    let buf = '';
    let esc = false;
    let inCode = false;
    let fence = 0;
    for (let i = 0; i < src.length; i++) {
        const ch = src[i];
        if (esc) {
            buf += ch;
            esc = false;
            continue;
        }
        if (ch === '\\') {
            esc = true;
            buf += ch;
            continue;
        }
        if (ch === '`') {
            let run = 1;
            while (i + run < src.length && src[i + run] === '`')
                run++;
            if (!inCode) {
                inCode = true;
                fence = run;
            }
            else if (run >= fence) {
                inCode = false;
                fence = 0;
            }
            buf += src.slice(i, i + run);
            i += run - 1;
            continue;
        }
        if (ch === '|' && !inCode) {
            // Count consecutive pipes for colspan
            let consecutivePipes = 1;
            while (i + consecutivePipes < src.length && src[i + consecutivePipes] === '|') {
                consecutivePipes++;
            }
            if (consecutivePipes > 1) {
                // Multiple pipes = colspan marker
                out.push(buf.trim() + '\x00COLSPAN:' + consecutivePipes);
                i += consecutivePipes - 1;
            }
            else {
                out.push(buf.trim());
            }
            buf = '';
            continue;
        }
        buf += ch;
    }
    out.push(buf.trim());
    return out;
}
// Splits a table row into cells and processes row/column spans
export const splitCells = (tableRow, count, prevRow = null, maxColspan = null, preserveIncompleteTail = false) => {
    // Split by pipe, but handle escaped pipes and empty cells
    const cells = splitRow(tableRow);
    // Remove first/last cell if it's empty (from leading/trailing pipes)
    if (cells.length > 0 && !cells[0])
        cells.shift();
    if (cells.length > 0 && !cells[cells.length - 1])
        cells.pop();
    return processSpans(cells, count, prevRow?.cells || [], maxColspan, preserveIncompleteTail);
};
// Process row and column spans in table cells
const processSpans = (cells, count, prevRow = [], maxColspan = null, preserveIncompleteTail = false) => {
    let numCols = 0;
    let i, j, trimmedCell, prevCell;
    const processedCells = [];
    // Track colspan cells that need rowspan
    const colspanCells = new Map();
    // First pass: Process each cell's colspan and merge consecutive empty cells
    let cellIndex = 0;
    const mergedIndices = new Set();
    for (i = 0; i < cells.length; i++) {
        if (mergedIndices.has(i))
            continue;
        trimmedCell = cells[i];
        let colspan = 1;
        // Check for colspan marker from consecutive pipes
        if (trimmedCell.includes('\x00COLSPAN:')) {
            const parts = trimmedCell.split('\x00COLSPAN:');
            trimmedCell = parts[0];
            colspan = parseInt(parts[1], 10);
        }
        else if (!trimmedCell.trim()) {
            // Preserve explicit empty cells. Colspan should come from the dedicated
            // repeated-pipe marker rather than silently merging blank markdown cells.
            colspan = 1;
        }
        if (maxColspan !== null && colspan > maxColspan)
            colspan = maxColspan;
        processedCells[cellIndex] = {
            rowspan: 1,
            colspan: colspan,
            text: trimmedCell.trim().replace(/\\\|/g, '|'),
            position: numCols
        };
        numCols += processedCells[cellIndex].colspan;
        cellIndex++;
    }
    // Second pass: Process rowspan by matching cells by position
    for (i = 0; i < processedCells.length; i++) {
        const cell = processedCells[i];
        let cellText = cell.text;
        // Handle Rowspan - cells ending with ^ (but not superscript ^text^)
        // Check if it's a rowspan indicator (single ^ at end) vs superscript (^text^)
        const isRowspanIndicator = cellText.slice(-1) === '^' && !cellText.match(/\^[^^\n\r]+\^$/); // Not a superscript pattern ^text^
        if (isRowspanIndicator && prevRow.length > 0) {
            // Clean the ^ indicator from the cell text
            cell.text = cellText.slice(0, -1).trim();
            cellText = cell.text;
            let targetFound = false;
            const startPosition = cell.position || 0;
            const endPosition = startPosition + cell.colspan - 1;
            // Try to find a matching cell or combination of cells in previous row
            for (j = 0; j < prevRow.length; j++) {
                prevCell = prevRow[j];
                const prevStartPosition = prevCell.position || 0;
                const prevEndPosition = prevStartPosition + prevCell.colspan - 1;
                // Check for position overlap between cells
                if ((startPosition >= prevStartPosition && startPosition <= prevEndPosition) ||
                    (endPosition >= prevStartPosition && endPosition <= prevEndPosition) ||
                    (prevStartPosition >= startPosition && prevEndPosition <= endPosition)) {
                    // Complex case: Handle rowspan for colspan cells
                    if (cell.colspan > 1 && prevCell.colspan > 1) {
                        // If the cell spans exactly match, simple case
                        if (cell.colspan === prevCell.colspan && cell.position === prevCell.position) {
                            cell.rowSpanTarget = prevCell.rowSpanTarget ?? prevCell;
                            // Only append text if it's different from the target cell
                            const textToAppend = cell.text.trim();
                            const targetText = cell.rowSpanTarget.text.trim();
                            // Don't append if the text is the same or already contained (common case for rowspan indicators)
                            if (textToAppend &&
                                textToAppend !== targetText &&
                                !targetText.includes(textToAppend)) {
                                cell.rowSpanTarget.text = targetText + (targetText ? ' ' : '') + textToAppend;
                            }
                            cell.rowSpanTarget.rowspan += 1;
                            cell.rowspan = 0;
                            targetFound = true;
                            break;
                        }
                        else {
                            // More complex case: Track colspan cells that need rowspan for next row
                            const key = `${cell.position}-${cell.colspan}`;
                            colspanCells.set(key, {
                                original: prevCell,
                                newCell: cell
                            });
                            // Keep the cell visible for now, will be merged in rendering
                        }
                    }
                    else {
                        // Standard case of single column cell with rowspan
                        cell.rowSpanTarget = prevCell.rowSpanTarget ?? prevCell;
                        // Only append text if it's different from the target cell
                        const textToAppend = cell.text.trim();
                        const targetText = cell.rowSpanTarget.text.trim();
                        // Don't append if the text is the same or already contained (common case for rowspan indicators)
                        if (textToAppend && textToAppend !== targetText && !targetText.includes(textToAppend)) {
                            cell.rowSpanTarget.text = targetText + (targetText ? ' ' : '') + textToAppend;
                        }
                        cell.rowSpanTarget.rowspan += 1;
                        cell.rowspan = 0;
                        targetFound = true;
                        break;
                    }
                }
            }
            // If no target was found but it's a rowspan cell, clean the ^ indicator
            if (!targetFound && cell.rowspan > 0) {
                cell.text = cellText;
            }
        }
    }
    // Process any complex colspan+rowspan combinations we tracked
    colspanCells.forEach((spanData) => {
        const { original, newCell } = spanData;
        if (original && newCell) {
            // Here we could apply more sophisticated merging logic
            // For now, just mark that these cells have a relationship
            newCell.complexRowSpan = true;
            newCell.relatedCell = original;
        }
    });
    // Normalize column count
    return normalizeColumnCount(processedCells, count, numCols, preserveIncompleteTail);
};
// Ensures the row has the correct number of columns
const normalizeColumnCount = (cells, count, numCols, preserveIncompleteTail) => {
    if (count === null || numCols === count) {
        return {
            cells,
            columnNormalization: {
                mode: 'exact',
                expectedColumns: count,
                actualColumns: numCols
            }
        };
    }
    if (numCols < count) {
        return {
            cells,
            columnNormalization: {
                mode: 'underflow-preserved',
                expectedColumns: count,
                actualColumns: numCols
            },
            placeholderColumns: preserveIncompleteTail ? count - numCols : undefined
        };
    }
    const hasPartialFit = cells.some((cell) => {
        const startPosition = cell.position ?? 0;
        return startPosition < count && startPosition + cell.colspan > count;
    });
    const hasComplexSpan = cells.some((cell) => cell.colspan > 1 || cell.rowspan > 1 || cell.complexRowSpan === true);
    return {
        cells,
        columnNormalization: {
            mode: hasPartialFit
                ? 'partial-fit-preserved'
                : hasComplexSpan
                    ? 'complex-span-preserved'
                    : 'overflow-preserved',
            expectedColumns: count,
            actualColumns: numCols
        }
    };
};
const summarizeTableNormalization = (rows) => {
    const issues = Array.from(new Set(rows
        .map((row) => row.columnNormalization.mode)
        .filter((mode) => mode !== 'exact')));
    if (issues.length === 0) {
        return undefined;
    }
    return {
        mode: 'preserve-content',
        issues
    };
};
// Process alignment indicators in table headers
function processAlignment(alignRow) {
    const alignment = [];
    for (let i = 0; i < alignRow.length; i++) {
        if (/^ *-+: *$/.test(alignRow[i])) {
            alignment[i] = 'right';
        }
        else if (/^ *:-+: *$/.test(alignRow[i])) {
            alignment[i] = 'center';
        }
        else if (/^ *:-+ *$/.test(alignRow[i])) {
            alignment[i] = 'left';
        }
        else {
            alignment[i] = null;
        }
    }
    return alignment;
}
// Convert working cell to TH
function workingCellToTH(cell, align) {
    return {
        type: 'th',
        rowspan: cell.rowspan,
        colspan: cell.colspan,
        text: cell.text,
        position: cell.position,
        tokens: cell.tokens,
        rowSpanTarget: cell.rowSpanTarget,
        complexRowSpan: cell.complexRowSpan,
        relatedCell: cell.relatedCell,
        align
    };
}
// Convert working cell to TD
function workingCellToTD(cell, align) {
    return {
        type: 'td',
        rowspan: cell.rowspan,
        colspan: cell.colspan,
        text: cell.text,
        position: cell.position,
        tokens: cell.tokens,
        rowSpanTarget: cell.rowSpanTarget,
        complexRowSpan: cell.complexRowSpan,
        relatedCell: cell.relatedCell,
        align
    };
}
// Process table rows and add inline tokens to cells
function processRows(headerRows, bodyRows, alignment, colCount, lexer, maxColspan, detectFooter) {
    const tokens = [];
    const normalizationRows = [];
    // Process header rows
    const processedHeaderRows = [];
    for (let i = 0; i < headerRows.length; i++) {
        const prevRow = i > 0 ? processedHeaderRows[i - 1] : null;
        const padIncompleteTail = i === headerRows.length - 1;
        processedHeaderRows[i] = splitCells(headerRows[i], colCount, prevRow, maxColspan, padIncompleteTail);
    }
    normalizationRows.push(...processedHeaderRows);
    // Convert header rows to THead (only if we have header rows)
    if (processedHeaderRows.length > 0) {
        const theadRows = processedHeaderRows.map((row) => ({
            type: 'tr',
            columnNormalization: row.columnNormalization,
            placeholderColumns: row.placeholderColumns,
            tokens: row.cells.map((cell) => {
                // Use the cell's position to get the correct alignment
                const cellAlignment = cell.position !== undefined ? alignment[cell.position] : null;
                const th = workingCellToTH(cell, cellAlignment);
                // Add inline tokens
                th.tokens = lexer.inline(th.text, th.tokens);
                return th;
            })
        }));
        tokens.push({
            type: 'thead',
            tokens: theadRows
        });
    }
    // Process body rows
    if (bodyRows.length > 0) {
        const processedBodyRows = [];
        for (let i = 0; i < bodyRows.length; i++) {
            const prevRow = i > 0 ? processedBodyRows[i - 1] : processedHeaderRows[processedHeaderRows.length - 1];
            const padIncompleteTail = i === bodyRows.length - 1;
            processedBodyRows[i] = splitCells(bodyRows[i], colCount, prevRow, maxColspan, padIncompleteTail);
        }
        normalizationRows.push(...processedBodyRows);
        // Handle footer detection
        let tbodyRows = processedBodyRows;
        let tfootRows = [];
        if (detectFooter && processedBodyRows.length > 0) {
            const lastRowIndex = processedBodyRows.length - 1;
            tfootRows = [processedBodyRows[lastRowIndex]];
            tbodyRows = processedBodyRows.slice(0, lastRowIndex);
        }
        // Convert body rows to TBody if there are any
        if (tbodyRows.length > 0) {
            const tbodyRowTokens = tbodyRows.map((row) => ({
                type: 'tr',
                columnNormalization: row.columnNormalization,
                placeholderColumns: row.placeholderColumns,
                tokens: row.cells.map((cell) => {
                    // Use the cell's position to get the correct alignment
                    const cellAlignment = cell.position !== undefined ? alignment[cell.position] : null;
                    const td = workingCellToTD(cell, cellAlignment);
                    // Add inline tokens
                    td.tokens = lexer.inline(td.text, td.tokens);
                    return td;
                })
            }));
            tokens.push({
                type: 'tbody',
                tokens: tbodyRowTokens
            });
        }
        // Convert footer rows to TFoot if there are any
        if (tfootRows.length > 0) {
            const tfootRowTokens = tfootRows.map((row) => ({
                type: 'tr',
                columnNormalization: row.columnNormalization,
                placeholderColumns: row.placeholderColumns,
                tokens: row.cells.map((cell) => {
                    // Use the cell's position to get the correct alignment
                    const cellAlignment = cell.position !== undefined ? alignment[cell.position] : null;
                    const td = workingCellToTD(cell, cellAlignment);
                    // Add inline tokens
                    td.tokens = lexer.inline(td.text, td.tokens);
                    return td;
                })
            }));
            tokens.push({
                type: 'tfoot',
                tokens: tfootRowTokens
            });
        }
    }
    return {
        tokens,
        columnNormalization: summarizeTableNormalization(normalizationRows)
    };
}
const { detectFooter, maxColspan } = DEFAULT_OPTIONS;
// Adds support for extended tables in marked with row spanning, column spanning,
// multi-row headers, and column alignment
export const markedTable = {
    name: 'table',
    level: 'block',
    start(src) {
        // Check for table with potential header alignment
        let match = src.match(/^\n *([^\n ].*\|.*)\n/);
        if (match)
            return match.index;
        // Check for simple table without header alignment
        match = src.match(/^\n *(\|.*\|)\n/);
        if (match)
            return match.index;
        return undefined;
    },
    tokenizer(src) {
        // Try to match table with header and alignment first
        let regex = new RegExp('^' +
            '([^\\n ].*\\|.*\\n(?: *[^\\s].*\\n)*?)' + // Header
            ' {0,3}(?:\\| *)?(:?-+:? *(?:\\| *:?-+:? *)*)(?:\\| *)?' + // Header Align
            '(?:\\n((?:(?! *\\n| {0,3}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})' + // Body Cells
            '(?:\\n+|$)| {0,3}#{1,6} | {0,3}>| {4}[^\\n]| {0,3}(?:`{3,}' +
            '(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n| {0,3}(?:[*+-]|1[.)]) |' +
            '<\\/?(?:address|article|aside|base|basefont|blockquote|body|' +
            'caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|section|source|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?: +|\\n|\\/?>)|<(?:script|pre|style|textarea|!--)).*(?:\\n|$))*)\\n*|$)');
        let cap = regex.exec(src);
        let hasHeaderAlignment = true;
        // If no match with header alignment, try table without header alignment
        if (!cap) {
            // Simple tables still require at least two pipe-delimited rows.
            regex = /^(\|.*\|\n\|.*\|(?:\n\|.*\|)*)/;
            cap = regex.exec(src);
            hasHeaderAlignment = false;
        }
        if (!cap)
            return undefined;
        // Combine all captured groups to get complete table rows
        let allTableContent = cap[1]; // Headers
        if (cap[2])
            allTableContent += '\n' + cap[2]; // Alignment row
        if (cap[3])
            allTableContent += '\n' + cap[3]; // Body rows
        const allRows = allTableContent.replace(/\n$/, '').split('\n');
        let headerRows = [];
        let bodyRows = [];
        let alignRow = [];
        let alignment = [];
        let colCount = 0;
        if (hasHeaderAlignment) {
            // Traditional table with header and alignment
            // Parse all rows and identify which are headers vs body
            let headerEndIndex = -1;
            // Find the FIRST alignment row (contains dashes/underscores/asterisks)
            for (let i = 0; i < allRows.length; i++) {
                const row = allRows[i].trim();
                const isAlignment = /^ *(\| *)?:?-+:? *(\| *:?-+:? *)*(\| *)?$/.test(row);
                // Check if this row matches alignment pattern (contains only |, spaces, and alignment chars)
                if (isAlignment) {
                    headerEndIndex = i;
                    alignRow = row.replace(/^ *\| *| *\| *$/g, '').split(/ *\| */);
                    break; // Stop at the first alignment row
                }
            }
            if (headerEndIndex === -1) {
                // No alignment row found, treat as simple table
                bodyRows = allRows;
                colCount = bodyRows[0].split('|').filter((cell) => cell.trim() !== '').length;
                alignment = new Array(colCount).fill(null);
            }
            else {
                // Found alignment row, split headers and body
                // Filter out empty rows and the alignment row itself from headers
                headerRows = allRows.slice(0, headerEndIndex).filter((row) => row.trim() !== '');
                const headerCellCount = splitRow(headerRows[0] ?? '').filter((cell) => cell.length > 0).length;
                bodyRows = headerEndIndex + 1 < allRows.length ? allRows.slice(headerEndIndex + 1) : [];
                // Use alignment row length as the authoritative column count
                colCount = alignRow.length;
                // Validate that we have a reasonable table structure
                if (colCount === 0 || (headerCellCount > 0 && colCount < headerCellCount))
                    return undefined;
                // Process alignment
                alignment = processAlignment(alignRow);
            }
        }
        else {
            // Table without header alignment - treat all rows as body rows
            bodyRows = allRows;
            const firstRowCells = bodyRows[0].split('|').filter((cell) => cell.trim() !== '');
            colCount = firstRowCells.length;
            alignment = new Array(colCount).fill(null); // No alignment for tables without headers
        }
        // Detect footer alignment row pattern in body rows (only for tables with header alignment)
        let shouldDetectFooter = false;
        let processedBodyRows = bodyRows;
        if (detectFooter && hasHeaderAlignment && bodyRows.length > 0) {
            // Check if any row matches the alignment pattern (contains only dashes, pipes, colons, and spaces)
            for (let i = bodyRows.length - 1; i >= 0; i--) {
                const row = bodyRows[i];
                if (/^ *\| *:?-+:? *(\| *:?-+:? *)*\| *$/.test(row)) {
                    // Found footer alignment row - remove it and enable footer detection
                    shouldDetectFooter = true;
                    processedBodyRows = bodyRows.slice(0, i).concat(bodyRows.slice(i + 1));
                    break;
                }
            }
        }
        // Process all rows and create table sections
        const processedTable = processRows(headerRows, processedBodyRows, alignment, colCount, this.lexer, maxColspan, shouldDetectFooter);
        const item = {
            type: 'table',
            tokens: processedTable.tokens,
            raw: cap[0],
            align: alignment,
            columnNormalization: processedTable.columnNormalization
        };
        return item;
    }
};
