import { useState, useEffect } from "react";

export default function ArticleManager({ onArticleAdd = () => {} }) {
  const [articles, setArticles] = useState([]);
  const [newArticle, setNewArticle] = useState({ name: "", fields: [] });

  useEffect(() => {
    const saved = localStorage.getItem("articles");
    if (saved) setArticles(JSON.parse(saved));
  }, []);
  
  const saveArticles = (updatedArticles) => {
    setArticles(updatedArticles);
    localStorage.setItem("articles", JSON.stringify(updatedArticles));
  };
   
  const addArticle = () => {
    if (!newArticle.name) return;
    const updated = [...articles, { ...newArticle, id: Date.now() }];
    saveArticles(updated);
    onArticleAdd?.(newArticle);
    setNewArticle({ name: "", fields: [] });
  };

  return (
    <div className="article-manager">
      <h3>Article Manager</h3>
      <div className="add-article">
        <input
          placeholder="Article Name"
          value={newArticle.name}
          onChange={(e) =>
            setNewArticle({ ...newArticle, name: e.target.value })
          }
        />
        <button onClick={addArticle}>Add Article</button>
      </div>
      <div className="articles-list">
        {articles.map((article) => (
          <div key={article.id} className="article-item">
            {article.name} ({article.fields.length} fields)
          </div>
        ))}
      </div>
    </div>
  );
}



//// bhakjbkja