/* 标准 Figma Plugin API；未使用官方 MCP、REST、WebSocket 或 use_figma 扩展 API。 */
(function (root) {
  'use strict';
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- 同一文件同时支持 Node 测试和无模块加载器的 Figma sandbox。
  const C = typeof module === 'object' && module.exports ? require('./core.cjs') : root.FigmaOffline;
  function createRuntime(figma, now = () => new Date().toISOString()) {
    let busy = false, staged = null, sequence = 0;
    const emit = message => figma.ui.postMessage(message);
    const pick = (o, names) => {
      const out = {};
      for (const name of names) { const v = o[name]; if (v !== undefined && typeof v !== 'symbol' && typeof v !== 'function') out[name] = C.jsonClone(v); }
      return out;
    };
    function budget(roots) {
      let count = 0; const stack = roots.map(n => [n, 0]);
      while (stack.length) {
        const [n, depth] = stack.pop();
        C.assert(++count <= C.LIMITS.nodes && depth <= C.LIMITS.depth, 'Selection exceeds node/depth budget; select fewer frames');
        if ('children' in n) for (const child of n.children) stack.push([child, depth + 1]);
      }
    }
    async function exportSelection(options = {}) {
      C.assert(options && typeof options === 'object' && Object.keys(options).every(k => ['includeAllLocalTokens', 'includeImages', 'includePreviews'].includes(k)), 'Invalid export options');
      for (const v of Object.values(options)) C.assert(typeof v === 'boolean', 'Invalid export flag');
      const page = figma.currentPage, roots = C.rootsOnly(Array.from(page.selection));
      C.assert(roots.length > 0, 'Select one or more frames/components first'); budget(roots);
      const warnings = [], nodes = [], styles = [], assets = [], variables = [], collections = [];
      const warn = (code, message) => warnings.push({ code, message });
      const checkPage = () => C.assert(figma.currentPage.id === page.id, 'Page changed during export; export again');
      for (const n of roots) {
        checkPage(); C.assert(!n.removed && typeof n.exportAsync === 'function', 'Selected node no longer available');
        const raw = C.jsonClone(await n.exportAsync({ format: 'JSON_REST_V1' }));
        const document = C.documents(raw, n.id);
        // 原始 REST 响应保留，不声称重建或无损 round-trip。
        nodes.push({ rootId: n.id, document, rest: raw });
      }
      const reference = C.refs(nodes.map(n => n.document));
      const localStyles = new Map();
      if (options.includeAllLocalTokens) {
        for (const getter of ['getLocalPaintStylesAsync', 'getLocalTextStylesAsync', 'getLocalEffectStylesAsync', 'getLocalGridStylesAsync']) {
          const found = await figma[getter]();
          for (const s of found) { localStyles.set(s.id, s); reference.styleIds.add(s.id); }
        }
      }
      C.assert(reference.styleIds.size <= C.LIMITS.styles, 'Style budget exceeded');
      for (const id of reference.styleIds) {
        let style;
        try { style = localStyles.get(id) || await figma.getStyleByIdAsync(id); }
        catch { warn('STYLE_UNAVAILABLE', id); continue; }
        if (!style) { warn('STYLE_UNAVAILABLE', id); continue; }
        try {
          const fields = ['id', 'key', 'name', 'type', 'description', 'remote'];
          if (style.type === 'PAINT') fields.push('paints');
          if (style.type === 'TEXT') fields.push('fontName', 'fontSize', 'letterSpacing', 'lineHeight', 'paragraphIndent', 'paragraphSpacing', 'textCase', 'textDecoration', 'boundVariables');
          if (style.type === 'EFFECT') fields.push('effects');
          if (style.type === 'GRID') fields.push('layoutGrids');
          styles.push(pick(style, fields));
        } catch { warn('STYLE_SERIALIZATION_FAILED', id); }
      }
      const styleRefs = C.refs(styles);
      for (const id of styleRefs.variableIds) reference.variableIds.add(id);
      for (const hash of styleRefs.imageHashes) reference.imageHashes.add(hash);
      const localVars = new Map();
      if (options.includeAllLocalTokens) for (const v of await figma.variables.getLocalVariablesAsync()) { localVars.set(v.id, v); reference.variableIds.add(v.id); }
      const queue = [...reference.variableIds], seen = new Set(), collectionIds = new Set();
      for (let i = 0; i < queue.length; i++) {
        const id = queue[i]; if (seen.has(id)) continue; seen.add(id);
        C.assert(seen.size <= C.LIMITS.variables, 'Variable dependency budget exceeded');
        let v;
        try { v = localVars.get(id) || await figma.variables.getVariableByIdAsync(id); }
        catch { warn('VARIABLE_UNAVAILABLE', id); continue; }
        if (!v) { warn('VARIABLE_UNAVAILABLE', id); continue; }
        const item = pick(v, ['id', 'key', 'name', 'description', 'remote', 'resolvedType', 'variableCollectionId', 'valuesByMode', 'scopes', 'codeSyntax', 'hiddenFromPublishing']);
        variables.push(item); collectionIds.add(v.variableCollectionId);
        for (const alias of C.refs([item.valuesByMode]).variableIds) if (!seen.has(alias)) queue.push(alias);
      }
      for (const id of collectionIds) {
        try {
          const c = await figma.variables.getVariableCollectionByIdAsync(id);
          if (c) collections.push(pick(c, ['id', 'key', 'name', 'remote', 'modes', 'defaultModeId', 'hiddenFromPublishing']));
          else warn('COLLECTION_UNAVAILABLE', id);
        } catch { warn('COLLECTION_UNAVAILABLE', id); }
      }
      let totalBytes = 0;
      const addAsset = (bytes, meta) => {
        C.assert(bytes instanceof Uint8Array && bytes.length > 0, 'Asset export did not return bytes');
        C.assert(bytes.length <= C.LIMITS.assetBytes && totalBytes + bytes.length <= C.LIMITS.totalAssetBytes && assets.length < C.LIMITS.assets, 'Asset budget exceeded; export fewer frames or omit images/previews');
        totalBytes += bytes.length;
        assets.push({ id: `asset-${String(assets.length + 1).padStart(4, '0')}`, ...meta, base64: C.encode64(bytes) });
      };
      if (options.includeImages) for (const hash of reference.imageHashes) {
        let bytes;
        try { const image = figma.getImageByHash(hash); if (image) bytes = await image.getBytesAsync(); }
        catch { warn('IMAGE_UNAVAILABLE', hash); continue; }
        if (!bytes) { warn('IMAGE_UNAVAILABLE', hash); continue; }
        addAsset(bytes, { kind: 'image', imageHash: hash });
      }
      if (options.includePreviews) for (const n of roots) {
        checkPage();
        const size = Math.max(n.width || 1, n.height || 1);
        C.assert(Number.isFinite(size) && size > 0, 'Invalid preview dimensions');
        let bytes;
        try { bytes = await n.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: Math.min(1, 1600 / size) }, contentsOnly: true, colorProfile: 'SRGB' }); }
        catch { warn('PREVIEW_UNAVAILABLE', n.id); continue; }
        addAsset(bytes, { kind: 'preview', nodeId: n.id });
      }
      checkPage();
      warn('SNAPSHOT_NOT_ATOMIC', 'Do not edit the document during export; Plugin API reads do not provide an atomic document revision.');
      warn('READ_ONLY_REFERENCE', 'This export is not a .fig backup, a full library export, or approval to redistribute third-party assets.');
      const bundle = { format: C.FORMAT, source: { fileName: figma.root.name, pageId: page.id, pageName: page.name, exportedAt: now() },
        scope: { nodes: 'selection', tokens: options.includeAllLocalTokens ? 'all-local-and-referenced' : 'referenced' },
        rights: { licenseReview: 'pending', redistributionApproved: false }, nodes, variables: { items: variables, collections }, styles, assets, warnings };
      const summary = C.validateBundle(bundle);
      C.assert(JSON.stringify(bundle).length <= C.LIMITS.jsonBytes / 3, 'Export is too large for the portable JSON budget; select fewer nodes/assets');
      return { bundle, summary };
    }
    function stageBlueprint(input) {
      staged = null;
      C.validateBlueprint(input);
      C.assert(JSON.stringify(input).length <= 1024 * 1024 / 3, 'Blueprint exceeds portable JSON budget');
      const plan = C.jsonClone(input), summary = C.validateBlueprint(plan);
      const pageId = figma.currentPage.id, stageId = `stage-${++sequence}`;
      staged = { plan, summary, pageId, stageId };
      return { stageId, summary, target: figma.root.name, action: 'Create new page and variables only; never replace existing content.' };
    }
    async function importBlueprint(stageId, confirmed) {
      C.assert(confirmed === true && staged && staged.stageId === stageId, 'A current preview and explicit confirmation are required');
      const draft = staged; staged = null;
      C.validateBlueprint(draft.plan);
      const plan = draft.plan, ownerKey = 'svadmin-offline-blueprint-id';
      C.assert(figma.currentPage.id === draft.pageId, 'Page changed since preview; stage again');
      C.assert(!figma.root.children.some(p => p.getPluginData(ownerKey) === plan.id), 'Blueprint already imported; use a new ID for a deliberate separate copy');
      // 字体预检在第一次画布写操作前完成；没有静默字体替换。
      await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
      C.assert(figma.currentPage.id === draft.pageId, 'Page changed during font loading; stage again');
      const previous = figma.currentPage, nodeIds = [], variableIds = [], componentMap = new Map(), variableMap = new Map();
      let page, collection;
      try {
        page = figma.createPage(); nodeIds.push(page.id); page.name = plan.title; page.setPluginData(ownerKey, plan.id);
        await figma.setCurrentPageAsync(page);
        C.assert(figma.currentPage.id === page.id, 'Page changed during import setup');
        collection = figma.variables.createVariableCollection(`svadmin offline / ${plan.id}`);
        collection.renameMode(collection.defaultModeId, 'Value');
        for (const [name, t] of Object.entries(plan.tokens)) {
          const variable = figma.variables.createVariable(name, collection, t.type);
          variableIds.push(variable.id); variableMap.set(name, variable);
          variable.scopes = t.scopes.slice(); variable.setVariableCodeSyntax('WEB', t.css);
        }
        for (const [name, t] of Object.entries(plan.tokens)) variableMap.get(name).setValueForMode(collection.defaultModeId,
          t.alias === undefined ? t.value : { type: 'VARIABLE_ALIAS', id: variableMap.get(t.alias).id });
        function scalar(name) { let t = plan.tokens[name]; while (t.alias !== undefined) t = plan.tokens[t.alias]; return t.value; }
        function paint(name) {
          const color = scalar(name), p = { type: 'SOLID', color: { r: color.r, g: color.g, b: color.b }, opacity: color.a === undefined ? 1 : color.a };
          return figma.variables.setBoundVariableForPaint(p, 'color', variableMap.get(name));
        }
        function build(spec, parent) {
          let n;
          if (spec.kind === 'INSTANCE') n = componentMap.get(spec.component).createInstance();
          else if (spec.kind === 'TEXT') n = figma.createText();
          else if (spec.kind === 'COMPONENT') n = figma.createComponent();
          else n = figma.createFrame();
          nodeIds.push(n.id); parent.appendChild(n); n.name = spec.name;
          if (spec.kind === 'INSTANCE') { for (const child of n.findAll()) nodeIds.push(child.id); return n; }
          if (spec.kind === 'TEXT') {
            n.fontName = { family: 'Inter', style: 'Regular' }; n.fontSize = scalar(spec.fontSize);
            n.characters = spec.text; n.resize(spec.width, Math.max(1, n.height)); n.textAutoResize = 'HEIGHT';
            n.setBoundVariable('fontSize', variableMap.get(spec.fontSize)); n.fills = [paint(spec.fill)]; return n;
          }
          n.layoutMode = spec.layout; n.resize(spec.width, 1); n.primaryAxisSizingMode = spec.layout === 'VERTICAL' ? 'AUTO' : 'FIXED'; n.counterAxisSizingMode = spec.layout === 'VERTICAL' ? 'FIXED' : 'AUTO'; n.clipsContent = false;
          n.fills = [paint(spec.fill)]; if (spec.stroke) n.strokes = [paint(spec.stroke)];
          for (const field of ['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom']) { n[field] = scalar(spec.padding); n.setBoundVariable(field, variableMap.get(spec.padding)); }
          n.itemSpacing = scalar(spec.gap); n.setBoundVariable('itemSpacing', variableMap.get(spec.gap));
          n.cornerRadius = scalar(spec.radius); n.setBoundVariable('cornerRadius', variableMap.get(spec.radius));
          for (const child of spec.children) build(child, n);
          if (spec.kind === 'COMPONENT') componentMap.set(spec.key, n);
          return n;
        }
        let x = 100;
        for (const spec of plan.nodes) { const n = build(spec, page); n.x = x; n.y = 100; x += Math.max(n.width, 20) + 80; }
        figma.viewport.scrollAndZoomIntoView(page.children);
        return { createdPageId: page.id, createdNodeIds: [...new Set(nodeIds)], createdCollectionIds: [collection.id], createdVariableIds: variableIds, blueprintId: plan.id };
      } catch (error) {
        const failed = [];
        try { await figma.setCurrentPageAsync(previous); } catch { failed.push('restore-current-page'); }
        // 只清理本次新建资源，不按名称删除已有内容。
        try { if (page && !page.removed) page.remove(); } catch { failed.push(`page:${page.id}`); }
        try { if (collection) collection.remove(); } catch { failed.push(`collection:${collection.id}`); }
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`${message}. ${failed.length ? `Rollback incomplete: ${failed.join(', ')}` : 'Created resources rolled back.'}`, { cause: error });
      }
    }
    async function handle(message) {
      const requestId = message && message.requestId;
      if (typeof requestId !== 'string' || !/^[a-z0-9-]{1,80}$/.test(requestId)) return;
      if (busy) { emit({ type: 'error', requestId, message: 'Another operation is in progress' }); return; }
      busy = true;
      try {
        if (message.type === 'export') {
          staged = null; emit({ type: 'exported', requestId, ...await exportSelection(message.options) });
        } else if (message.type === 'stage') emit({ type: 'staged', requestId, ...stageBlueprint(message.blueprint) });
        else if (message.type === 'confirm') emit({ type: 'imported', requestId, result: await importBlueprint(message.stageId, message.confirmed) });
        else if (message.type === 'cancel') { staged = null; emit({ type: 'cancelled', requestId }); }
        else throw new Error('Unsupported operation');
      } catch (error) { staged = null; emit({ type: 'error', requestId, message: error instanceof Error ? error.message : String(error) }); }
      finally { busy = false; }
    }
    return { exportSelection, stageBlueprint, importBlueprint, handle };
  }
  if (typeof module === 'object' && module.exports) module.exports = { createRuntime };
  else root.FigmaOfflineRuntime = { createRuntime };
})(globalThis);
