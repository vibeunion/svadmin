import * as elements from '@svadmin/ai-elements';

const missing = elements.AI_ELEMENT_PARITY.filter(
  (entry) => !(entry.exportName in elements) || !(entry.namespaceExport in elements),
);

if (missing.length > 0) {
  throw new Error(`Missing AI Element exports: ${missing.map((entry) => entry.upstream).join(', ')}`);
}

console.info(elements.AI_ELEMENT_PARITY.length, Object.keys(elements).length);
