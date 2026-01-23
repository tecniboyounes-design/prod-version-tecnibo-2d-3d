export async function saveArticleCatalog(articleId, fullCatalogJson) {
  const res = await fetch(`/api/articlesFs/${articleId}/save`, {   // ⟵ use articlesFs
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fullCatalogJson),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Save failed");
  return data.versionId;
}



//// copy ## done