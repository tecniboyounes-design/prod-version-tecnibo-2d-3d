import { normalizeComparisonOp } from "./ConstantDescriptor";
import {
  KeyMapping,
  COMP_CHOICES as COMP_CHOICES_CANON,
  OP_CHOICES,
  OP_HUMAN,
} from '../helpers/ConstantDescriptor';


/** prune + dedupe + normalize BEFORE sending */
function pruneEmptyOps(node) {
  if (!node) return null;

  if (node.type === 'operation') {
    const kids = (node.children || []).map(pruneEmptyOps).filter(Boolean);

    const seen = new Set();
    const deduped = [];
    for (const k of kids) {
      if (k.type === 'comparison') {
        const left = mapLeftForSend(normStr(k.left));
        const op = normCmp(k.operator || '=');
        const right = normStr(k.right);
        const key = `${left}|${op}|${right}`;
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push({ ...k, left, operator: op, right });
      } else if (k.type === 'operation') {
        deduped.push({ ...k, operator: normLogicalOp(k.operator || 'AND') });
      }
    }
    if (deduped.length === 0) return null;
    return { ...node, operator: normLogicalOp(node.operator || 'AND'), children: deduped };
  }

  if (node.type === 'comparison') {
    return {
      ...node,
      left: mapLeftForSend(normStr(node.left)),
      operator: normCmp(node.operator || '='),
      right: normStr(node.right),
    };
  }
  return null;
}

/** sanitize AND also drop conditionId on empty branches */
function sanitiseForest(forest) {
  const next = clone(forest || []);
  for (const t of next) {
    t.tree = (t.tree || []).map(pruneEmptyOps).filter(Boolean);
    if (!t.tree || t.tree.length === 0) {
      if ('conditionId' in t) delete t.conditionId; // strip CID if branch is empty
    }
  }
  return next;
}

/* ----------------------- human-friendly validation ------------------------ */



const pathKey = (treeIndex, path) => `${treeIndex}|${path.join('/')}`;

function humanPath(treeIndex, path, nodeType) {
  const branch = `Branch ${treeIndex + 1}`;
  const level = path.length;
  return nodeType === 'operation'
    ? `${branch} › Group (level ${level})`
    : `${branch} › Condition (level ${level})`;
}

function validateForestHuman(forest) {
  const issues = [];
  const walk = (ti, node, path) => {
    if (!node) return;

    if (node.type === 'operation') {
      const children = node.children || [];
      if (!children.length) {
        issues.push({
          key: pathKey(ti, path),
          severity: 'warning',
          message: `${humanPath(ti, path, 'operation')}: Empty group (will be removed).`,
        });
      } else {
        (children || []).forEach((c, i) => walk(ti, c, [...path, i]));
      }
      return;
    }

    if (node.type === 'comparison') {
      const left = normStr(node.left);
      const opCanon = normCmp(node.operator || '=');
      const right = normStr(node.right);

      if (!left) {
        issues.push({
          key: pathKey(ti, path),
          field: 'left',
          severity: 'error',
          message: `${humanPath(ti, path, 'comparison')}: Missing LEFT value.`,
        });
      }
      if (!COMP_CHOICES_CANON.includes(opCanon)) {
        issues.push({
          key: pathKey(ti, path),
          field: 'operator',
          severity: 'error',
          message: `${humanPath(ti, path, 'comparison')}: Unknown operator "${node.operator ?? ''}".`,
        });
      }
      if (!right) {
        const pretty = OP_HUMAN[opCanon] ?? opCanon;
        issues.push({
          key: pathKey(ti, path),
          field: 'right',
          severity: 'error',
          message: `${humanPath(ti, path, 'comparison')}: "${pretty}" requires a RIGHT value.`,
        });
      }
    }
  };

  (forest || []).forEach((t, ti) =>
    (t.tree || []).forEach((n, i) => walk(ti, n, [i]))
  );
  return issues;
}


export const makeId = (treeIndex, pathArr) => `${treeIndex}|${pathArr.join('/')}`;
export const clone = (obj) => JSON.parse(JSON.stringify(obj));

export const normStr = (v) => (typeof v === 'string' ? v.trim() : v ?? '');
const normLogicalOp = (v) => {
  const s = String(v || '').trim().toUpperCase();
  return ['AND', 'OR', 'NOT AND', 'NOT OR'].includes(s) ? s : 'AND';
};
export const normCmp = (v) => normalizeComparisonOp(String(v || '=')); 
const mapLeftForSend = (left) => KeyMapping[left] ?? left;





export { sanitiseForest, validateForestHuman };