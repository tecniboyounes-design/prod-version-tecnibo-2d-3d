// src/compatibility/helpers/ConstantDescriptor.js

// (Optional) forward map if you need it elsewhere
export const operationMap = {
  0: 'AND',
  1: 'NOT AND',
  2: 'OR',
  3: 'NOT OR',
};

// (Optional) reverse map (label -> numeric code)
export const OP_CODE_BY_LABEL = Object.fromEntries(
  Object.entries(operationMap).map(([code, label]) => [label.toUpperCase(), Number(code)])
);

// IMOS key mapping (UI label -> backend field)
export const KeyMapping = {
  'Zusatzfilter 1': 'master_type',
  'Zusatzfilter 2': 'slave_type',
  'Zusatzfilter 3': 'angle_deg',
  'Zusatzfilter 4': 'l1_min_dist_ep_mm',

  // Wall type drives frame family
  'Zusatzfilter 5': 'wall_type',

  // Linked variants (doors)
  'Zusatzfilter 6': 'lock_side_link',
  'Zusatzfilter 7': 'hinges_side_link',
  'Zusatzfilter 8': 'lock_type_link',
};

// Canonical comparison tokens your DB expects
export const COMP_CHOICES = ['=', '<>', '<', '<=', '>', '>=', 'B', '!B', 'E', '!E', 'C', '!C'];
export const OP_CHOICES = ['AND', 'OR', 'NOT AND', 'NOT OR'];


// Normalize incoming operator variants to canonical tokens above
export function normalizeComparisonOp(op) {
  const s = String(op || '').trim().toUpperCase();
  if (s === '&LT;' || s === 'LT' || s === 'L') return '<';
  if (s === '&GT;' || s === 'GT' || s === 'G') return '>';
  if (s === '&LT;=') return '<=';
  if (s === '&GT;=') return '>=';
  if (s === 'NE' || s === '!=') return '<>';
  // If it's already canonical, keep it; otherwise return original (so UI shows what user typed)
  return COMP_CHOICES.includes(s) ? s : op;
}



export const OP_HUMAN = {
  '=': 'equals',
  '<>': 'does not equal',
  '<': 'is less than',
  '<=': 'is less than or equal',
  '>': 'is greater than',
  '>=': 'is greater than or equal',
  B: 'begins with',
  '!B': 'does not begin with',
  E: 'ends with',
  '!E': 'does not end with',
  C: 'contains',
  '!C': 'does not contain',
};


