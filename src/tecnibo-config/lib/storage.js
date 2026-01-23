// lib/storage.js
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function getArticles() {
  try {
    const filePath = path.join(DATA_DIR, "articles.json");
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf8");
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error("Error reading articles:", error);
    return [];
  }
}

export function getDataSources() {
  try {
    const filePath = path.join(DATA_DIR, "dataSources.json");
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf8");
      return JSON.parse(data);
    }
    return {};
  } catch (error) {
    console.error("Error reading data sources:", error);
    return {};
  }
}

export function getArticleConfig(articleId) {
  try {
    const filePath = path.join(DATA_DIR, `config-${articleId}.json`);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf8");
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error("Error reading config:", error);
    return null;
  }
}

// Add save functions
export function saveArticles(articles) {
  try {
    const filePath = path.join(DATA_DIR, "articles.json");
    fs.writeFileSync(filePath, JSON.stringify(articles, null, 2));
    return true;
  } catch (error) {
    console.error("Error saving articles:", error);
    return false;
  }
}

export function saveDataSources(dataSources) {
  try {
    const filePath = path.join(DATA_DIR, "dataSources.json");
    fs.writeFileSync(filePath, JSON.stringify(dataSources, null, 2));
    return true;
  } catch (error) {
    console.error("Error saving data sources:", error);
    return false;
  }
}

export function saveArticleConfig(articleId, config) {
  try {
    const filePath = path.join(DATA_DIR, `config-${articleId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error("Error saving config:", error);
    return false;
  }
}
