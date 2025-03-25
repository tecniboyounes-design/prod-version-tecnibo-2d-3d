"use client"

import React, { useState, useEffect } from 'react';

function CatalogComponent() {
  const [catalogData, setCatalogData] = useState(null); // Entire catalog structure
  const [topCategories, setTopCategories] = useState([]); // Top-level categories
  const [selectedCategory, setSelectedCategory] = useState(null); // Currently selected category
  const [products, setProducts] = useState([]); // Products from selected category
  const [isLoading, setIsLoading] = useState(false);

  // Simulate random price (replace with your actual pricing logic if needed)
  const getRandomPrice = () => Math.floor(Math.random() * 100) + 1;

  // Fetch the entire catalog on component mount
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          "http://localhost:3000/api/catalog?category=np_partition_conn&fetchAll=true"
        );
        const data = await response.json();
        
        // Store the full catalog structure
        setCatalogData(data);
        
        // Extract and set top-level categories
        if (data.category) {
          setTopCategories(data.category);
          // Set the first category as default
          if (data.category.length > 0) {
            setSelectedCategory(data.category[0]);
          }
        }
      } catch (error) {
        console.error("Error fetching catalog:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCatalog();
  }, []);

  // Function to recursively extract products from a category and its subcategories
  const getProductsFromCategory = (category) => {
    let products = [];
    
    // Transform products if the category has an "object" array
    if (category.object) {
      products = category.object.map((apiProduct) => ({
        id: apiProduct.$.name,
        name: apiProduct.$.label,
        description: apiProduct.$.info,
        price: getRandomPrice(),
        image: `/QUINCAILLERIES/${apiProduct.$.image}`
      }));
    }
    
    // Recursively extract products from subcategories
    if (category.category) {
      category.category.forEach((subCat) => {
        products = products.concat(getProductsFromCategory(subCat));
      });
    }
    
    return products;
  };

  // Update products when the selected category changes
  useEffect(() => {
    if (selectedCategory) {
      const categoryProducts = getProductsFromCategory(selectedCategory);
      setProducts(categoryProducts);
    }
  }, [selectedCategory]);

  return (
    <div className="container mx-auto p-4">
      {/* Top-level categories navigation */}
      <h2 className="text-2xl font-bold mb-4">Top-Level Categories</h2>
      <div className="flex flex-wrap gap-2 mb-6">
        {topCategories.map((category) => (
          <button
            key={category.$.name}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded ${
              selectedCategory?.$.name === category.$.name
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700'
            } hover:bg-blue-600 hover:text-white transition`}
          >
            {category.$.label || category.$.name}
          </button>
        ))}
      </div>

      {/* Loading state or product display */}
      {isLoading ? (
        <p className="text-center text-gray-500">Loading...</p>
      ) : (
        selectedCategory && (
          <div>
            <h2 className="text-xl font-semibold mb-4">
              Products in {selectedCategory.$.label || selectedCategory.$.name}
            </h2>
            {products.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <div key={product.id} className="border p-4 rounded shadow">
                    <h3 className="text-lg font-medium">{product.name}</h3>
                    <p className="text-sm text-gray-600">{product.description}</p>
                    <p className="text-green-600 font-bold">Price: ${product.price}</p>
                    <img
                      src={product.image}
                      alt={product.name}
                      className="mt-2 w-full h-48 object-cover rounded"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500">No products found in this category.</p>
            )}
          </div>
        )
      )}
    </div>
  );
}

export default CatalogComponent;