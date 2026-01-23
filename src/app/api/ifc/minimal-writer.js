/**
 * Minimal IFC STEP writer for IFC4 (no WASM).
 * v1.2 — tessellated geometry (IfcTriangulatedFaceSet)
 * - 22-char GlobalId + OwnerHistory
 * - Adds Body SubContext (MODEL_VIEW)
 * - Elements placed relative to their storey placement
 * - Project → Site → Building → Storey → Elements containment tree
 */

// TriElement: describes a mesh for IFC export
/**
 * @typedef {Object} TriElement
 * @property {string} uuid
 * @property {string=} name
 * @property {string} ifcType
 * @property {Object=} props
 * @property {number[]=} positions
 * @property {number[]=} localPositions
 * @property {number[]=} worldPositions
 * @property {number[]} indices
 * @property {string=} storey
 * @property {number[]=} matrixWorld
 */

const DEFAULT_SCHEMA = 'IFC4';
const DEFAULT_FORMAT = 'tfs';
const IFCHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$';

function makeIfcGuid() {
  const bytes = new Uint8Array(22);
  const webCrypto = (globalThis.crypto);
  if (webCrypto?.getRandomValues) webCrypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = (Math.random() * 256) | 0;
  return Array.from(bytes, (b) => IFCHARS[b & 63]).join('');
}

function makeDetIfcGuid(key) {
  function hash32(str) {
    let h = 0x811c9dc5 | 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }
  let x = hash32(key) || 1;
  const out = new Array(22);
  for (let i = 0; i < 22; i++) {
    x ^= (x << 13); x |= 0; x ^= (x >>> 17); x ^= (x << 5); x |= 0;
    out[i] = IFCHARS[x & 63];
  }
  return out.join('');
}

class Step {
  constructor() {
    this.seq = 1;
    this.rows = [];
  }
  add(type, args) { const id = this.seq++; this.rows.push(`#${id}=${type}(${args});`); return id; }
  toData() { return this.rows.join('\n'); }
}

function buildIFC(projectName, elements) {
  return buildIFCWithOpts(projectName, elements, { schema: DEFAULT_SCHEMA, format: DEFAULT_FORMAT, bakeWorld: true, compat: {} });
}

export function buildIFCWithOpts(projectName, elements, opts) {
  const schema = opts?.schema ?? DEFAULT_SCHEMA;
  let format = opts?.format ?? DEFAULT_FORMAT;
  const bakeWorld = opts?.bakeWorld ?? false;
  const compat = opts?.compat ?? {};
  if (schema === 'IFC2X3') format = 'brep';

  console.log('[IFC] buildIFC() start', { projectName, schema, format, bakeWorld, elementCount: elements?.length ?? 0 });
  const s = new Step();

  // --- Context / Units (WorldCS)
  const p0 = s.add('IFCCARTESIANPOINT', '(0.,0.,0.)');
  const wcs = s.add('IFCAXIS2PLACEMENT3D', `#${p0},$,$`);
  const ctx = s.add('IFCGEOMETRICREPRESENTATIONCONTEXT', `$,'Model',3,1.E-5,#${wcs},$`);

  // SubContext: Body / Model / Reference View (MODEL_VIEW)
  const bodySubCtx = s.add('IFCGEOMETRICREPRESENTATIONSUBCONTEXT', `'Body','Model',#${ctx},$, .MODEL_VIEW.,$`);

  // Units
  const uLen = s.add('IFCSIUNIT', '*,.LENGTHUNIT.,$,.METRE.');
  const uArea = s.add('IFCSIUNIT', '*,.AREAUNIT.,$,.SQUARE_METRE.');
  const uVol = s.add('IFCSIUNIT', '*,.VOLUMEUNIT.,$,.CUBIC_METRE.');
  const uTime = s.add('IFCSIUNIT', '*,.TIMEUNIT.,$,.SECOND.');
  const uMass = s.add('IFCSIUNIT', '*,.MASSUNIT.,$,.GRAM.');
  const uAng = s.add('IFCSIUNIT', '*,.PLANEANGLEUNIT.,$,.RADIAN.');
  const units = s.add('IFCUNITASSIGNMENT', `(#${uLen},#${uArea},#${uVol},#${uTime},#${uMass},#${uAng})`);
  
  // --- OwnerHistory
  const person = s.add('IFCPERSON', `$,$,'Roometry',$,$,$,$,$`);
  const org = s.add('IFCORGANIZATION', `$,'Roometry',$,$,$`);
  const perorg = s.add('IFCPERSONANDORGANIZATION', `#${person},#${org},$`);
  const app = s.add('IFCAPPLICATION', `#${org},'1.0','MinimalIFCWriter','Roometry-IFC'`);
  const owner = s.add('IFCOWNERHISTORY', `#${perorg},#${app},$, .NOCHANGE.,$,$,$,0`);
  
  // --- Project → Site → Building
  const prj = s.add('IFCPROJECT', `'${makeIfcGuid()}',#${owner},'${esc(projectName)}',$,$,$,$,(#${ctx}),#${units}`);
  const siteLoc = s.add('IFCLOCALPLACEMENT', `$,#${wcs}`);
  const site = s.add('IFCSITE', `'${makeIfcGuid()}',#${owner},'Site',$,$,#${siteLoc},$,$,.ELEMENT.,$,$,$,$`);
  const bldgLoc = s.add('IFCLOCALPLACEMENT', `#${siteLoc},#${wcs}`);
  const bldg = s.add('IFCBUILDING', `'${makeIfcGuid()}',#${owner},'Building',$,$,#${bldgLoc},$,$,.ELEMENT.,$,$,$`);
  
  // --- Storeys
  const storeys = new Map();
  const storeyMembers = new Map();
  
  function getStorey(name) {
    if (storeys.has(name)) return storeys.get(name);
    const stLoc = s.add('IFCLOCALPLACEMENT', `#${bldgLoc},#${wcs}`);
    const st = s.add('IFCBUILDINGSTOREY', `'${makeIfcGuid()}',#${owner},'${esc(name)}',$,$,#${stLoc},$,.ELEMENT.,0.`);
    storeys.set(name, { id: st, loc: stLoc });
    storeyMembers.set(st, []);
    console.log('[IFC] Created storey', { name, id: st, loc: stLoc });
    return { id: st, loc: stLoc };
  }
  function pushToStorey(stId, elemId) {
    const arr = storeyMembers.get(stId) ?? [];
    arr.push(elemId);
    storeyMembers.set(stId, arr);
  }
  
  // --- Elements
  for (const el of elements) {
    const stName = getStoreyName(el);
    const { id: stId, loc: stLoc } = getStorey(stName);
    const repCtx = compat.useRootContextForBody ? ctx : bodySubCtx;
    
    // Choose coordinates set
    const worldPos = el.worldPositions ?? el.positions;
    const localPos = el.localPositions ?? el.positions;

    let shapeRep;
    if (format === 'tfs') {
      const coords = (bakeWorld ? worldPos : localPos) ?? [];
      const pts = [];
      for (let i = 0; i < coords.length; i += 3) {
        pts.push(`(${fmt(coords[i])},${fmt(coords[i + 1])},${fmt(coords[i + 2])})`);
      }
      const plist = s.add('IFCCARTESIANPOINTLIST3D', `(${pts.join(',')})`);
      const faces = [];
      for (let i = 0; i < el.indices.length; i += 3) {
        faces.push(`(${el.indices[i] + 1},${el.indices[i + 1] + 1},${el.indices[i + 2] + 1})`);
      }
      const closedFlag = isClosed(el.indices) ? '.T.' : '$';
      const tfs = s.add('IFCTRIANGULATEDFACESET', `#${plist},$,${closedFlag},(${faces.join(',')}),$`);
      shapeRep = s.add('IFCSHAPEREPRESENTATION', `#${repCtx},'Body','Tessellation',(#${tfs})`);
    } else {
      // BREP path
      const coords = (bakeWorld ? worldPos : localPos) ?? [];
      const pointIds = [];
      for (let i = 0; i < coords.length; i += 3) {
        pointIds.push(s.add('IFCCARTESIANPOINT', `(${fmt(coords[i])},${fmt(coords[i + 1])},${fmt(coords[i + 2])})`));
      }
      const faceIds = [];
      for (let i = 0; i < el.indices.length; i += 3) {
        const a = pointIds[el.indices[i]];
        const b = pointIds[el.indices[i + 1]];
        const c = pointIds[el.indices[i + 2]];
        const loop = s.add('IFCPOLYLOOP', `(#${a},#${b},#${c})`);
        const bound = s.add('IFCFACEOUTERBOUND', `#${loop},.T.`);
        const face = s.add('IFCFACE', `(#${bound})`);
        faceIds.push(face);
      }
      const shell = s.add('IFCCLOSEDSHELL', `(${faceIds.map(id => `#${id}`).join(',')})`);
      const brep = s.add('IFCFACETEDBREP', `#${shell}`);
      shapeRep = s.add('IFCSHAPEREPRESENTATION', `#${repCtx},'Body','Brep',(#${brep})`);
    }

    const pds = s.add('IFCPRODUCTDEFINITIONSHAPE', `$,$,(#${shapeRep})`);

    // Placement relative to storey
    let elemLoc;
    if (bakeWorld || !el.matrixWorld) {
      elemLoc = s.add('IFCLOCALPLACEMENT', `#${stLoc},#${wcs}`);
    } else {
      elemLoc = s.add('IFCLOCALPLACEMENT', `#${stLoc},#${axis2FromMatrix(s, el.matrixWorld)}`);
    }

    const ifcType = sanitizeType(el.ifcType);
    const name = esc(el.name || ifcType);
    const elemId = s.add(ifcType.toUpperCase(), `'${makeDetIfcGuid('elem:' + el.uuid)}',#${owner},'${name}',$,$,#${elemLoc},#${pds},$`);
    pushToStorey(stId, elemId);

    // Minimal material assignment per element (by type)
    const matId = s.add('IFCMATERIAL', `'${esc(ifcType)}'`);
    s.add('IFCRELASSOCIATESMATERIAL', `'${makeIfcGuid()}',#${owner},$,$,(#${elemId}),#${matId}`);

    // Properties
    if (el.props && Object.keys(el.props).length) {
      const psetGuid = makeDetIfcGuid('pset:' + el.uuid + ':Pset_RoometryCommon');
      const psetId = writePset(s, owner, 'Pset_RoometryCommon', el.props, psetGuid);
      s.add('IFCRELDEFINESBYPROPERTIES', `'${makeIfcGuid()}',#${owner},$,$,(#${elemId}),#${psetId}`);
    }
  }

  // --- Spatial structure relationships
  s.add('IFCRELAGGREGATES', `'${makeIfcGuid()}',#${owner},$,$,#${prj},(#${site})`);
  s.add('IFCRELAGGREGATES', `'${makeIfcGuid()}',#${owner},$,$,#${site},(#${bldg})`);
  const allStoreys = Array.from(storeys.values()).map(x => x.id);
  if (allStoreys.length) {
    s.add('IFCRELAGGREGATES', `'${makeIfcGuid()}',#${owner},$,$,#${bldg},(${allStoreys.map(i => `#${i}`).join(',')})`);
  }
  for (const [stId, members] of storeyMembers.entries()) {
    if (members.length) {
      s.add('IFCRELCONTAINEDINSPATIALSTRUCTURE', `'${makeIfcGuid()}',#${owner},$,$,(${members.map(i => `#${i}`).join(',')}),#${stId}`);
    }
  }

  // --- HEADER/DATA
  const header = `ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION(('ViewDefinition [Reference View]'),'2;1');\nFILE_NAME('export.ifc','${new Date().toISOString()}',('Roometry'),('Roometry'),'','MinimalIFCWriter','');\nFILE_SCHEMA(('${schema}'));\nENDSEC;\nDATA;\n`;
  const footer = `\nENDSEC;\nEND-ISO-10303-21;`;

  const data = header + s.toData() + footer;
  validateIfc(data);
  console.log('[IFC] buildIFC() done', { bytes: data.length });
  return data;

  // --- helpers
  function fmt(n) { return Number.isFinite(n) ? Number(n.toFixed(6)) : 0; }
  function sanitizeType(t) { return /^Ifc[A-Za-z0-9_]+$/.test(t) ? t : 'IfcBuildingElementProxy'; }
  function esc(sv) { return String(sv).replace(/'/g, "''"); }
  function ifcLit(v) {
    if (typeof v === 'number') return `IFCREAL(${v})`;
    if (typeof v === 'boolean') return v ? '.T.' : '.F.';
    if (v == null) return '$';
    return `'${String(v).replace(/'/g, "''")}'`;
  }
  function writePset(step, ownerId, name, obj, guid) {
    const props = [];
    for (const [k, v] of Object.entries(obj)) {
      const key = esc(k);
      const prop = step.add('IFCPROPERTYSINGLEVALUE', `'${key}',$,${ifcLit(v)},$`);
      props.push(prop);
    }
    return step.add('IFCPROPERTYSET', `'${guid || makeIfcGuid()}',#${ownerId},'${esc(name)}',$,(${props.map(id => `#${id}`).join(',')})`);
  }
  function getStoreyName(el) {
    const p = el.props;
    const s = p?.storey;
    return typeof s === 'string' && s.length ? s : (el.storey || 'Ground');
  }

  function isClosed(indices) {
    if (!indices.length || indices.length % 3 !== 0) return false;
    const edges = new Map();
    const push = (a, b) => {
      const k = a < b ? `${a}-${b}` : `${b}-${a}`;
      edges.set(k, (edges.get(k) || 0) + 1);
    };
    for (let i = 0; i < indices.length; i += 3) {
      const a = indices[i], b = indices[i + 1], c = indices[i + 2];
      push(a, b); push(b, c); push(c, a);
    }
    for (const cnt of edges.values()) if (cnt !== 2) return false;
    return true;
  }

  function axis2FromMatrix(step, m) {
    const tx = m[12], ty = m[13], tz = m[14];
    const X = [m[0], m[1], m[2]];
    const Y = [m[4], m[5], m[6]];
    // swap Y<->Z for IFC
    const loc = step.add('IFCCARTESIANPOINT', `(${fmt(tx)},${fmt(tz)},${fmt(ty)})`);
    const axis = normDir(step, [Y[0], Y[2], Y[1]]);
    const refd = normDir(step, [X[0], X[2], X[1]]);
    return step.add('IFCAXIS2PLACEMENT3D', `#${loc},#${axis},#${refd}`);
  }
  function normDir(step, v) {
    const len = Math.hypot(v[0], v[1], v[2]) || 1;
    return step.add('IFCDIRECTION', `(${fmt(v[0] / len)},${fmt(v[1] / len)},${fmt(v[2] / len)})`);
  }
}

function validateIfc(text) {
  const checks = [
    /FILE_DESCRIPTION\(\(/m,
    /FILE_NAME\('/m,
    /^FILE_SCHEMA\(\('(IFC4|IFC2X3)'\)\);/m,
    /^#\d+=IFCPROJECT\(/m,
    /^#\d+=IFCSHAPEREPRESENTATION\(/m,
    /^#\d+=IFC(\w+)\(/m,
    /END-ISO-10303-21;\s*$/m,
  ];
  for (const rx of checks) {
    if (!rx.test(text)) {
      throw new Error(`IFC validation failed on ${rx}`);
    }
  }
}
