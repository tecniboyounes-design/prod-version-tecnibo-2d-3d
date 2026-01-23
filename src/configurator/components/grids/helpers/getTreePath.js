export function getTreePath(row, allRows) {
  const path = [];
  let current = row;

  while (current) {
    path.unshift(String(current.id));
    current = allRows.find(r => String(r.id) === String(current.parentId));
  }

  return path;
}