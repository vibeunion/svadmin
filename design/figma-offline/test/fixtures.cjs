/* 全部是合成测试数据，不是 Stripe/Park 或真实 Figma 的捕获。 */
(function(root) {
  const PNG = [137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1,0,0,0,1,8,4,0,0,0,181,28,12,2,0,0,0,11,73,68,65,84,120,218,99,100,248,15,0,1,5,1,1,39,24,227,102,0,0,0,0,73,69,78,68,174,66,96,130];
  function blueprint() {
    const colorScopes = ['FRAME_FILL', 'SHAPE_FILL', 'TEXT_FILL', 'STROKE_COLOR'];
    return { format: 'svadmin/figma-blueprint-v1', id: 'offline-smoke-demo-v1', ownership: 'self-authored', title: 'Offline bridge — synthetic smoke demo',
      tokens: {
        'primitive/white': { type: 'COLOR', value: { r: 1, g: 1, b: 1 }, css: 'var(--demo-white)', scopes: [] },
        surface: { type: 'COLOR', alias: 'primitive/white', css: 'var(--demo-surface)', scopes: colorScopes },
        ink: { type: 'COLOR', value: { r: .1, g: .1, b: .1 }, css: 'var(--demo-ink)', scopes: colorScopes },
        space: { type: 'FLOAT', value: 16, css: 'var(--demo-space)', scopes: ['GAP'] },
        radius: { type: 'FLOAT', value: 6, css: 'var(--demo-radius)', scopes: ['CORNER_RADIUS'] },
        body: { type: 'FLOAT', value: 14, css: 'var(--demo-body)', scopes: ['FONT_SIZE'] }
      }, nodes: [
        { key: 'action', kind: 'COMPONENT', name: 'Demo Action', layout: 'HORIZONTAL', width: 240, fill: 'ink', padding: 'space', gap: 'space', radius: 'radius', children: [
          { key: 'label', kind: 'TEXT', name: 'Label', text: 'Editable demo action', width: 208, fill: 'surface', fontSize: 'body' }
        ] },
        { key: 'page', kind: 'FRAME', name: 'Synthetic example — not svadmin UI Kit', layout: 'VERTICAL', width: 400, fill: 'surface', stroke: 'ink', padding: 'space', gap: 'space', radius: 'radius', children: [
          { key: 'title', kind: 'TEXT', name: 'Title', text: 'Local import smoke test', width: 368, fill: 'ink', fontSize: 'body' },
          { key: 'instance', kind: 'INSTANCE', name: 'Action instance', component: 'action' }
        ] }
      ] };
  }
  function createMock(options = {}) {
    let seq = 0;
    const calls = [], variables = new Map(), collections = new Map(), nodes = new Map(), messages = [], styleMap = new Map();
    const rootNode = { id: 'doc', name: 'Synthetic fixture', type: 'DOCUMENT', children: [] };
    function node(type, name = type) {
      const n = { id: `node-${++seq}`, type, name, children: [], parent: null, width: 100, height: 30, removed: false, boundVariables: {}, data: {},
        appendChild(c) { if (c.parent) c.parent.children = c.parent.children.filter(a => a !== c); c.parent = n; n.children.push(c); },
        resize(w, h) { this.width = w; this.height = h; },
        setBoundVariable(k, v) { this.boundVariables[k] = { type: 'VARIABLE_ALIAS', id: v.id }; },
        setPluginData(k, v) { this.data[k] = v; }, getPluginData(k) { return this.data[k] || ''; },
        remove() { if (options.failRollback) throw new Error('synthetic remove failure'); this.removed = true; if (this.parent) this.parent.children = this.parent.children.filter(c => c !== this); },
        findAll() { const all = []; const visit = a => a.children.forEach(c => { all.push(c); visit(c); }); visit(this); return all; },
        createInstance() { const instance = node('INSTANCE'); for (const child of this.children) instance.appendChild(node(child.type, child.name)); return instance; }
      }; nodes.set(n.id, n); return n;
    }
    const page = node('PAGE', 'Selected page'); page.parent = rootNode; rootNode.children.push(page); page.selection = [];
    const originalVariable = { id: 'v-original', name: 'original', resolvedType: 'COLOR', variableCollectionId: 'c-original', valuesByMode: { m: { r: 1, g: 1, b: 1 } }, scopes: ['FRAME_FILL'] };
    variables.set(originalVariable.id, originalVariable); collections.set('c-original', { id: 'c-original', name: 'Original', defaultModeId: 'm', modes: [{modeId: 'm', name: 'Value'}] });
    const selected = node('FRAME', 'Selected'); page.appendChild(selected); page.selection.push(selected);
    selected.raw = { id: selected.id, type: 'FRAME', name: selected.name, boundVariables: { fills: [{ type: 'VARIABLE_ALIAS', id: originalVariable.id }] }, children: [] };
    selected.exportAsync = async config => {
      calls.push(['exportAsync', config]);
      if (options.failExport) throw new Error('synthetic export failure');
      if (config.format === 'PNG') return Uint8Array.from(PNG);
      return options.restMap ? { nodes: { [selected.id]: { document: structuredClone(selected.raw) } } } : { document: structuredClone(selected.raw) };
    };
    const figma = { root: rootNode, currentPage: page, ui: { postMessage(m) { messages.push(m); if (options.onMessage) options.onMessage(m); } },
      showUI() { return undefined; }, viewport: { scrollAndZoomIntoView() { return undefined; } },
      async setCurrentPageAsync(p) { calls.push(['setCurrentPage', p.id]); this.currentPage = p; },
      async loadFontAsync(font) { calls.push(['loadFont', font]); if (options.onFont) await options.onFont(figma); if (options.failFont) throw new Error('synthetic missing font'); },
      createPage() { calls.push(['createPage']); const p = node('PAGE'); p.parent = rootNode; rootNode.children.push(p); return p; },
      createText() { calls.push(['createText']); if (options.failText) throw new Error('synthetic text failure'); return node('TEXT'); },
      createFrame() { calls.push(['createFrame']); return node('FRAME'); }, createComponent() { calls.push(['createComponent']); return node('COMPONENT'); },
      async getStyleByIdAsync(id) { return styleMap.get(id) || null; },
      getImageByHash(hash) { return hash === 'image-1' ? { async getBytesAsync() { return Uint8Array.from(PNG); } } : null; },
      variables: {
        async getVariableByIdAsync(id) { return variables.get(id) || null; },
        async getLocalVariablesAsync() { return [...variables.values()]; },
        async getVariableCollectionByIdAsync(id) { return collections.get(id) || null; },
        createVariableCollection(name) { const c = { id: `collection-${++seq}`, name, defaultModeId: 'default', modes: [{ modeId: 'default', name: 'Value' }],
          renameMode(id, value) { this.modes.find(m => m.modeId === id).name = value; },
          remove() { if (options.failRollback) throw new Error('synthetic collection remove failure'); collections.delete(this.id); for (const [id, v] of variables) if (v.variableCollectionId === this.id) variables.delete(id); } }; collections.set(c.id, c); return c; },
        createVariable(name, collection, type) { const v = { id: `variable-${++seq}`, name, variableCollectionId: collection.id, resolvedType: type, valuesByMode: {}, scopes: [],
          setVariableCodeSyntax(lang, syntax) { this.codeSyntax = { [lang]: syntax }; }, setValueForMode(mode, value) { this.valuesByMode[mode] = value; } }; variables.set(v.id, v); return v; },
        setBoundVariableForPaint(paint, field, v) { return { ...paint, boundVariables: { [field]: { type: 'VARIABLE_ALIAS', id: v.id } } }; }
      }
    };
    for (const type of ['Paint', 'Text', 'Effect', 'Grid']) figma[`getLocal${type}StylesAsync`] = async () => [...styleMap.values()].filter(s => s.type === type.toUpperCase());
    return { figma, selected, page, nodes, variables, collections, styleMap, calls, messages, node };
  }
  const api = { PNG, blueprint, createMock };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FigmaOfflineFixtures = api;
})(globalThis);
