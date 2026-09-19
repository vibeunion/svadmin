/* 浏览器、Figma sandbox 与 Node 共享；不执行导入数据中的代码。 */
(function (root) {
  'use strict';
  const FORMAT = 'svadmin/figma-export-v1';
  const BLUEPRINT = 'svadmin/figma-blueprint-v1';
  const LIMITS = Object.freeze({ jsonBytes: 40 * 1024 * 1024, assetBytes: 8 * 1024 * 1024,
    totalAssetBytes: 24 * 1024 * 1024, roots: 20, nodes: 5000, depth: 64,
    variables: 2000, styles: 1000, assets: 40, blueprintNodes: 200, blueprintTokens: 100 });
  function assert(ok, message) { if (!ok) throw new Error(message); }
  function object(v, label) { assert(v !== null && typeof v === 'object' && !Array.isArray(v), `${label}: expected object`); return v; }
  function text(v, label, max = 256) { assert(typeof v === 'string' && v.length > 0 && v.length <= max, `${label}: invalid string`); return v; }
  function list(v, label, max) { assert(Array.isArray(v) && v.length <= max, `${label}: invalid array or limit exceeded`); return v; }
  function number(v, label, min, max) { assert(typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max, `${label}: invalid number`); return v; }
  function keys(v, allowed, label) { object(v, label); for (const k of Object.keys(v)) assert(allowed.includes(k), `${label}: unexpected key ${k}`); }
  function walk(value, visit) {
    const stack = [[value, 0]]; let count = 0;
    while (stack.length) {
      const [v, depth] = stack.pop();
      assert(depth <= LIMITS.depth + 16 && ++count <= 250000, 'JSON structure budget exceeded');
      if (v === null || typeof v !== 'object') { if (typeof v === 'number') assert(Number.isFinite(v), 'non-finite JSON number'); continue; }
      visit(v);
      for (const [k, child] of Object.entries(v)) {
        assert(!['__proto__', 'prototype', 'constructor'].includes(k), 'Unsafe object key');
        if (child && typeof child === 'object') stack.push([child, depth + 1]);
      }
    }
  }
  function jsonClone(v) { walk(v, () => {}); return JSON.parse(JSON.stringify(v)); }
  function rootsOnly(selection) {
    list(selection, 'selection', LIMITS.roots);
    const ids = new Set(selection.map(n => n.id));
    return selection.filter(n => { let p = n.parent; while (p && p.type !== 'DOCUMENT') { if (ids.has(p.id)) return false; p = p.parent; } return true; });
  }
  function documents(response, rootId) {
    object(response, 'REST export');
    if (response.document) return object(response.document, 'document');
    const entry = response.nodes && response.nodes[rootId];
    assert(entry && entry.document, 'Unsupported JSON_REST_V1 response shape');
    return object(entry.document, 'document');
  }
  function refs(values) {
    const variableIds = new Set(), styleIds = new Set(), imageHashes = new Set();
    for (const value of values) walk(value, v => {
      if (v.type === 'VARIABLE_ALIAS' && typeof v.id === 'string') variableIds.add(v.id);
      if (v.styles && typeof v.styles === 'object') for (const id of Object.values(v.styles)) if (typeof id === 'string') styleIds.add(id);
      for (const k of ['imageRef', 'imageHash']) if (typeof v[k] === 'string') imageHashes.add(v[k]);
    });
    return { variableIds, styleIds, imageHashes };
  }
  function encode64(bytes) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'; let out = '';
    for (let i = 0; i < bytes.length; i += 3) {
      const a = bytes[i], b = bytes[i + 1], c = bytes[i + 2], v = (a << 16) | ((b || 0) << 8) | (c || 0);
      out += chars[(v >>> 18) & 63] + chars[(v >>> 12) & 63] + (b === undefined ? '=' : chars[(v >>> 6) & 63]) + (c === undefined ? '=' : chars[v & 63]);
    }
    return out;
  }
  function base64Bytes(v) {
    assert(typeof v === 'string' && v.length <= Math.ceil(LIMITS.assetBytes / 3) * 4 && v.length % 4 === 0 && /^[A-Za-z0-9+/]*={0,2}$/.test(v), 'Invalid or oversized base64');
    return v.length / 4 * 3 - (v.endsWith('==') ? 2 : v.endsWith('=') ? 1 : 0);
  }
  function validateBundle(bundle) {
    object(bundle, 'bundle'); walk(bundle, () => {});
    keys(bundle, ['format', 'source', 'scope', 'rights', 'nodes', 'variables', 'styles', 'assets', 'warnings'], 'bundle');
    assert(bundle.format === FORMAT, 'Unsupported export format');
    object(bundle.source, 'source'); text(bundle.source.fileName, 'fileName', 1024); text(bundle.source.pageId, 'pageId'); text(bundle.source.pageName, 'pageName', 1024);
    assert(typeof bundle.source.exportedAt === 'string' && Number.isFinite(Date.parse(bundle.source.exportedAt)), 'Invalid export time');
    object(bundle.scope, 'scope'); assert(bundle.scope.nodes === 'selection', 'Only explicit selection exports are supported');
    assert(['referenced', 'all-local-and-referenced'].includes(bundle.scope.tokens), 'Invalid token scope');
    assert(bundle.rights && bundle.rights.licenseReview === 'pending' && bundle.rights.redistributionApproved === false, 'Export cannot grant redistribution rights');
    const roots = list(bundle.nodes, 'nodes', LIMITS.roots); assert(roots.length, 'Empty export');
    const ids = new Set(); let nodeCount = 0;
    for (const entry of roots) {
      object(entry, 'node entry'); text(entry.rootId, 'rootId');
      assert(entry.document && entry.document.id === entry.rootId, 'Root ID mismatch');
      const stack = [[entry.document, 0]];
      while (stack.length) {
        const [n, depth] = stack.pop(); object(n, 'node'); text(n.id, 'node.id'); text(n.type, 'node.type');
        assert(depth <= LIMITS.depth && ++nodeCount <= LIMITS.nodes, 'Node budget exceeded');
        assert(!ids.has(n.id), 'Duplicate node ID'); ids.add(n.id);
        if (n.children !== undefined) for (const c of list(n.children, 'children', LIMITS.nodes)) stack.push([c, depth + 1]);
      }
    }
    object(bundle.variables, 'variables');
    const variables = list(bundle.variables.items, 'variables.items', LIMITS.variables), collections = list(bundle.variables.collections, 'collections', LIMITS.variables);
    const varIds = new Set(), collectionIds = new Set();
    for (const c of collections) { text(c.id, 'collection.id'); assert(!collectionIds.has(c.id), 'Duplicate collection ID'); collectionIds.add(c.id); list(c.modes, 'modes', 40); }
    for (const v of variables) { text(v.id, 'variable.id'); text(v.name, 'variable.name', 1024); assert(!varIds.has(v.id), 'Duplicate variable ID'); varIds.add(v.id); text(v.variableCollectionId, 'variableCollectionId'); object(v.valuesByMode, 'valuesByMode'); }
    const styles = list(bundle.styles, 'styles', LIMITS.styles), styleIds = new Set();
    for (const s of styles) { text(s.id, 'style.id'); assert(!styleIds.has(s.id), 'Duplicate style ID'); styleIds.add(s.id); text(s.type, 'style.type'); }
    let assetBytes = 0; const assetIds = new Set();
    for (const asset of list(bundle.assets, 'assets', LIMITS.assets)) {
      keys(asset, ['id', 'kind', 'nodeId', 'imageHash', 'base64'], 'asset'); text(asset.id, 'asset.id');
      assert(!assetIds.has(asset.id), 'Duplicate asset ID'); assetIds.add(asset.id);
      assert(['image', 'preview'].includes(asset.kind), 'Invalid asset kind');
      if (asset.kind === 'preview') assert(ids.has(asset.nodeId), 'Unknown preview node');
      if (asset.imageHash !== undefined) text(asset.imageHash, 'imageHash');
      assetBytes += base64Bytes(asset.base64); assert(assetBytes <= LIMITS.totalAssetBytes, 'Total asset budget exceeded');
    }
    for (const w of list(bundle.warnings, 'warnings', 5000)) { object(w, 'warning'); text(w.code, 'warning.code'); text(w.message, 'warning.message', 2048); }
    return { nodes: nodeCount, roots: roots.length, variables: variables.length, collections: collections.length, styles: styles.length, assets: bundle.assets.length, assetBytes };
  }
  function diagnostics(bundle) {
    validateBundle(bundle);
    const result = bundle.warnings.map(w => ({ ...w }));
    const vars = new Map(bundle.variables.items.map(v => [v.id, v]));
    const cols = new Map(bundle.variables.collections.map(c => [c.id, c]));
    const ref = refs(bundle.nodes.map(n => n.document).concat(bundle.styles));
    const componentIds = new Set();
    for (const entry of bundle.nodes) walk(entry.document, n => { if (n.type === 'COMPONENT') componentIds.add(n.id); });
    for (const entry of bundle.nodes) walk(entry.document, n => {
      if (n.type === 'INSTANCE' && typeof n.componentId === 'string' && !componentIds.has(n.componentId))
        result.push({ code: 'COMPONENT_DEFINITION_NOT_EXPORTED', message: `${n.id} -> ${n.componentId}` });
    });
    const styles = new Set(bundle.styles.map(s => s.id)), images = new Set(bundle.assets.filter(a => a.kind === 'image').map(a => a.imageHash));
    for (const id of ref.variableIds) if (!vars.has(id)) result.push({ code: 'MISSING_VARIABLE', message: id });
    for (const id of ref.styleIds) if (!styles.has(id)) result.push({ code: 'MISSING_STYLE', message: id });
    for (const id of ref.imageHashes) if (!images.has(id)) result.push({ code: 'MISSING_IMAGE', message: id });
    // 跨集合别名以目标集合默认模式解析；不猜测与源集合模式名称的对应关系。
    for (const v of vars.values()) {
      const col = cols.get(v.variableCollectionId);
      if (!col) result.push({ code: 'MISSING_COLLECTION', message: v.variableCollectionId });
      else for (const m of col.modes) if (!(m.modeId in v.valuesByMode)) result.push({ code: 'MISSING_MODE_VALUE', message: `${v.id}/${m.modeId}` });
      for (const [mode, value] of Object.entries(v.valuesByMode)) {
        let next = value, active = new Set([`${v.id}/${mode}`]), steps = 0;
        while (next && next.type === 'VARIABLE_ALIAS') {
          const target = vars.get(next.id);
          if (!target) { result.push({ code: 'MISSING_ALIAS', message: next.id }); break; }
          if (target.resolvedType !== v.resolvedType) { result.push({ code: 'ALIAS_TYPE_MISMATCH', message: `${v.id} -> ${target.id}` }); break; }
          const targetCol = cols.get(target.variableCollectionId);
          const targetMode = target.variableCollectionId === v.variableCollectionId ? mode : targetCol && targetCol.defaultModeId;
          const key = `${target.id}/${targetMode}`;
          if (active.has(key) || ++steps > LIMITS.variables) { result.push({ code: 'ALIAS_CYCLE', message: key }); break; }
          active.add(key); next = target.valuesByMode[targetMode];
          if (next === undefined) { result.push({ code: 'MISSING_ALIAS_MODE', message: key }); break; }
        }
      }
    }
    return Array.from(new Map(result.map(w => [JSON.stringify(w), w])).values());
  }
  const TOKEN_SCOPES = {
    COLOR: ['FRAME_FILL', 'SHAPE_FILL', 'TEXT_FILL', 'STROKE_COLOR'],
    FLOAT: ['GAP', 'CORNER_RADIUS', 'FONT_SIZE']
  };
  function validateBlueprint(input) {
    object(input, 'blueprint'); walk(input, () => {});
    keys(input, ['format', 'id', 'title', 'ownership', 'tokens', 'nodes'], 'blueprint');
    assert(input.format === BLUEPRINT && input.ownership === 'self-authored', 'Only self-authored blueprints may be staged; exports are read-only');
    text(input.id, 'blueprint.id'); assert(/^[a-z0-9][a-z0-9._-]{0,79}$/.test(input.id), 'Invalid blueprint ID'); text(input.title, 'title', 120);
    const tokens = object(input.tokens, 'tokens'), names = Object.keys(tokens); assert(names.length > 0 && names.length <= LIMITS.blueprintTokens, 'Token count exceeded');
    for (const name of names) {
      assert(/^[a-zA-Z][a-zA-Z0-9/_-]{0,99}$/.test(name), 'Invalid token name');
      const t = tokens[name]; keys(t, ['type', 'value', 'alias', 'css', 'scopes'], `token ${name}`);
      assert(['COLOR', 'FLOAT'].includes(t.type), 'Only COLOR/FLOAT tokens are supported');
      assert(typeof t.css === 'string' && /^var\(--[a-z][a-z0-9-]*\)$/.test(t.css), 'Token needs an explicit CSS variable mapping');
      assert(Array.isArray(t.scopes) && t.scopes.every(s => TOKEN_SCOPES[t.type].includes(s)) && new Set(t.scopes).size === t.scopes.length, 'Invalid token scopes');
      assert((t.value !== undefined) !== (t.alias !== undefined), 'Token requires value XOR alias');
      if (t.alias !== undefined) { text(t.alias, 'alias'); assert(Object.prototype.hasOwnProperty.call(tokens, t.alias) && tokens[t.alias].type === t.type, 'Missing or mismatched alias'); }
      else if (t.type === 'FLOAT') number(t.value, 'float token', 0, 4096);
      else { keys(t.value, ['r', 'g', 'b', 'a'], 'color'); for (const ch of ['r', 'g', 'b']) number(t.value[ch], 'color channel', 0, 1); if (t.value.a !== undefined) number(t.value.a, 'alpha', 0, 1); }
    }
    function token(name, type, scope) { text(name, 'binding'); assert(Object.prototype.hasOwnProperty.call(tokens, name) && tokens[name].type === type && tokens[name].scopes.includes(scope), `Invalid ${scope} binding: ${name}`); }
    function resolve(name) { const seen = new Set(); let t = tokens[name]; while (t.alias !== undefined) { assert(!seen.has(t.alias), 'Alias cycle'); seen.add(t.alias); t = tokens[t.alias]; } return t.value; }
    names.forEach(resolve);
    let count = 0; const ids = new Set(), components = new Set();
    function node(n, depth) {
      keys(n, ['key', 'kind', 'name', 'layout', 'width', 'fill', 'stroke', 'gap', 'padding', 'radius', 'text', 'fontSize', 'children', 'component'], 'blueprint node');
      text(n.key, 'node key', 100); assert(!ids.has(n.key), 'Duplicate blueprint key'); ids.add(n.key);
      text(n.name, 'node name', 120); assert(++count <= LIMITS.blueprintNodes && depth <= 12, 'Blueprint node/depth budget exceeded');
      assert(['FRAME', 'COMPONENT', 'TEXT', 'INSTANCE'].includes(n.kind), 'Unsupported blueprint node type');
      if (n.kind === 'INSTANCE') {
        assert(components.has(n.component), 'Instance must reference an earlier top-level component');
        assert(Object.keys(n).every(k => ['key', 'kind', 'name', 'component'].includes(k)), 'Instance overrides are not supported'); return;
      }
      if (n.kind === 'TEXT') {
        assert(Object.keys(n).every(k => ['key', 'kind', 'name', 'text', 'width', 'fill', 'fontSize'].includes(k)), 'Invalid text properties');
        text(n.text, 'text', 10000); number(n.width, 'text width', 20, 1920); token(n.fill, 'COLOR', 'TEXT_FILL'); token(n.fontSize, 'FLOAT', 'FONT_SIZE');
        number(resolve(n.fontSize), 'font size', 8, 72); return;
      }
      assert(n.text === undefined && n.fontSize === undefined && n.component === undefined, 'Invalid container properties');
      assert(['VERTICAL', 'HORIZONTAL'].includes(n.layout), 'Only auto-layout containers are supported');
      number(n.width, 'width', 20, 1920); token(n.fill, 'COLOR', 'FRAME_FILL'); token(n.gap, 'FLOAT', 'GAP'); token(n.padding, 'FLOAT', 'GAP'); token(n.radius, 'FLOAT', 'CORNER_RADIUS');
      for (const prop of ['gap', 'padding', 'radius']) number(resolve(n[prop]), prop, 0, 128);
      assert(resolve(n.padding) * 2 < n.width, 'Padding exceeds container width');
      if (n.stroke) token(n.stroke, 'COLOR', 'STROKE_COLOR');
      if (n.kind === 'COMPONENT') assert(depth === 0, 'Components must be top-level');
      for (const child of list(n.children, 'blueprint children', LIMITS.blueprintNodes)) node(child, depth + 1);
      if (n.kind === 'COMPONENT') components.add(n.key);
    }
    assert(list(input.nodes, 'blueprint roots', 20).length > 0, 'Empty blueprint'); input.nodes.forEach(n => node(n, 0));
    return { id: input.id, title: input.title, nodes: count, tokens: names.length, components: components.size, font: 'Inter Regular', modeCount: 1 };
  }
  const api = { FORMAT, BLUEPRINT, LIMITS, assert, text, list, walk, jsonClone, rootsOnly, documents, refs, encode64, base64Bytes, validateBundle, diagnostics, validateBlueprint };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FigmaOffline = api;
})(globalThis);
