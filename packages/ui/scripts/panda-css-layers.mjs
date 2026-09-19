/** 先处理子层，再移除父层；替换父节点后再遍历会漏掉 recipes._base。 */
export function flattenPandaLayers(container) {
  for (const node of [...(container.nodes ?? [])]) {
    if (node.nodes) flattenPandaLayers(node);
    if (node.type !== 'atrule' || node.name !== 'layer') continue;
    if (node.nodes?.length) node.replaceWith(...node.nodes);
    else node.remove();
  }
  return container;
}
