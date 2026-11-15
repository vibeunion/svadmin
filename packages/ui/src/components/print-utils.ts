export type PaperSize = 'A4' | 'A4_LANDSCAPE' | 'RECEIPT_80MM' | 'SHIPPING_100X180' | 'TRIPLICATE_241X140';

export interface PrintColumn {
  id: string;
  label: string;
  field: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  visible: boolean;
}

export interface PrintTemplateConfig {
  id: string;
  name: string;
  title: string;
  subTitle?: string;
  companyName: string;
  paperSize: PaperSize;
  showBarcode: boolean;
  showQrCode: boolean;
  showWatermark: boolean;
  watermarkText?: string;
  showAmountInWords: boolean;
  currencySymbol: string;
  metaFields: Array<{ id: string; label: string; field: string; value?: string }>;
  columns: PrintColumn[];
  signers: string[];
  copies: string[];
  footerNotes?: string;
}

/**
 * 将数字金额转换为符合中国财务规范的人民币汉字大写字符串
 * 例如：1234.56 -> 壹仟贰佰叁拾肆元伍角陆分
 */
export function currencyMinorUnits(amount: number): number {
  if (!Number.isFinite(amount) || Math.abs(amount) >= 1e12) {
    throw new RangeError('金额必须是绝对值小于一万亿元的有限数值');
  }
  // 用十进制原值舍入，避免 1.15 丢分、1.005 不进位及科学计数法误差。
  const [coefficient = '0', exponent = '0'] = Math.abs(amount).toString().split('e');
  const decimals = coefficient.split('.')[1]?.length ?? 0;
  const digits = BigInt(coefficient.replace('.', ''));
  const shift = Number(exponent) - decimals + 2;
  const divisor = 10n ** BigInt(Math.max(0, -shift));
  const cents = shift >= 0 ? digits * 10n ** BigInt(shift)
    : (digits + divisor / 2n) / divisor;
  if (cents >= 100000000000000n) throw new RangeError('金额舍入后超出支持范围');
  return Number(cents) * (amount < 0 ? -1 : 1);
}

export function numberToChineseCurrency(num: number): string {
  if (!Number.isFinite(num) || Math.abs(num) >= 1e12) return '金额无效';
  let minorUnits: number;
  try { minorUnits = Math.abs(currencyMinorUnits(num)); }
  catch (error) {
    if (error instanceof RangeError) return '金额无效';
    throw error;
  }
  const fraction = ['角', '分'];
  const digit = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
  const unit = [
    ['元', '万', '亿'],
    ['', '拾', '佰', '仟'],
  ];

  let s = '';
  const fractionPart = minorUnits % 100;
  for (let i = 0; i < fraction.length; i++) {
    s += `${digit[Math.floor(fractionPart / (i === 0 ? 10 : 1)) % 10] ?? ''}${fraction[i] ?? ''}`.replace(/零./, '');
  }
  s = s || '整';

  let integerPart = Math.floor(minorUnits / 100);
  for (let i = 0; i < (unit[0]?.length ?? 0) && integerPart > 0; i++) {
    let p = '';
    for (let j = 0; j < (unit[1]?.length ?? 0) && integerPart > 0; j++) {
      p = `${digit[integerPart % 10] ?? ''}${unit[1]?.[j] ?? ''}${p}`;
      integerPart = Math.floor(integerPart / 10);
    }
    s = `${p.replace(/(零.)*零$/, '').replace(/^$/, '零')}${unit[0]?.[i] ?? ''}${s}`;
  }
  const words = s.replace(/(零.)*零元/, '元').replace(/(零.)+/g, '零').replace(/^整$/, '零元整');
  return num < 0 && minorUnits > 0 ? `负${words}` : words;
}

export const PRINT_PAPER_DIMENSIONS: Record<PaperSize, { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  A4_LANDSCAPE: { width: 297, height: 210 },
  RECEIPT_80MM: { width: 80, height: 160 },
  SHIPPING_100X180: { width: 100, height: 180 },
  TRIPLICATE_241X140: { width: 241, height: 140 },
};

export function printSampleItems(sample: Record<string, unknown>): Record<string, unknown>[] {
  if (Array.isArray(sample['items'])) return sample['items'];
  return Object.values(sample).filter((row): row is Record<string, unknown> =>
    typeof row === 'object' && row !== null && !Array.isArray(row));
}
