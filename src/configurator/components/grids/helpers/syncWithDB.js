function normalizeId(id) {
  return id.startsWith("field-") ? id.replace("field-", "") : id;
}

export async function syncWithDB({ row, changes }) {
  const cleanId = normalizeId(row.id);

  const payload = {
    id: cleanId,
    parentId: row.parentId,
    kind: row.kind,
    changes,
  };
  
  try {
    const res = await fetch("/api/save-cell", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
   
    if (!res.ok) throw new Error(`API save failed: ${res.statusText}`);

    console.log(`✅ Synced row ${cleanId} with backend. Payload:`, payload);
    return true;
  } catch (err) {
    console.error(`❌ Failed to sync row ${cleanId}:`, err);
    return false;
  }
}





