import { demoRenderers } from './resource-rendering';
import { sumBy, valueNumber, valueText, countBy } from './rendering-values';

export function verifyBusinessRenderingTypes(raw: readonly unknown[]) {
  const products = demoRenderers.products.records(raw);
  sumBy(products, 'stock');
  countBy(products, 'categoryId', 1);
  const first = products[0];
  if (!first) return;
  valueNumber(first, 'price').toFixed(2);
  valueText(first, 'name').toUpperCase();
  // @ts-expect-error 字段拼写必须来自具体产品记录类型。
  valueText(first, 'naem');
  // @ts-expect-error 数值工具不能接受文本字段或静默转换。
  valueNumber(first, 'name');
  // @ts-expect-error 聚合必须使用数值字段而非任意字符串。
  sumBy(products, 'description');
  // @ts-expect-error 筛选字段值必须与字段声明的类型一致。
  countBy(products, 'categoryId', '1');
  // @ts-expect-error 合约记录不能在发布后变成任意字段对象。
  void first.missing;
  // @ts-expect-error 产品字段不能用于联系人记录。
  sumBy(demoRenderers.crm_contacts.records(raw), 'price');
}
