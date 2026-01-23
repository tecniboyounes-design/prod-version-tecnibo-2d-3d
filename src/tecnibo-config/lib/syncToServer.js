// lib/syncToServer.js
export async function syncDataToServer() {
  try {
    // Get all localStorage data
    const articles = JSON.parse(
      localStorage.getItem("simple-articles") || "[]"
    );
    const dataSources = JSON.parse(
      localStorage.getItem("formBuilder-dataSources") || "{}"
    );

    // Sync articles and data sources
    await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articles, dataSources }),
    });

    // Sync each article's configuration
    for (const article of articles) {
      const config = JSON.parse(
        localStorage.getItem(`formBuilder-catalog-${article.id}`) || "null"
      );
      if (config) {
        await fetch("/api/sync/config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ articleId: article.id, config }),
        });
      }
    }

    console.log("Data synced to server successfully");
  } catch (error) {
    console.error("Sync failed:", error);
  }
}
