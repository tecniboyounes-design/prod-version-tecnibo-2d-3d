// components/ArticleManager.jsx
"use client";
import { useState, useEffect } from "react";
import {
  getAllArticles,
  addArticle,
  cloneArticle as cloneArticleApi,
  deleteArticle as deleteArticleApi,
} from "../lib/articlesFsClient";

const ConfArticleManager = ({ activeArticleId, onArticleChange }) => {
  const [articles, setArticles] = useState([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newArticleName, setNewArticleName] = useState("");
  const [showCloneForm, setShowCloneForm] = useState(null);
  const [cloneName, setCloneName] = useState("");

  // Load articles on mount
  useEffect(() => {
    (async () => {
      try {
        const { items } = await getAllArticles();
        setArticles(items || []);
      } catch (e) {
        console.error("Error loading articles:", e);
        setArticles([]);
      }
    })();
  }, []);

  const handleAddArticle = async () => {
    if (!newArticleName.trim()) return;

    if (articles.some((a) => a.name.toLowerCase() === newArticleName.toLowerCase())) {
      alert("Article name already exists!");
      return;
    }

    try {
      const { item } = await addArticle(newArticleName.trim());
      setArticles((prev) => [...prev, item]);
      onArticleChange(item.id);
      setNewArticleName("");
      setShowAddForm(false);
    } catch (e) {
      console.error("Add article failed:", e);
      alert("Failed to create article");
    }
  };

  const handleCloneArticle = async (articleId) => {
    if (!cloneName.trim()) return;

    if (articles.some((a) => a.name.toLowerCase() === cloneName.toLowerCase())) {
      alert("Article name already exists!");
      return;
    }

    try {
      const { item } = await cloneArticleApi(articleId, cloneName.trim());
      setArticles((prev) => [...prev, item]);
      onArticleChange(item.id);
      setCloneName("");
      setShowCloneForm(null);
    } catch (e) {
      console.error("Clone failed:", e);
      alert("Failed to clone article");
    }
  };

  const handleDeleteArticle = async (articleId) => {
    const article = articles.find((a) => a.id === articleId);
    if (!window.confirm(`Delete "${article?.name}"? This cannot be undone.`)) return;

    try {
      await deleteArticleApi(articleId);
      const remaining = articles.filter((a) => a.id !== articleId);
      setArticles(remaining);
      if (activeArticleId === articleId) {
        onArticleChange(remaining.length > 0 ? remaining[0].id : "default");
      }
    } catch (e) {
      console.error("Delete failed:", e);
      alert("Failed to delete article");
    }
  };
  
  return (
    <div className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <h3 className="sidebar-title">{!isCollapsed && "Articles"}</h3>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="sidebar-toggle"
        >
          {isCollapsed ? "→" : "←"}
        </button>
      </div>

      {!isCollapsed && (
        <>
          {/* Add Article Button */}
          <div className="sidebar-section">
            {!showAddForm ? (
              <button
                onClick={() => setShowAddForm(true)}
                className="sidebar-btn sidebar-btn-primary"
              >
                + Add Article
              </button>
            ) : (
              <div className="sidebar-form">
                <input
                  type="text"
                  value={newArticleName}
                  onChange={(e) => setNewArticleName(e.target.value)}
                  placeholder="Article name..."
                  className="sidebar-input"
                  autoFocus
                />
                <div className="sidebar-form-actions">
                  <button
                    onClick={handleAddArticle}
                    className="sidebar-btn sidebar-btn-success"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setNewArticleName("");
                    }}
                    className="sidebar-btn sidebar-btn-cancel"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Default Form */}
          <div className="sidebar-section">
            <div
              className={`sidebar-item ${activeArticleId === "default" ? "active" : ""}`}
              onClick={() => onArticleChange("default")}
            >
              <span className="sidebar-item-name">Default Form</span>
            </div>
          </div>

          {/* Articles List */}
          <div className="sidebar-section">
            <div className="sidebar-section-title">
              Custom Articles ({articles.length})
            </div>
            {articles.map((article) => (
              <div key={article.id} className="sidebar-item-wrapper">
                {showCloneForm === article.id ? (
                  <div className="sidebar-form">
                    <input
                      type="text"
                      value={cloneName}
                      onChange={(e) => setCloneName(e.target.value)}
                      placeholder="Clone name..."
                      className="sidebar-input"
                      autoFocus
                    />
                    <div className="sidebar-form-actions">
                      <button
                        onClick={() => handleCloneArticle(article.id)}
                        className="sidebar-btn sidebar-btn-success"
                      >
                        Clone
                      </button>
                      <button
                        onClick={() => {
                          setShowCloneForm(null);
                          setCloneName("");
                        }}
                        className="sidebar-btn sidebar-btn-cancel"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`sidebar-item ${
                      activeArticleId === article.id ? "active" : ""
                    }`}
                  >
                    <span
                      className="sidebar-item-name"
                      onClick={() => onArticleChange(article.id)}
                    >
                      {article.name}
                    </span>
                    <div className="sidebar-item-actions">
                      <button
                        onClick={() => {
                          setShowCloneForm(article.id);
                          setCloneName(`${article.name} Copy`);
                        }}
                        className="sidebar-action-btn"
                        title="Clone"
                      >
                        ⎘
                      </button>
                      <button
                        onClick={() => handleDeleteArticle(article.id)}
                        className="sidebar-action-btn delete"
                        title="Delete"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ConfArticleManager;
