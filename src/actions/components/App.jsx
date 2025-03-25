"use client";
import React, { useState, useEffect } from "react";
import ProductList from "./ProductList";
import Cart from "./Cart";
import { v4 as uuidv4 } from "uuid";
import { Search, X, Loader2 } from "lucide-react";
import "./App.css";

const App = () => {
    const [cartItems, setCartItems] = useState([]);
    const [topCategories, setTopCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoadingCategories, setIsLoadingCategories] = useState(true);
    const [isLoadingProducts, setIsLoadingProducts] = useState(true);
    const getRandomPrice = () => Math.floor(Math.random() * (100 - 10 + 1)) + 10;
    
    // Recursive helper to extract products from a category tree
    const getProductsFromCategory = (category) => {
        let prods = [];
        if (category.object) {
            prods = Array.isArray(category.object)
                ? category.object.map((apiProduct) => ({
                    id: uuidv4(),
                    name: apiProduct.$.name,
                    description: apiProduct.$.label,
                    price: getRandomPrice(),
                    image: `/QUINCAILLERIES/${apiProduct.$.image}`,
                }))
                : [
                    {
                        id: uuidv4(),
                        name: category.object.$.name,
                        description: category.object.$.label,
                        price: getRandomPrice(),
                        image: `/QUINCAILLERIES/${category.object.$.image}`,
                    },
                ];
        }
        if (category.category) {
            category.category.forEach((subCat) => {
                prods = prods.concat(getProductsFromCategory(subCat));
            });
        }
        return prods;
    };

    // Effect 1: Fetch top-level categories
    useEffect(() => {
        const fetchTopCategories = async () => {
            try {
                setIsLoadingCategories(true);
                const response = await fetch(
                    "api/catalog?category=np_partition_conn&fetchAll=false"
                );
                const data = await response.json();
                let categoriesArray = Array.isArray(data)
                    ? data
                    : data.category
                        ? Array.isArray(data.category)
                            ? data.category.filter((item) => item.category)
                            : []
                        : [];
                setTopCategories(categoriesArray);
                if (categoriesArray.length > 0) {
                    setSelectedCategory(categoriesArray[0]);
                }
            } catch (error) {
                console.error("Error fetching top categories:", error);
            } finally {
                setIsLoadingCategories(false);
            }
        };
        fetchTopCategories();
    }, []);

    // Effect 2: Fetch products when selectedCategory changes
    useEffect(() => {
        const fetchProducts = async () => {
            if (!selectedCategory) return;
            try {
                setIsLoadingProducts(true);
                const endpoint = `/api/catalog?category=${selectedCategory.$.name}&fetchAll=true`;
                const response = await fetch(endpoint);
                const data = await response.json();
                const categoryProducts = getProductsFromCategory(data);
                setProducts(categoryProducts);
                setFilteredProducts(categoryProducts); // Initialize filtered products
            } catch (error) {
                console.error("Error fetching products:", error);
            } finally {
                setIsLoadingProducts(false);
            }
        };
        fetchProducts();
    }, [selectedCategory]);

    // Effect 3: Filter products by name
    useEffect(() => {
        const filtered = products.filter((product) =>
            product.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredProducts(filtered);
        console.log("filtered Products Array:", filtered);
    }, [searchQuery, products]);

    const handleCategoryClick = (category) => {
        setSelectedCategory(category);
        setSearchQuery("");
    };

    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
    };

    const handleClearSearch = () => {
        setSearchQuery("");
    };

    // Cart management functions
    const addToCart = (product) => {
        setCartItems((prev) => {
            const exists = prev.find((item) => item.id === product.id);
            if (exists) {
                return prev.map((item) =>
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    const updateQuantity = (id, amount) => {
        setCartItems((prev) =>
            prev
                .map((item) =>
                    item.id === id
                        ? { ...item, quantity: Math.max(item.quantity + amount, 1) }
                        : item
                )
                .filter((item) => item.quantity > 0)
        );
    };

    const removeFromCart = (id) => {
        setCartItems((prev) => prev.filter((item) => item.id !== id));
    };


    const handlePlaceOrder = async (cartItems, projectId) => {
        console.log("Order is clicked");

        // Prepare the payload dynamically from cartItems
        const payload = {
            items: cartItems.map(item => ({
                id: item.product_id || 930956,
                quantity: item.quantity || 1,
                price: item.price || 15.99,
                name: item.name || "Default Product",
                product_template_id: item.product_template_id || 922973
            })),
            orderName: `Order_${new Date().toISOString()}`,
            userData: {
                uid: 447,
                user_companies: {
                    current_company: 11
                }
            },
            projectId: projectId || "proj_12345"
        };

        try {
            const response = await axios.post("http://localhost:3000/api/orders", payload, {
                headers: {
                    "Content-Type": "application/json"
                }
            });
            console.log("Order created successfully:", response.data);
        } catch (error) {
            console.error("Error creating order:", error.response?.data || error.message);
        }
    };



    return (
        <div className="flex flex-col md:flex-row w-full min-h-screen bg-gray-50 px-4 md:px-8 py-6 gap-6">
            {/* Left Section: Categories and Products */}
            <div className="w-full md:w-1/2">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                        <span>🛍️</span> Product Catalog
                    </h1>
                </div>

                {/* Search Bar */}
                <div className="relative mb-6">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search products by name..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                        className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    />
                    {searchQuery && (
                        <button
                            onClick={handleClearSearch}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    )}
                </div>





                {/* Category Buttons */}
                <div>
                    {isLoadingCategories ? (
                        <div className="flex items-center gap-2 text-gray-500">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Loading categories...
                        </div>
                    ) : (
                        topCategories.length > 0 && (
                            <div className="flex overflow-x-auto gap-2 mb-4 py-2 scrollbar-hidden">
                                {topCategories.map((category, index) => {
                                    // Check if category.$ exists, otherwise skip rendering this button
                                    if (!category.$) {
                                        console.warn(`Category at index ${index} has no $ property`, category);
                                        return null;
                                    }
                                    return (
                                        <button
                                            key={category.$.name}
                                            onClick={() => handleCategoryClick(category)}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${selectedCategory?.$.name === category.$.name
                                                ? "bg-blue-600 text-white shadow-md"
                                                : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:text-blue-600 hover:border-blue-300 hover:shadow-sm"
                                                }`}
                                        >
                                            {category.$.label || category.$.name}
                                        </button>
                                    );
                                })}
                            </div>
                        )
                    )}
                </div>






                {/* Product List */}
                {isLoadingProducts ? (
                    <div className="flex items-center gap-2 text-gray-500">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Loading products...
                    </div>
                ) : filteredProducts.length > 0 ? (
                    <ProductList products={filteredProducts} onAddToCart={addToCart} />
                ) : (
                    <p className="text-gray-500">No products found.</p>
                )}
            </div>

            {/* Right Section: Cart */}
            <div className="w-full md:w-1/2">




                <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4 relative">
                        Shopping Cart{" "}
                        <span className="text-gray-500">({cartItems.length} Items)</span>
                        <button
                            className="absolute right-0 top-1/2 -translate-y-1/2 mr-4 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                            onClick={handlePlaceOrder}
                        >
                            Place Order
                        </button>
                    </h2>
                    <Cart
                        items={cartItems}
                        onRemove={removeFromCart}
                        onUpdateQuantity={updateQuantity}
                    />
                </div>




            </div>
        </div>
    );
};

export default App;