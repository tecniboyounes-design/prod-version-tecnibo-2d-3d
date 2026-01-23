import { clone } from "./validationHelper";

export function updateNodeAtPath(data, treeIndex, path, updater) {
    const next = clone(data);
    let cursor = next[treeIndex].tree; // array at current level
    for (let i = 0; i < path.length - 1; i++) {
        const parent = cursor[path[i]];
        if (!parent || parent.type !== 'operation') return data; // invalid path
        if (!parent.children) parent.children = [];
        cursor = parent.children;
    }
    const idx = path[path.length - 1];
    if (cursor[idx] == null) return data;
    cursor[idx] = updater(cursor[idx]);
    return next;
}

export function removeNodeAtPath(data, treeIndex, path) {
    const next = clone(data);
    // deleting a root node in tree array
    if (path.length === 1) {
        next[treeIndex].tree.splice(path[0], 1);
        return next;
    }
    let cursor = next[treeIndex].tree;
    for (let i = 0; i < path.length - 1; i++) {
        const parent = cursor[path[i]];
        if (!parent || parent.type !== 'operation') return data;
        if (!parent.children) parent.children = [];
        cursor = parent.children;
    }
    const idx = path[path.length - 1];
    cursor.splice(idx, 1);
    return next;
}

export  function addChildToOperation(data, treeIndex, path, childNode) {
    const next = clone(data);
    let cursor = next[treeIndex].tree;
    for (let i = 0; i < path.length; i++) {
        const node = cursor[path[i]];
        if (!node || node.type !== 'operation') return data;
        if (i === path.length - 1) {
            if (!node.children) node.children = [];
            node.children.unshift(childNode); // 
            return next;
        }
        if (!node.children) node.children = [];
        cursor = node.children;
    }
    return data;
}

export const opLabel = (op) => {
    const upper = String(op || 'AND').toUpperCase();
    if (upper === 'AND') return 'AND';
    if (upper === 'OR') return 'OR';
    if (upper === 'NOT AND') return 'NOT AND';
    if (upper === 'NOT OR') return 'NOT OR';
    return upper;
};


export const OP_CHOICES = ['AND', 'OR', 'NOT AND', 'NOT OR'];
