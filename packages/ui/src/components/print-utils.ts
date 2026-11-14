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
export function numberToChineseCurrency(num: number): string {
  if (isNaN(num) || num < 0) return '零元整';
  const fraction = ['角', '分'];
  const digit = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
  const unit = [
    ['元', '万', '亿'],
    ['', '拾', '佰', '仟'],
  ];

  let s = '';
  const fractionPart = Math.floor(num * 100) % 100;
  for (let i = 0; i < fraction.length; i++) {
    s += `${digit[Math.floor(fractionPart / (i === 0 ? 10 : 1)) % 10] ?? ''}${fraction[i] ?? ''}`.replace(/零./, '');
  }
  s = s || '整';

  let integerPart = Math.floor(num);
  for (let i = 0; i < (unit[0]?.length ?? 0) && integerPart > 0; i++) {
    let p = '';
    for (let j = 0; j < (unit[1]?.length ?? 0) && integerPart > 0; j++) {
      p = `${digit[integerPart % 10] ?? ''}${unit[1]?.[j] ?? ''}${p}`;
      integerPart = Math.floor(integerPart / 10);
    }
    s = `${p.replace(/(零.)*零$/, '').replace(/^$/, '零')}${unit[0]?.[i] ?? ''}${s}`;
  }
  return s.replace(/(零.)*零元/, '元').replace(/(零.)+/g, '零').replace(/^整$/, '零元整');
}
