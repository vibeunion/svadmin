import { PRINT_PAPER_DIMENSIONS, type PaperSize } from './print-utils.js';

async function copyPrintStyles(source: Document, target: Document): Promise<void> {
  await Promise.all(Array.from(source.querySelectorAll('style, link[rel="stylesheet"]'), node => {
    const clone = node.cloneNode(true) as HTMLStyleElement | HTMLLinkElement;
    const loaded = clone instanceof HTMLLinkElement
      ? new Promise<void>((resolve, reject) => {
        clone.onload = () => resolve();
        clone.onerror = () => reject(new Error('打印样式加载失败'));
      }) : Promise.resolve();
    target.head.append(clone);
    return loaded;
  }));
}

/** 只复制单据；80mm 小票至少 160mm，超出时按内容高度打印。 */
export async function printDocument(element: HTMLElement, paperSize: PaperSize): Promise<void> {
  const frame = document.createElement('iframe');
  frame.title = '单据打印';
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:1px;height:1px;border:0';
  document.body.append(frame);
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const target = frame.contentDocument;
    const printWindow = frame.contentWindow;
    if (!target || !printWindow) throw new Error('无法创建打印窗口');
    target.documentElement.lang = document.documentElement.lang;
    const base = target.createElement('base');
    base.href = document.baseURI;
    target.head.append(base);
    const stylesheetReady = copyPrintStyles(document, target);
    const paper = PRINT_PAPER_DIMENSIONS[paperSize];
    const pageStyle = target.createElement('style');
    pageStyle.textContent = `@page { size: ${paper.width}mm ${paper.height}mm; margin: 0; }
      html, body { margin: 0; padding: 0; background: white; color: black; }
      .print-pages { display: block !important; }
      .print-page { box-shadow: none !important; border: 0 !important; }`;
    target.head.append(pageStyle);
    const copied = element.cloneNode(true) as HTMLElement;
    copied.hidden = false;
    copied.style.display = 'block';
    target.body.append(copied);
    const deadline = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => reject(new Error('打印资源加载超时')), 15000);
    });
    await Promise.race([stylesheetReady.then(() => target.fonts?.ready), deadline]);
    clearTimeout(timeout);
    if (paperSize === 'RECEIPT_80MM') {
      const height = Math.max(paper.height, ...Array.from(copied.querySelectorAll<HTMLElement>('.print-page'),
        page => Math.ceil(page.getBoundingClientRect().height * 25.4 / 96 - 0.01)));
      pageStyle.textContent += `@page { size: ${paper.width}mm ${height}mm; }`;
    }
    // Safari 的打印对话框可能非阻塞，不能在 print() 返回时立即移除文档。
    const cleanupTimer = setTimeout(() => frame.remove(), 60000);
    printWindow.addEventListener('afterprint', () => {
      clearTimeout(cleanupTimer);
      frame.remove();
    }, { once: true });
    printWindow.focus();
    printWindow.print();
  } catch (error) {
    clearTimeout(timeout);
    frame.remove();
    throw error;
  }
}
