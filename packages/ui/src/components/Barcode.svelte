<script lang="ts">
  import { cn } from '../utils.js';
  import { Copy, Check, Printer } from '@lucide/svelte';

  export type BarcodeFormat = 'CODE128' | 'CODE39' | 'EAN13';

  export interface BarcodeProps {
    value: string;
    format?: BarcodeFormat;
    width?: number;
    height?: number;
    showText?: boolean;
    text?: string;
    showActions?: boolean;
    margin?: number;
    class?: string;
  }

  let {
    value,
    format = 'CODE128',
    width = 2,
    height = 60,
    showText = true,
    text,
    showActions = false,
    margin = 8,
    class: className = '',
  }: BarcodeProps = $props();

  let copied = $state(false);

  // CODE39 模式表: 每个字符由 9 个单元组成（5条4空），其中3个为宽单元（值为1表示宽，0表示窄）
  const CODE39_ENCODINGS: Record<string, string> = {
    '0': '000110100', '1': '100100001', '2': '001100001', '3': '101100000',
    '4': '000110001', '5': '100110000', '6': '001110000', '7': '000100101',
    '8': '100100100', '9': '001100100', 'A': '100001001', 'B': '001001001',
    'C': '101001000', 'D': '000011001', 'E': '100011000', 'F': '001011000',
    'G': '000001101', 'H': '100001100', 'I': '001001100', 'J': '000011100',
    'K': '100000011', 'L': '001000011', 'M': '101000010', 'N': '000010011',
    'O': '100010010', 'P': '001010010', 'Q': '000000111', 'R': '100000110',
    'S': '001000110', 'T': '000010110', 'U': '110000001', 'V': '011000001',
    'W': '111000000', 'X': '010010001', 'Y': '110010000', 'Z': '011010000',
    '-': '010000101', '.': '110000100', ' ': '011000100', '$': '010101000',
    '/': '010100010', '+': '010001010', '%': '000101010', '*': '010010100'
  };

  // CODE128 模式表 (常用模式)
  const CODE128_PATTERNS: string[] = [
    '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
    '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
    '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
    '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
    '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
    '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
    '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
    '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
    '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
    '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
    '114131', '311141', '411131', '211412', '211214', '211232', '2331112'
  ];

  interface BarSegment {
    x: number;
    width: number;
  }

  const barcodeBars = $derived.by<BarSegment[]>(() => {
    if (!value) return [];
    const bars: BarSegment[] = [];
    let currentX = margin;

    if (format === 'CODE39') {
      const cleanValue = `*${value.toUpperCase()}*`;
      for (let i = 0; i < cleanValue.length; i++) {
        const char = cleanValue[i] ?? '-';
        const pattern = CODE39_ENCODINGS[char] ?? CODE39_ENCODINGS['-'] ?? '010000101';
        // 9 个单元：偶数索引是条，奇数索引是空
        for (let j = 0; j < 9; j++) {
          const isBar = j % 2 === 0;
          const isWide = pattern[j] === '1';
          const segmentWidth = (isWide ? 3 : 1) * width;
          if (isBar) {
            bars.push({ x: currentX, width: segmentWidth });
          }
          currentX += segmentWidth;
        }
        // 字符间间隔
        currentX += width;
      }
    } else {
      // CODE128 (默认 Code B 模式)
      const startBIndex = 104;
      const stopIndex = 106;
      let checksum = startBIndex;
      const codes: number[] = [startBIndex];

      for (let i = 0; i < value.length; i++) {
        const charCode = value.charCodeAt(i);
        const codeIndex = charCode >= 32 && charCode <= 126 ? charCode - 32 : 0;
        codes.push(codeIndex);
        checksum += codeIndex * (i + 1);
      }
      codes.push(checksum % 103);
      codes.push(stopIndex);

      for (const code of codes) {
        const pattern = CODE128_PATTERNS[code] ?? CODE128_PATTERNS[0] ?? '212222';
        let isBar = true;
        for (let j = 0; j < pattern.length; j++) {
          const char = pattern[j] ?? '1';
          const runLength = parseInt(char, 10) * width;
          if (isBar) {
            bars.push({ x: currentX, width: runLength });
          }
          currentX += runLength;
          isBar = !isBar;
        }
      }
    }

    return bars;
  });

  const totalWidth = $derived.by(() => {
    if (barcodeBars.length === 0) return 200;
    const lastBar = barcodeBars[barcodeBars.length - 1];
    return lastBar ? lastBar.x + lastBar.width + margin : 200;
  });

  const displayLabel = $derived(text ?? value);

  async function copyValue() {
    try {
      await navigator.clipboard.writeText(value);
      copied = true;
      setTimeout(() => { copied = false; }, 2000);
    } catch {
      // ignore
    }
  }

  function handlePrint() {
    window.print();
  }
</script>

<div
  data-svadmin-component="Barcode"
  class={cn(
    'inline-flex flex-col items-center justify-center rounded-lg border border-border bg-card p-4 shadow-xs select-none transition-all',
    className
  )}
>
  <!-- 条形码 SVG 渲染 -->
  <svg
    width={totalWidth}
    height={height + (showText ? 24 : 0)}
    viewBox="0 0 {totalWidth} {height + (showText ? 24 : 0)}"
    class="max-w-full overflow-visible"
    aria-label="Barcode for {value}"
  >
    <!-- 背景填充 -->
    <rect width={totalWidth} height={height + (showText ? 24 : 0)} fill="transparent" />

    <!-- 条形码黑条 -->
    {#each barcodeBars as bar, idx (`bar-${idx}`)}
      <rect
        x={bar.x}
        y={margin}
        width={bar.width}
        height={height - margin * 0.5}
        class="fill-foreground"
      />
    {/each}

    <!-- 下方文本 -->
    {#if showText}
      <text
        x={totalWidth / 2}
        y={height + 16}
        text-anchor="middle"
        class="fill-muted-foreground font-mono text-xs tracking-wider"
      >
        {displayLabel}
      </text>
    {/if}
  </svg>

  <!-- 快捷操作栏（复制、打印） -->
  {#if showActions}
    <div class="mt-3 flex items-center gap-2 border-t border-border pt-2.5 w-full justify-center">
      <button
        type="button"
        onclick={copyValue}
        class="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
        title="复制条码内容"
      >
        {#if copied}
          <Check class="h-3.5 w-3.5 text-primary" />
          <span>已复制</span>
        {:else}
          <Copy class="h-3.5 w-3.5" />
          <span>复制</span>
        {/if}
      </button>

      <button
        type="button"
        onclick={handlePrint}
        class="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
        title="打印条形码"
      >
        <Printer class="h-3.5 w-3.5" />
        <span>打印</span>
      </button>
    </div>
  {/if}
</div>
